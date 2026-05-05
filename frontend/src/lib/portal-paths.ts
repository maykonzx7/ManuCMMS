function normalizePortalPath(value: string | undefined, fallback: string) {
  const raw = value?.trim() || fallback;
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return normalized.replace(/\/+$/, '') || fallback;
}

export function getAccessPortalPath() {
  return normalizePortalPath(
    import.meta.env.VITE_ACCESS_PORTAL_PATH,
    '/workspace/acesso',
  );
}

export function getPlatformPortalPath() {
  return normalizePortalPath(
    import.meta.env.VITE_PLATFORM_PORTAL_PATH,
    '/workspace/plataforma',
  );
}

export function getInvitePortalPath() {
  return normalizePortalPath(
    import.meta.env.VITE_INVITE_PORTAL_PATH,
    '/workspace/convite',
  );
}
