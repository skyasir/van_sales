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

import {
  ApiError,
  getLoggedUser,
  login as loginRequest,
  normaliseSite,
  type Credentials,
} from '../api/client';

import {
  api,
  type Api,
} from '../api/endpoints';

import type {
  Bootstrap,
  Persona,
  VanProfile,
} from '../api/types';

const KEY_CREDENTIALS = 'van_sales_credentials';
const KEY_BOOTSTRAP = 'van_sales_bootstrap';
const KEY_LAST_SITE = 'van_sales_last_site';
const KEY_LAST_USER = 'van_sales_last_user';
const KEY_SIGNED_IN_AT = 'van_sales_signed_in_at';
const KEY_ACTIVE_VAN = 'van_sales_active_van';

async function getSecureItem(
  key: string,
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setSecureItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(
  key: string,
): Promise<void> {
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
  client: Api | null;
  lastSite: string;
  lastUser: string;
  staleSession: boolean;

  signIn: (
    site: string,
    usr: string,
    pwd: string,
  ) => Promise<void>;

  signOut: () => Promise<void>;

  refresh: () => Promise<void>;

  setPersona: (
    persona: Persona,
  ) => void;

  setVan: (
    van: VanProfile,
  ) => void;
}

const AuthContext =
  createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used inside <AuthProvider>',
    );
  }

  return ctx;
}

export function useApi(): Api {
  const { client } = useAuth();

  if (!client) {
    throw new Error(
      'useApi used before sign-in',
    );
  }

  return client;
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] =
    useState(false);

  const [credentials, setCredentials] =
    useState<Credentials | null>(null);

  const [bootstrap, setBootstrap] =
    useState<Bootstrap | null>(null);

  const [persona, setPersonaState] =
    useState<Persona | null>(null);

  const [van, setVanState] =
    useState<VanProfile | null>(null);

  const [lastSite, setLastSite] =
    useState('');

  const [lastUser, setLastUser] =
    useState('');

  const [staleSession, setStaleSession] =
    useState(false);

  const applyBootstrap = useCallback(
    (
      next: Bootstrap,
      preferredVan?: string | null,
    ) => {
      console.log(
        '[Van Sales] Applying bootstrap:',
        next,
      );

      setBootstrap(next);

      setPersonaState((current) => {
        if (
          current &&
          next.personas.includes(current)
        ) {
          return current;
        }

        return next.active_persona;
      });

      setVanState((current) => {
        const wanted =
          preferredVan ??
          current?.profile;

        return (
          next.vans.find(
            (v) => v.profile === wanted,
          ) ??
          next.vans[0] ??
          null
        );
      });
    },
    [],
  );

useEffect(() => {
  let cancelled = false;

  const restoreSession = async () => {
    console.log('[Van Sales] Auth restore started.');

    try {
      /*
       * =========================================================
       * WEB: Use existing Frappe Desk browser session
       * =========================================================
       */
      if (Platform.OS === 'web') {
        const currentSite = window.location.origin;

        console.log(
          '[Van Sales] Checking existing Frappe Desk session:',
          currentSite
        );

        try {
          const loggedUser = await getLoggedUser(currentSite);

          console.log('[Van Sales] Frappe logged user:', loggedUser);

          if (
            loggedUser &&
            loggedUser !== 'Guest' &&
            loggedUser !== 'guest'
          ) {
            console.log(
              '[Van Sales] Existing Desk session found. Starting Van Sales auto-login.'
            );

            const webCredentials: Credentials = {
              site: currentSite,
              apiKey: '',
              apiSecret: '',
            };

            try {
              const webApi = api(webCredentials);

              console.log(
                '[Van Sales] Loading Van Sales bootstrap using Desk cookie...'
              );

              const next = await webApi.bootstrap();

              console.log(
                '[Van Sales] Van Sales bootstrap successful:',
                next
              );

              if (cancelled) {
                return;
              }

              /*
               * Store the session in AuthContext.
               * Empty API key/secret is intentional:
               * browser cookie is the authentication.
               */
              setCredentials(webCredentials);
              setLastSite(currentSite);
              setLastUser(loggedUser);
              setStaleSession(false);

              /*
               * Cache bootstrap for future use.
               */
              await AsyncStorage.multiSet([
                [KEY_BOOTSTRAP, JSON.stringify(next)],
                [KEY_LAST_SITE, currentSite],
                [KEY_LAST_USER, loggedUser],
                [KEY_SIGNED_IN_AT, String(Date.now())],
              ]);

              /*
               * Apply Van Sales bootstrap data.
               */
              applyBootstrap(next, null);

              console.log(
                '[Van Sales] Desk auto-login completed successfully.'
              );

              return;
            } catch (error) {
              console.error(
                '[Van Sales] Desk session bootstrap failed:',
                error
              );
            }
          } else {
            console.log(
              '[Van Sales] No active Frappe Desk session found.'
            );
          }
        } catch (error) {
          console.error(
            '[Van Sales] Frappe Desk session check failed:',
            error
          );
        }
      }

      /*
       * =========================================================
       * FALLBACK: Existing stored Van Sales credentials
       * =========================================================
       */

      if (cancelled) {
        return;
      }

      const [
        rawCreds,
        rawBootstrap,
        site,
        user,
        signedInAt,
        activeVan,
      ] = await Promise.all([
        getSecureItem(KEY_CREDENTIALS),
        AsyncStorage.getItem(KEY_BOOTSTRAP),
        AsyncStorage.getItem(KEY_LAST_SITE),
        AsyncStorage.getItem(KEY_LAST_USER),
        AsyncStorage.getItem(KEY_SIGNED_IN_AT),
        AsyncStorage.getItem(KEY_ACTIVE_VAN),
      ]);

      if (site) {
        setLastSite(site);
      }

      if (user) {
        setLastUser(user);
      }

      if (!rawCreds) {
        console.log(
          '[Van Sales] No stored Van Sales credentials found.'
        );
        return;
      }

      try {
        const creds: Credentials = JSON.parse(rawCreds);

        if (
          !creds?.site ||
          !creds?.apiKey ||
          !creds?.apiSecret
        ) {
          console.log(
            '[Van Sales] Stored credentials are invalid.'
          );
          return;
        }

        setCredentials(creds);
        setStaleSession(false);

        if (rawBootstrap) {
          try {
            const cached: Bootstrap = JSON.parse(rawBootstrap);

            applyBootstrap(cached, activeVan);

            console.log(
              '[Van Sales] Restored cached Van Sales session.'
            );
          } catch (error) {
            console.error(
              '[Van Sales] Failed to restore cached bootstrap:',
              error
            );
          }
        }
      } catch (error) {
        console.error(
          '[Van Sales] Failed to parse stored credentials:',
          error
        );
      }
    } catch (error) {
      console.error(
        '[Van Sales] Session restore failed:',
        error
      );
    } finally {
      if (!cancelled) {
        console.log('[Van Sales] Auth restore finished.');
        setReady(true);
      }
    }
  };

  restoreSession();

  return () => {
    cancelled = true;
  };
}, [applyBootstrap]);
  const client = useMemo(
    () => {
      if (!credentials) {
        return null;
      }

      return api(credentials);
    },
    [credentials],
  );

  const signIn = useCallback(
    async (
      rawSite: string,
      usr: string,
      pwd: string,
    ) => {
      const site =
        normaliseSite(rawSite);

      if (!site) {
        throw new ApiError(
          'Enter the site address first.',
        );
      }

      console.log(
        '[Van Sales] Normal sign-in started.',
      );

      const result =
        await loginRequest(
          site,
          usr.trim(),
          pwd,
          {
            name: 'Van Sales app',
          },
        );

      const creds: Credentials = {
        site,
        apiKey: result.api_key,
        apiSecret: result.api_secret,
      };

      await setSecureItem(
        KEY_CREDENTIALS,
        JSON.stringify(creds),
      );

      await AsyncStorage.multiSet([
        [
          KEY_BOOTSTRAP,
          JSON.stringify(
            result.bootstrap,
          ),
        ],
        [
          KEY_LAST_SITE,
          site,
        ],
        [
          KEY_LAST_USER,
          usr.trim(),
        ],
        [
          KEY_SIGNED_IN_AT,
          String(Date.now()),
        ],
      ]);

      setLastSite(site);

      setLastUser(
        usr.trim(),
      );

      setStaleSession(false);

      setCredentials(creds);

      applyBootstrap(
        result.bootstrap,
      );

      console.log(
        '[Van Sales] Normal sign-in completed.',
      );
    },
    [applyBootstrap],
  );

  const signOut = useCallback(
    async () => {
      console.log(
        '[Van Sales] Signing out.',
      );

      await deleteSecureItem(
        KEY_CREDENTIALS,
      );

      await AsyncStorage.multiRemove([
        KEY_BOOTSTRAP,
        KEY_SIGNED_IN_AT,
        KEY_ACTIVE_VAN,
      ]);

      setCredentials(null);
      setBootstrap(null);
      setPersonaState(null);
      setVanState(null);
      setStaleSession(false);

      console.log(
        '[Van Sales] Sign out completed.',
      );
    },
    [],
  );

  const refresh = useCallback(
    async () => {
      if (!client) {
        return;
      }

      const next =
        await client.bootstrap();

      await AsyncStorage.setItem(
        KEY_BOOTSTRAP,
        JSON.stringify(next),
      );

      applyBootstrap(
        next,
        van?.profile ?? null,
      );
    },
    [
      client,
      van?.profile,
      applyBootstrap,
    ],
  );

  const refreshRef =
    useRef(refresh);

  refreshRef.current = refresh;

  const lastRefreshAt =
    useRef(0);

  const MIN_REFRESH_GAP_MS =
    20_000;

  useEffect(() => {
    if (!credentials) {
      return;
    }

    const sync = () => {
      const now = Date.now();

      if (
        now - lastRefreshAt.current <
        MIN_REFRESH_GAP_MS
      ) {
        return;
      }

      lastRefreshAt.current =
        now;

      refreshRef.current().catch(
        (error) => {
          console.log(
            '[Van Sales] Background refresh failed:',
            error,
          );
        },
      );
    };

    sync();

    const sub =
      AppState.addEventListener(
        'change',
        (state) => {
          if (state === 'active') {
            sync();
          }
        },
      );

    return () => {
      sub.remove();
    };
  }, [credentials]);

  const setPersona =
    useCallback(
      (next: Persona) => {
        setPersonaState(next);
      },
      [],
    );

  const setVan =
    useCallback(
      (next: VanProfile) => {
        setVanState(next);

        AsyncStorage.setItem(
          KEY_ACTIVE_VAN,
          next.profile,
        ).catch(() => {});
      },
      [],
    );

  const value =
    useMemo<AuthValue>(
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

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}