import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SupabaseAdminUser = {
  id: string;
  email?: string;
};

@Injectable()
export class SupabaseAdminService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(this.baseUrl() && this.serviceRole());
  }

  async findUserByEmail(email: string): Promise<SupabaseAdminUser | null> {
    const response = await this.adminFetch(
      `/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { method: 'GET' },
    );
    const payload = (await response.json().catch(() => null)) as {
      users?: SupabaseAdminUser[];
    } | null;

    if (!response.ok) {
      const message = await this.readErrorMessage(response, payload);
      throw new Error(message);
    }

    return payload?.users?.[0] ?? null;
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

  private baseUrl() {
    return this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
  }

  private serviceRole() {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
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
