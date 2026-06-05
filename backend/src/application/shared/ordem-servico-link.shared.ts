import { resolveFrontendBaseUrl } from './frontend-link.shared';

export function buildOrdemServicoDeepLink(input: {
  frontendBaseUrl: string;
  ordemId: string;
}): string | null {
  const base = input.frontendBaseUrl.trim().replace(/\/+$/, '');
  if (!base) return null;
  return `${base}/workspace/ordens/${input.ordemId}`;
}

export function resolveOrdemServicoEmailLink(input: {
  frontendNgrokBaseUrl?: string | null;
  frontendPublicBaseUrl?: string | null;
  ordemId: string;
}): string | null {
  const frontendBaseUrl = resolveFrontendBaseUrl({
    frontendNgrokBaseUrl: input.frontendNgrokBaseUrl,
    frontendPublicBaseUrl: input.frontendPublicBaseUrl,
  });
  if (!frontendBaseUrl) return null;
  return buildOrdemServicoDeepLink({
    frontendBaseUrl,
    ordemId: input.ordemId,
  });
}
