import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { BackendMe } from './lib/auth';
import { apiFetch } from './lib/api';
import { getAccessPortalPath, getInvitePortalPath, getPlatformPortalPath } from './lib/portal-paths';
import { supabase } from './lib/supabase';

const LoginPage = lazy(async () => ({ default: (await import('./components/LoginPage')).LoginPage }));
const AuthenticatedApp = lazy(async () => ({ default: (await import('./components/AuthenticatedApp')).AuthenticatedApp }));
const PlatformOwnerPage = lazy(async () => ({ default: (await import('./components/PlatformOwnerPage')).PlatformOwnerPage }));
const InviteAccessPage = lazy(async () => ({ default: (await import('./components/InviteAccessPage')).InviteAccessPage }));

type PublicPortal = 'access' | 'platform' | 'invite';

function normalize(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

function matches(pathname: string, portalPath: string) {
  const current = normalize(pathname);
  const target = normalize(portalPath);
  return current === target || current.startsWith(`${target}/`);
}

function resolvePublicPortal(): PublicPortal {
  if (typeof window === 'undefined') return 'access';
  const accessPath = getAccessPortalPath();
  const platformPath = getPlatformPortalPath();
  const invitePath = getInvitePortalPath();

  if (matches(window.location.pathname, platformPath)) return 'platform';
  if (matches(window.location.pathname, invitePath) || new URLSearchParams(window.location.search).has('token')) return 'invite';
  if (matches(window.location.pathname, accessPath)) return 'access';
  return 'access';
}

function resolveAccessCompanySlug(): string | null {
  if (typeof window === 'undefined') return null;
  const accessPath = normalize(getAccessPortalPath());
  const currentPath = normalize(window.location.pathname);
  if (!currentPath.startsWith(`${accessPath}/`)) {
    return null;
  }
  const suffix = currentPath.slice(accessPath.length + 1);
  const [slug] = suffix.split('/');
  const normalizedSlug = slug?.trim().toLowerCase() ?? '';
  return normalizedSlug.length > 0 ? normalizedSlug : null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [backendMe, setBackendMe] = useState<BackendMe | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [publicPortal, setPublicPortal] = useState<PublicPortal>(resolvePublicPortal());
  const [accessCompanySlug, setAccessCompanySlug] = useState<string | null>(
    resolveAccessCompanySlug(),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      setPublicPortal(resolvePublicPortal());
      setAccessCompanySlug(resolveAccessCompanySlug());
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
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
      if (!response.ok) {
        if (response.status === 401) {
          setAuthWarning('Sua sessao nao foi validada no backend. Faca login novamente.');
          if (supabase) {
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
          }
        }
        throw new Error('Falha ao carregar usuario');
      }
      const body = (await response.json()) as BackendMe;
      setBackendMe(body);
    })()
      .catch(() => setBackendMe(null))
      .finally(() => setIsLoadingUser(false));

    return () => controller.abort();
  }, [session]);

  useEffect(() => {
    if (!session || !backendMe || !accessCompanySlug) {
      return;
    }
    const userCompanySlug = backendMe.usuario?.empresa?.slug?.toLowerCase() ?? null;
    if (userCompanySlug === accessCompanySlug) {
      return;
    }
    setAuthWarning('Este login e exclusivo da empresa informada. Use o portal correto.');
    void (async () => {
      if (supabase) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      setSession(null);
      setBackendMe(null);
    })();
  }, [accessCompanySlug, backendMe, session]);

  function navigateTo(pathname: string) {
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', pathname);
    setPublicPortal(resolvePublicPortal());
    setAccessCompanySlug(resolveAccessCompanySlug());
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setBackendMe(null);
  }

  const accessPath = getAccessPortalPath();

  if (publicPortal === 'platform') {
    return <Suspense fallback={<div className="min-h-screen grid place-items-center">Carregando...</div>}><PlatformOwnerPage onGoToAccess={() => navigateTo(accessPath)} /></Suspense>;
  }

  if (publicPortal === 'invite') {
    return <Suspense fallback={<div className="min-h-screen grid place-items-center">Carregando...</div>}><InviteAccessPage session={session} onGoToAccess={() => navigateTo(accessPath)} /></Suspense>;
  }

  if (!session) {
    return <Suspense fallback={<div className="min-h-screen grid place-items-center">Carregando...</div>}><LoginPage authWarning={authWarning} companySlug={accessCompanySlug} isLoadingSession={isLoadingSession} /></Suspense>;
  }

  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Carregando...</div>}>
      <AuthenticatedApp authWarning={authWarning} backendMe={backendMe} isLoadingUser={isLoadingUser} onSignOut={handleSignOut} session={session} />
    </Suspense>
  );
}
