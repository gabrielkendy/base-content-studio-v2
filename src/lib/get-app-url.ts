/**
 * Returns the correct URL for a user based on role and environment.
 * In production (NEXT_PUBLIC_BASE_DOMAIN set), returns full subdomain URLs.
 * In dev (localhost), returns path-based URLs.
 */
export function getAppUrl(role: string, isSystemAdmin: boolean): string {
  const baseDomain =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_DOMAIN : undefined

  if (isSystemAdmin) {
    return baseDomain ? `https://admin.${baseDomain}` : '/admin'
  }
  if (role === 'cliente') {
    return baseDomain ? `https://cliente.${baseDomain}` : '/portal'
  }
  // Admin/gestor/designer → team dashboard
  return baseDomain ? `https://app.${baseDomain}/clientes` : '/clientes'
}

/**
 * Returns the path portion only (no domain), for use when
 * the user may be on a non-custom domain (e.g. Vercel preview URL).
 */
export function getAppPath(role: string, isSystemAdmin: boolean): string {
  if (isSystemAdmin) return '/admin'
  if (role === 'cliente') return '/portal'
  return '/clientes'
}
