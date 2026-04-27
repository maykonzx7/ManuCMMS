export function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const baseUrl = configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : '/api';
  return baseUrl.replace(/\/$/, '');
}

export async function apiFetch(path: string, accessToken?: string, signal?: AbortSignal) {
  return fetch(`${resolveApiBaseUrl()}${path}`, {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
    signal,
  });
}
