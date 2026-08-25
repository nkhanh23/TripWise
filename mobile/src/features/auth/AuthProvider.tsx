import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../../lib/supabase/client";
import type {
  AuthenticatedSession,
  AuthenticatedUser,
  ProfileUpdate,
} from "../../integration/contracts";
import type { IntegrationErrorCode } from "../../integration/errors";
import type {
  AuthRepository,
  ProfileRepository,
} from "../../integration/repositories";
import { SupabaseAuthRepository } from "../../integration/remote/supabaseAuthRepository";
import { SupabaseProfileRepository } from "../../integration/remote/supabaseProfileRepository";
import type { AuthState, SignUpResult } from "./types";

const authRepo = new SupabaseAuthRepository(supabase);
const profileRepo = new SupabaseProfileRepository(supabase);

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (update: ProfileUpdate) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  status: "bootstrapping",
  user: null,
  profile: null,
  profileStatus: "idle",
  profileError: null,
};

type AuthProviderProps = PropsWithChildren<{
  authRepository?: SupabaseAuthRepository | AuthRepository;
  profileRepository?: SupabaseProfileRepository | ProfileRepository;
}>;

export function AuthProvider({
  children,
  authRepository = authRepo,
  profileRepository = profileRepo,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applyUser = useCallback(
    async (user: AuthenticatedUser | null) => {
      if (!user) {
        if (mountedRef.current) {
          setState({
            status: "signedOut",
            user: null,
            profile: null,
            profileStatus: "idle",
            profileError: null,
          });
        }
        return;
      }

      if (mountedRef.current) {
        setState({
          status: "signedIn",
          user,
          profile: null,
          profileStatus: "loading",
          profileError: null,
        });
      }

      try {
        const profile = await profileRepository.getOwnProfile(user.id);
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            profile: profile ?? null,
            profileStatus: profile ? "ready" : "absent",
            profileError: null,
          }));
        }
      } catch (err: unknown) {
        const code = (err as { code?: IntegrationErrorCode })?.code;
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            profileStatus: "error",
            profileError: code ?? "unknown",
          }));
        }
      }
    },
    [profileRepository],
  );

  useEffect(() => {
    // Bootstrap: restore existing session
    authRepository
      .restoreSession()
      .then((session: AuthenticatedSession | null) => {
        void applyUser(session?.user ?? null);
      })
      .catch(() => {
        void applyUser(null);
      });

    const unsubscribe = authRepository.subscribe(
      (session: AuthenticatedSession | null) => {
        void applyUser(session?.user ?? null);
      },
    );
    return unsubscribe;
  }, [applyUser, authRepository]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await authRepository.signIn(email, password);
      await applyUser(session.user);
    },
    [applyUser, authRepository],
  );

  const signUp = useCallback(
    async (
      displayName: string,
      email: string,
      password: string,
    ): Promise<SignUpResult> => {
      const result = await authRepository.signUp(displayName, email, password);
      if (result.session) {
        await applyUser(result.session.user);
      }
      return { confirmationRequired: result.confirmationRequired };
    },
    [applyUser, authRepository],
  );

  const signOut = useCallback(async () => {
    await authRepository.signOut();
    await applyUser(null);
  }, [applyUser, authRepository]);

  const deleteAccount = useCallback(async () => {
    await authRepository.deleteAccount();
    await applyUser(null);
  }, [applyUser, authRepository]);

  const resetPassword = useCallback(
    async (email: string) => {
      await authRepository.resetPassword(email);
    },
    [authRepository],
  );

  const refreshProfile = useCallback(async () => {
    const current = state;
    if (current.status !== "signedIn" || !current.user) return;
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, profileStatus: "loading" }));
    }
    try {
      const profile = await profileRepository.getOwnProfile(current.user.id);
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          profile: profile ?? null,
          profileStatus: profile ? "ready" : "absent",
          profileError: null,
        }));
      }
    } catch (err: unknown) {
      const code = (err as { code?: IntegrationErrorCode })?.code;
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          profileStatus: "error",
          profileError: code ?? "unknown",
        }));
      }
    }
  }, [profileRepository, state]);

  const updateProfile = useCallback(
    async (update: ProfileUpdate) => {
      const current = state;
      if (current.status !== "signedIn" || !current.user)
        throw new Error("Not signed in");
      const profile = await profileRepository.updateOwnProfile(
        current.user.id,
        update,
      );
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          profile,
          profileStatus: "ready",
          profileError: null,
        }));
      }
    },
    [profileRepository, state],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      resetPassword,
      refreshProfile,
      updateProfile,
    }),
    [
      state,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      resetPassword,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
