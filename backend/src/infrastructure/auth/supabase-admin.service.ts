import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SupabaseAdminUser = {
  id: string;
  email?: string;
};

type SupabasePasswordSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

@Injectable()
export class SupabaseAdminService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceRole());
  }

  async findUserByEmail(email: string): Promise<SupabaseAdminUser | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const filterCandidates = [normalized, `email.eq.${normalized}`];
    for (const filter of filterCandidates) {
      const user = await this.listUsersByFilter(filter, normalized);
      if (user) {
        return user;
      }
    }

    return this.findUserByEmailPaginated(normalized);
  }

  async provisionConfirmedUser(input: {
    email: string;
    password: string;
    nome: string;
  }): Promise<string> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(email);

    if (existing?.id) {
      const response = await this.adminFetch(`/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          password: input.password,
          email_confirm: true,
          user_metadata: { full_name: input.nome },
        }),
      });
      if (!response.ok) {
        throw new Error(await this.readErrorMessage(response));
      }
      return existing.id;
    }

    const response = await this.adminFetch('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.nome },
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      id?: string;
      user?: { id?: string };
    } | null;

    if (!response.ok) {
      throw new Error(await this.readErrorMessage(response, payload));
    }

    const userId = payload?.id ?? payload?.user?.id;
    if (!userId) {
      throw new Error('Supabase nao retornou o identificador do usuario criado.');
    }

    return userId;
  }

  async createPasswordSession(input: {
    email: string;
    password: string;
  }): Promise<SupabasePasswordSession> {
    const baseUrl = this.baseUrl();
    const anonKey = this.anonKey();
    if (!baseUrl || !anonKey) {
      throw new Error(
        'SUPABASE_ANON_KEY nao configurada no servidor para concluir login do convite.',
      );
    }

    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const attempts = [0, 350];

    let lastError = 'Falha ao autenticar usuario apos ativar convite.';

    for (const delayMs of attempts) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15_000),
      });

      const payload = (await response.json().catch(() => null)) as
        | (SupabasePasswordSession & {
            error_description?: string;
            msg?: string;
            message?: string;
          })
        | null;

      if (response.ok && payload?.access_token && payload.refresh_token) {
        return {
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
          expires_in: payload.expires_in ?? 3600,
          token_type: payload.token_type ?? 'bearer',
        };
      }

      lastError =
        payload?.error_description ??
        payload?.msg ??
        payload?.message ??
        `Supabase auth respondeu ${response.status}.`;
    }

    throw new Error(lastError);
  }

  private async listUsersByFilter(
    filter: string,
    normalizedEmail: string,
  ): Promise<SupabaseAdminUser | null> {
    const response = await this.adminFetch(
      `/auth/v1/admin/users?per_page=50&page=1&filter=${encodeURIComponent(filter)}`,
      { method: 'GET' },
    );
    const payload = (await response.json().catch(() => null)) as {
      users?: SupabaseAdminUser[];
    } | null;

    if (!response.ok) {
      return null;
    }

    return (
      payload?.users?.find(
        (user) => user.email?.trim().toLowerCase() === normalizedEmail,
      ) ?? null
    );
  }

  private async findUserByEmailPaginated(
    normalizedEmail: string,
  ): Promise<SupabaseAdminUser | null> {
    for (let page = 1; page <= 10; page += 1) {
      const response = await this.adminFetch(
        `/auth/v1/admin/users?per_page=200&page=${page}`,
        { method: 'GET' },
      );
      const payload = (await response.json().catch(() => null)) as {
        users?: SupabaseAdminUser[];
      } | null;

      if (!response.ok) {
        const message = await this.readErrorMessage(response, payload);
        throw new Error(message);
      }

      const match = payload?.users?.find(
        (user) => user.email?.trim().toLowerCase() === normalizedEmail,
      );
      if (match?.id) {
        return match;
      }

      if (!payload?.users?.length || payload.users.length < 200) {
        break;
      }
    }

    return null;
  }

  private baseUrl() {
    return this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
  }

  private serviceRole() {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  }

  private anonKey() {
    return this.config.get<string>('SUPABASE_ANON_KEY')?.trim();
  }

  private adminFetch(path: string, init: RequestInit) {
    const baseUrl = this.baseUrl();
    const serviceRole = this.serviceRole();
    if (!baseUrl || !serviceRole) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor para ativar convites.',
      );
    }

    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
  }

  private async readErrorMessage(
    response: Response,
    payload?: Record<string, unknown> | null,
  ) {
    if (payload && typeof payload.error_description === 'string') {
      return payload.error_description;
    }
    if (payload && typeof payload.msg === 'string') return payload.msg;
    if (payload && typeof payload.message === 'string') return payload.message;
    const text = await response.text().catch(() => '');
    return text.trim() || `Supabase admin respondeu ${response.status}.`;
  }
}
