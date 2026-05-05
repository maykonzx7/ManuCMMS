import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { App as AntApp, Button, Card, ConfigProvider, Space, Spin, Typography } from 'antd';
import type { BackendMe } from './lib/auth';
import { apiFetch } from './lib/api';
import {
  getAccessPortalPath,
  getInvitePortalPath,
  getPlatformPortalPath,
} from './lib/portal-paths';
import { supabase } from './lib/supabase';

const LoginPage = lazy(async () => {
  const module = await import('./components/LoginPage');
  return { default: module.LoginPage };
});

const AuthenticatedApp = lazy(async () => {
  const module = await import('./components/AuthenticatedApp');
  return { default: module.AuthenticatedApp };
});

const PlatformOwnerPage = lazy(async () => {
  const module = await import('./components/PlatformOwnerPage');
  return { default: module.PlatformOwnerPage };
});

const InviteAccessPage = lazy(async () => {
  const module = await import('./components/InviteAccessPage');
  return { default: module.InviteAccessPage };
});

const antTheme = {
  token: {
    colorPrimary: '#23485c',
    colorInfo: '#23485c',
    colorSuccess: '#47705f',
    colorWarning: '#a06a2c',
    colorError: '#9a3f49',
    colorBgLayout: '#eef2f4',
    colorBgContainer: '#ffffff',
    colorBorderSecondary: '#d9e0e4',
    borderRadius: 14,
    fontFamily: '"Segoe UI", "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
  },
} as const;

type PublicPortal = 'access' | 'platform' | 'invite';

function normalizeRuntimePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

function matchesPortalPath(pathname: string, portalPath: string) {
  const currentPath = normalizeRuntimePath(pathname);
  const targetPath = normalizeRuntimePath(portalPath);
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function resolvePublicPortal(): PublicPortal {
  if (typeof window === 'undefined') {
    return 'access';
  }

  const accessPath = getAccessPortalPath();
  const platformPath = getPlatformPortalPath();
  const invitePath = getInvitePortalPath();

  if (matchesPortalPath(window.location.pathname, platformPath)) {
    return 'platform';
  }

  if (
    matchesPortalPath(window.location.pathname, invitePath) ||
    new URLSearchParams(window.location.search).has('token')
  ) {
    return 'invite';
  }

  if (matchesPortalPath(window.location.pathname, accessPath)) {
    return 'access';
  }

  return 'access';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [backendMe, setBackendMe] = useState<BackendMe | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [publicPortal, setPublicPortal] = useState<PublicPortal>(
    resolvePublicPortal(),
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncPortal = () => {
      setPublicPortal(resolvePublicPortal());
    };

    syncPortal();
    window.addEventListener('popstate', syncPortal);
    return () => window.removeEventListener('popstate', syncPortal);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsLoadingSession(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setBackendMe(null);
      setIsLoadingUser(false);
      return;
    }

    setIsLoadingUser(true);

    const controller = new AbortController();
    void (async () => {
      const response = await apiFetch('/me', session.access_token, controller.signal);
      let responseMessage = 'Nao foi possivel carregar o contexto do usuario no backend.';

      try {
        const errorBody = (await response.clone().json()) as {
          message?: string | string[];
          error?: string;
        };
        const message =
          typeof errorBody.message === 'string'
            ? errorBody.message
            : Array.isArray(errorBody.message)
              ? errorBody.message.join(' ')
              : null;
        if (message) {
          responseMessage = message;
        } else if (errorBody.error) {
          responseMessage = errorBody.error;
        }
      } catch {
        // resposta sem corpo JSON legivel
      }

      if (!response.ok) {
        if (response.status === 401) {
          setAuthWarning(
            responseMessage,
          );
          if (supabase) {
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
          }
        }
        throw new Error(responseMessage);
      }

      const body = (await response.json()) as BackendMe;
      setBackendMe(body);
    })()
      .catch((fetchError: unknown) => {
        if ((fetchError as Error).name !== 'AbortError') {
          setBackendMe(null);
        }
      })
      .finally(() => {
        setIsLoadingUser(false);
      });

    return () => controller.abort();
  }, [session]);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setBackendMe(null);
  }

  function navigateTo(pathname: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.history.pushState({}, '', pathname);
    setPublicPortal(resolvePublicPortal());
  }

  const accessPath = getAccessPortalPath();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', accessPath);
      setPublicPortal('access');
    }
  }, [accessPath]);

  if (publicPortal === 'platform') {
    return (
      <ConfigProvider theme={antTheme}>
        <AntApp>
          <Suspense
            fallback={
              <div className="app-fallback">
                <Spin size="large" />
              </div>
            }
          >
            <PlatformOwnerPage onGoToAccess={() => navigateTo(accessPath)} />
          </Suspense>
        </AntApp>
      </ConfigProvider>
    );
  }

  if (publicPortal === 'invite') {
    return (
      <ConfigProvider theme={antTheme}>
        <AntApp>
          <Suspense
            fallback={
              <div className="app-fallback">
                <Spin size="large" />
              </div>
            }
          >
            <InviteAccessPage
              session={session}
              onGoToAccess={() => navigateTo(accessPath)}
            />
          </Suspense>
        </AntApp>
      </ConfigProvider>
    );
  }

  if (!session) {
    if (
      typeof window !== 'undefined' &&
      !matchesPortalPath(window.location.pathname, accessPath)
    ) {
      return (
        <ConfigProvider theme={antTheme}>
          <AntApp>
            <div className="app-fallback">
              <Card style={{ maxWidth: 460, width: '100%' }}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Typography.Text type="secondary">ManuCMMS</Typography.Text>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    Endereco indisponivel
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0 }}>
                    O acesso a esta area utiliza uma rota privada configurada pela empresa.
                  </Typography.Paragraph>
                  <Button type="default" onClick={() => navigateTo(accessPath)}>
                    Ir para o portal de acesso
                  </Button>
                </Space>
              </Card>
            </div>
          </AntApp>
        </ConfigProvider>
      );
    }

    return (
      <ConfigProvider theme={antTheme}>
        <AntApp>
          <Suspense
            fallback={
              <div className="app-fallback">
                <Spin size="large" />
              </div>
            }
          >
            <LoginPage
              authWarning={authWarning}
              isLoadingSession={isLoadingSession}
            />
          </Suspense>
        </AntApp>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antTheme}>
      <AntApp>
        <Suspense
          fallback={
            <div className="app-fallback">
              <Spin size="large" />
            </div>
          }
        >
          <AuthenticatedApp
            authWarning={authWarning}
            backendMe={backendMe}
            isLoadingUser={isLoadingUser}
            onSignOut={handleSignOut}
            session={session}
          />
        </Suspense>
      </AntApp>
    </ConfigProvider>
  );
}
