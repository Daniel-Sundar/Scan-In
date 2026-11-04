/** Single source of truth for route access. Edge-safe (no Node imports). */
export type Role = 'admin' | 'teacher';

export const PUBLIC_PATHS = [
  '/', '/login', '/contact', '/privacy', '/terms', '/cookies', '/data-deletion',
  '/forbidden', '/session-expired',
];

const startsWithSeg = (p: string, base: string) => p === base || p.startsWith(base + '/');

export const isPublic = (p: string) => PUBLIC_PATHS.includes(p) || startsWithSeg(p, '/auth');
export const isAdminPath = (p: string) => startsWithSeg(p, '/admin') || startsWithSeg(p, '/api/admin');
/** Paths that only work inside a live, owned allocation window. */
export const isScanPath = (p: string) => startsWithSeg(p, '/scan') || startsWithSeg(p, '/api/scan');
export const isApiPath = (p: string) => startsWithSeg(p, '/api');
