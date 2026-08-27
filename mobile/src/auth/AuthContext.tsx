/**
 * Session state for the whole app.
 *
 * The API key pair lives in the device keychain (SecureStore), never in
 * AsyncStorage -- it is a long-lived credential and AsyncStorage is plain
 * text on a rooted handset.
 *
 * Policy comes down with the bootstrap, so the app re-fetches it whenever it
 * returns to the foreground. Without that, a setting changed on the desk --
 * turning barcode scanning off, say -- would not reach a handset until the
 * next sign-in, which for a rep who stays signed in all week is effectively
 * never.
 *
 * The last bootstrap is cached separately in AsyncStorage because it is not
 * secret and because the app has to open on a van with no signal. That is
 * the point of `policy.offline_window_hours`: the rep can keep working from
 * the cached session for as long as the server said is acceptable, and is
 * pushed back to a real sign-in once that runs out.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { ApiError, login as loginRequest, normaliseSite, type Credentials } from '../api/client';
import { api, type Api } from '../api/endpoints';
import type { Bootstrap, Persona, VanProfile } from '../api/types';

const KEY_CREDENTIALS = 'van_sales_credentials';
const KEY_BOOTSTRAP = 'van_sales_bootstrap';
const KEY_LAST_SITE = 'van_sales_last_site';
const KEY_LAST_USER = 'van_sales_last_user';
const KEY_SIGNED_IN_AT = 'van_sales_signed_in_at';
const KEY_ACTIVE_VAN = 'van_sales_active_van';

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

interface AuthValue {
  ready: boolean;
  credentials: Credentials | null;
  bootstrap: Bootstrap | null;
  persona: Persona | null;
  van: VanProfile | null;
  /** Null until signed in; every screen guards on `credentials` first. */
  client: Api | null;
  lastSite: string;
  lastUser: string;
  /** Set when the cached session has outlived the server's offline window. */
  staleSession: boolean;
  signIn: (site: string, usr: string, pwd: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setPersona: (persona: Persona) => void;
  setVan: (van: VanProfile) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in client, for screens that already know they are authenticated. */
export function useApi(): Api {
  const { client } = useAuth();
  if (!client) throw new Error('useApi used before sign-in');
  return client;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [persona, setPersonaState] = useState<Persona | null>(null);
  const [van, setVanState] = useState<VanProfile | null>(null);
  const [lastSite, setLastSite] = useState('');
  const [lastUser, setLastUser] = useState('');
  const [staleSession, setStaleSession] = useState(false);

  // Restore whatever the last session left behind, before the first render
  // decides between the login screen and the home screen.
  useEffect(() => {
    (async () => {
      try {
        const [rawCreds, rawBootstrap, site, user, signedInAt, activeVan] = await Promise.all([
  getSecureItem(KEY_CREDENTIALS),
  AsyncStorage.getItem(KEY_BOOTSTRAP),
  AsyncStorage.getItem(KEY_LAST_SITE),
  AsyncStorage.getItem(KEY_LAST_USER),
  AsyncStorage.getItem(KEY_SIGNED_IN_AT),
  AsyncStorage.getItem(KEY_ACTIVE_VAN),
]);

        if (site) setLastSite(site);
        if (user) setLastUser(user);

        if (rawCreds) {
          const creds = JSON.parse(rawCreds) as Credentials;
          const cached = rawBootstrap ? (JSON.parse(rawBootstrap) as Bootstrap) : null;

          const windowHours = cached?.policy?.offline_window_hours ?? 72;
          const signedAt = signedInAt ? Number(signedInAt) : 0;
          const expired =
            signedAt > 0 && Date.now() - signedAt > windowHours * 60 * 60 * 1000;

          if (expired) {
            // Keep the keys -- the user may come back into coverage and a
            // fresh sign-in will simply reuse them -- but make the app ask.
            setStaleSession(true);
          } else {
            setCredentials(creds);
            if (cached) applyBootstrap(cached, activeVan);
          }
        }
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyBootstrap(next: Bootstrap, preferredVan?: string | null) {
    setBootstrap(next);
    setPersonaState((current) =>
      current && next.personas.includes(current) ? current : next.active_persona,
    );
    setVanState((current) => {
      const wanted = preferredVan ?? current?.profile;
      return next.vans.find((v) => v.profile === wanted) ?? next.vans[0] ?? null;
    });
  }

  const client = useMemo(() => (credentials ? api(credentials) : null), [credentials]);

  const signIn = useCallback(async (rawSite: string, usr: string, pwd: string) => {
    const site = normaliseSite(rawSite);
    if (!site) throw new ApiError('Enter the site address first.');

    const result = await loginRequest(site, usr.trim(), pwd, {
      name: 'Van Sales app',
    });

    const creds: Credentials = {
      site,
      apiKey: result.api_key,
      apiSecret: result.api_secret,
    };

    await setSecureItem(KEY_CREDENTIALS, JSON.stringify(creds));
    await AsyncStorage.multiSet([
      [KEY_BOOTSTRAP, JSON.stringify(result.bootstrap)],
      [KEY_LAST_SITE, site],
      [KEY_LAST_USER, usr.trim()],
      [KEY_SIGNED_IN_AT, String(Date.now())],
    ]);

    setLastSite(site);
    setLastUser(usr.trim());
    setStaleSession(false);
    setCredentials(creds);
    applyBootstrap(result.bootstrap);
  }, []);

  const signOut = useCallback(async () => {
    await deleteSecureItem(KEY_CREDENTIALS);
    await AsyncStorage.multiRemove([KEY_BOOTSTRAP, KEY_SIGNED_IN_AT, KEY_ACTIVE_VAN]);
    setCredentials(null);
    setBootstrap(null);
    setPersonaState(null);
    setVanState(null);
    setStaleSession(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!client) return;
    const next = await client.bootstrap();
    await AsyncStorage.setItem(KEY_BOOTSTRAP, JSON.stringify(next));
    applyBootstrap(next, van?.profile ?? null);
  }, [client, van?.profile]);

  // Re-fetch policy and roles when the app comes back to the foreground.
  // Throttled, because Android fires `active` on trivial things like the
  // notification shade closing, and this must never be silent-fail loud:
  // a refresh that cannot reach the server just leaves the cache in place.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const lastRefreshAt = useRef(0);
  const MIN_REFRESH_GAP_MS = 20_000;

  useEffect(() => {
    if (!credentials) return;

    const sync = () => {
      const now = Date.now();
      if (now - lastRefreshAt.current < MIN_REFRESH_GAP_MS) return;
      lastRefreshAt.current = now;
      refreshRef.current().catch(() => {});
    };

    sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [credentials]);

  const setPersona = useCallback((next: Persona) => setPersonaState(next), []);

  const setVan = useCallback((next: VanProfile) => {
    setVanState(next);
    AsyncStorage.setItem(KEY_ACTIVE_VAN, next.profile).catch(() => {});
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      credentials,
      bootstrap,
      persona,
      van,
      client,
      lastSite,
      lastUser,
      staleSession,
      signIn,
      signOut,
      refresh,
      setPersona,
      setVan,
    }),
    [
      ready,
      credentials,
      bootstrap,
      persona,
      van,
      client,
      lastSite,
      lastUser,
      staleSession,
      signIn,
      signOut,
      refresh,
      setPersona,
      setVan,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
