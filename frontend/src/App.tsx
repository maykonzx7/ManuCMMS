import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { App as AntApp, ConfigProvider, Spin } from 'antd';
import type { BackendMe } from './lib/auth';
import { apiFetch } from './lib/api';
import { supabase } from './lib/supabase';

const LoginPage = lazy(async () => {
  const module = await import('./components/LoginPage');
  return { default: module.LoginPage };
});

const AuthenticatedApp = lazy(async () => {
  const module = await import('./components/AuthenticatedApp');
  return { default: module.AuthenticatedApp };
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [backendMe, setBackendMe] = useState<BackendMe | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);

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

  if (!session) {
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
