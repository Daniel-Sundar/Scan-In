import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createMockClient, isLocalMode } from './mock';

/** Per-request Supabase client for Server Components / Actions / Route Handlers.
 *  Uses the ANON key + the user's JWT, so every query is subject to RLS. */
type CookieList = { name: string; value: string; options: CookieOptions }[];

export async function createClient() {
  if (isLocalMode()) return (await createMockClient(false)) as unknown as ReturnType<typeof createServerClient>;
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: CookieList) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* called from a Server Component: middleware refreshes the session */
          }
        },
      },
    },
  );
}

/** Service-role client. Bypasses RLS: server-only, never import from client code. */
export async function createAdminClient() {
  if (isLocalMode()) return (await createMockClient(true)) as unknown as import('@supabase/supabase-js').SupabaseClient;
  const { createClient: create } = await import('@supabase/supabase-js');
  return create(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
