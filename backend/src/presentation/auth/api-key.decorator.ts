import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY_ROUTE = 'isApiKeyRoute';

/** Rotas autenticadas por x-api-key (sem JWT). */
export const ApiKeyRoute = () => SetMetadata(IS_API_KEY_ROUTE, true);
