import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminPath, isApiPath, isPublic, isScanPath, type Role } from '@/lib/auth/policy';

function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== 'production';
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const wss = supabase.replace(/^http/, 'ws');
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind/Framer inline styles
    `img-src 'self' data: blob:`,
    `media-src 'self' data: blob:`, // scan beep
    `font-src 'self'`,
    `connect-src 'self' ${supabase} ${wss}`,
    `worker-src 'self' blob:`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    ...(dev || process.env.ENFORCE_HTTPS === 'false' ? [] : [`upgrade-insecure-requests`]),
  ].join('; ');
}

type CookieList = { name: string; value: string; options: CookieOptions }[];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Force HTTPS in production (behind a proxy/CDN).
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENFORCE_HTTPS !== 'false' && // set to 'false' ONLY for local `next start`
    request.headers.get('x-forwarded-proto') === 'http'
  ) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  // 2. Per-request CSP nonce.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-nonce', nonce);
  reqHeaders.set('content-security-policy', csp);

  let response = NextResponse.next({ request: { headers: reqHeaders } });
  const stamp = (r: NextResponse) => {
    r.headers.set('Content-Security-Policy', csp);
    return r;
  };
  /** Carry refreshed auth cookies onto any redirect/rewrite we return. */
  const withCookies = (r: NextResponse) => {
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return stamp(r);
  };

  // 3. CORS: this app serves its own origin only. Reject cross-origin API calls.
  if (isApiPath(pathname)) {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return stamp(NextResponse.json({ error: 'cors_denied' }, { status: 403 }));
    }
  }

  // LOCAL_MODE: cookie-only auth, no Supabase.
  if (process.env.LOCAL_MODE === 'true') {
    if (isPublic(pathname)) return stamp(response);
    const email = request.cookies.get('local_user')?.value;
    const deny = (url: URL) => stamp(NextResponse.redirect(url));
    if (!email) {
      const url = request.nextUrl.clone();
      url.pathname = '/login'; url.search = `?reason=login_required&next=${encodeURIComponent(pathname + search)}`;
      return isApiPath(pathname) ? stamp(NextResponse.json({ error: 'login_required' }, { status: 401 })) : deny(url);
    }
    const role: Role = email.toLowerCase().startsWith('admin') ? 'admin' : 'teacher';
    if ((isAdminPath(pathname) && role !== 'admin') || (isScanPath(pathname) && role !== 'teacher')) {
      return isApiPath(pathname) ? stamp(NextResponse.json({ error: 'forbidden' }, { status: 403 })) : stamp(NextResponse.rewrite(new URL('/forbidden?reason=wrong_role', request.url), { status: 403 }));
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return stamp(response);
  }

  // 4. Session: getUser() re-validates the JWT with Supabase Auth (never trust getSession()).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieList) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: reqHeaders } });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  if (isPublic(pathname)) {
    await supabase.auth.getUser(); // keep the session fresh; result not needed
    return stamp(response);
  }

  const deny = (status: 401 | 403, code: string) => {
    if (isApiPath(pathname)) return withCookies(NextResponse.json({ error: code }, { status }));
    if (status === 401) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?reason=${code}&next=${encodeURIComponent(pathname + search)}`;
      return withCookies(NextResponse.redirect(url));
    }
    const url = request.nextUrl.clone();
    url.pathname = '/forbidden';
    url.search = `?reason=${code}`;
    return withCookies(NextResponse.rewrite(url, { status: 403 }));
  };

  // 5. Authentication.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const hadCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
    return deny(401, hadCookie ? 'session_expired' : 'login_required');
  }

  // 6. Role + active flag, read through RLS (a user can only read their own row).
  const { data: profile } = await supabase
    .from('users')
    .select('role,is_active')
    .eq('id', user.id)
    .single<{ role: Role; is_active: boolean }>();

  if (!profile || !profile.is_active) return deny(403, 'account_disabled');

  // 7. Admin routes: network-level lock.
  if (isAdminPath(pathname) && profile.role !== 'admin') return deny(403, 'admin_only');

  // 8. Scan routes: teacher must hold a LIVE allocation right now.
  //    RLS on `allocations` only returns rows inside the time window, so an
  //    expired window yields zero rows -> access ends the second ends_at passes.
  if (isScanPath(pathname)) {
    if (profile.role !== 'teacher') return deny(403, 'teacher_only');
    const { count } = await supabase
      .from('allocations')
      .select('id', { count: 'exact', head: true });
    if (!count) return deny(403, 'no_active_allocation');
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return stamp(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|mp3|woff2)$).*)'],
};
