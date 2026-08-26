jest.mock("../src/lib/supabase/client", () => ({ supabase: {} }));

import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { useState } from "react";
import { Button, Text, View, Pressable } from "react-native";

import { AuthProvider, useAuth } from "../src/features/auth/AuthProvider";
import type {
  AuthenticatedSession,
  Profile,
} from "../src/integration/contracts";
import { IntegrationError } from "../src/integration/errors";
import type {
  AuthRepository,
  ProfileRepository,
} from "../src/integration/repositories";
import { asUserId } from "../src/integration/validation";

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function Probe() {
  const auth = useAuth();
  const [failure, setFailure] = useState<string>("none");
  return (
    <View>
      <Text testID="status">{auth.status}</Text>
      <Text testID="profile-status">{auth.profileStatus}</Text>
      {auth.user && <Text testID="email">{auth.user.email}</Text>}
      {auth.profileError && <Text testID="error">{auth.profileError}</Text>}
      <Text testID="failure">{failure}</Text>
      <Button
        title="sign-in"
        onPress={() =>
          void auth
            .signIn("test@example.com", "password")
            .catch(() => setFailure("sign-in"))
        }
      />
      <Pressable onPress={() => void auth.signOut().catch(() => setFailure("sign-out"))}>
        <Text>sign-out</Text>
      </Pressable>
      <Pressable onPress={() => auth.updateProfile({ displayName: "Updated" })}>
        <Text>update</Text>
      </Pressable>
      <Pressable onPress={() => auth.refreshProfile()}>
        <Text>refresh</Text>
      </Pressable>
    </View>
  );
}

const userASession: AuthenticatedSession = {
  user: {
    id: asUserId("11111111-1111-4111-8111-111111111111"),
    email: "test@example.com",
    displayName: "Test User",
  },
  expiresAt: null,
};

const profile: Profile = {
  id: asUserId("11111111-1111-4111-8111-111111111111"),
  displayName: "Test User",
  avatarUrl: null,
  homeCountry: "VN",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function createRepositories(restore: Promise<AuthenticatedSession | null>) {
  const session = userASession;

  let authListener: ((session: AuthenticatedSession | null) => void) | null =
    null;

  const auth: AuthRepository = {
    restoreSession: jest.fn(() => restore),
    signIn: jest.fn().mockResolvedValue(session),
    signUp: jest
      .fn()
      .mockResolvedValue({ session: null, confirmationRequired: true }),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn((next) => {
      authListener = next;
      return () => {
        authListener = null;
      };
    }),
  };

  const profiles: ProfileRepository = {
    getOwnProfile: jest.fn().mockResolvedValue(profile),
    updateOwnProfile: jest
      .fn()
      .mockResolvedValue({ ...profile, displayName: "Updated" }),
  };

  return {
    auth,
    profiles,
    emit: (nextSession: AuthenticatedSession | null) => {
      if (authListener) authListener(nextSession);
    },
  };
}

describe("AuthProvider session lifecycle", () => {
  afterEach(() => {
    cleanup();
  });

  it("holds the bootstrap state until restore resolves, then renders signed out without guessing", async () => {
    const restorePromise = deferred<AuthenticatedSession | null>();
    const repositories = createRepositories(restorePromise.promise);

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId("status").props.children).toBe("bootstrapping");
    expect(screen.getByTestId("profile-status").props.children).toBe("idle");

    await act(async () => {
      restorePromise.resolve(null);
    });

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedOut")
    );
  });

  it("restores a valid session and fetches the RLS-owned profile", async () => {
    const repositories = createRepositories(Promise.resolve(userASession));

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedIn")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("ready");
    expect(screen.getByTestId("email").props.children).toBe("test@example.com");
  });

  it("treats an invalid restored session as signed out and responds to later auth events", async () => {
    const repositories = createRepositories(
      Promise.reject(new IntegrationError("sessionExpired"))
    );
    const user = userEvent.setup();

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedOut")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("idle");

    await user.press(screen.getByText("sign-in"));

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedIn")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("ready");
  });

  it("keeps signed-in state when remote sign-out fails and reconciles a successful profile update", async () => {
    const repositories = createRepositories(Promise.resolve(userASession));
    jest
      .mocked(repositories.auth.signOut)
      .mockRejectedValueOnce(new IntegrationError("network"));
    const user = userEvent.setup();

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedIn")
    );

    await user.press(screen.getByText("sign-out"));
    await waitFor(() =>
      expect(screen.getByTestId("failure").props.children).toBe("sign-out")
    );
    expect(screen.getByTestId("status").props.children).toBe("signedIn");

    await user.press(screen.getByText("update"));
    await waitFor(() =>
      expect(screen.getByTestId("profile-status").props.children).toBe("ready")
    );
  });

  it("unsubscribes and ignores pending profile work after unmount", async () => {
    const pendingProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(userASession));
    jest
      .mocked(repositories.profiles.getOwnProfile)
      .mockReturnValueOnce(pendingProfile.promise);

    const view = await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("profile-status").props.children).toBe("loading")
    );

    await view.unmount();
    await act(async () => pendingProfile.resolve(profile));
  });

  it("exposes signedIn state immediately (app shell ready) before deferred profile resolves", async () => {
    const pendingProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(userASession));
    jest
      .mocked(repositories.profiles.getOwnProfile)
      .mockReturnValueOnce(pendingProfile.promise);

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedIn")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("loading");

    await act(async () => pendingProfile.resolve(profile));

    await waitFor(() =>
      expect(screen.getByTestId("profile-status").props.children).toBe("ready")
    );
  });

  it("clears state on sign-out while profile is pending without leaking", async () => {
    const pendingProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(userASession));
    jest
      .mocked(repositories.profiles.getOwnProfile)
      .mockReturnValueOnce(pendingProfile.promise);
    const user = userEvent.setup();

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("profile-status").props.children).toBe("loading")
    );

    await user.press(screen.getByText("sign-out"));

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedOut")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("idle");

    await act(async () => pendingProfile.resolve(profile));

    expect(screen.getByTestId("status").props.children).toBe("signedOut");
  });

  it("safeguards against User A profile overwriting User B state (stale profile race)", async () => {
    const userAProfile = deferred<Profile | null>();
    const userBProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(userASession));

    const userBSession: AuthenticatedSession = {
      user: {
        id: asUserId("22222222-2222-4222-8222-222222222222"),
        email: "b@example.com",
        displayName: "User B",
      },
      expiresAt: null,
    };

    jest
      .mocked(repositories.profiles.getOwnProfile)
      .mockReturnValueOnce(userAProfile.promise)
      .mockReturnValueOnce(userBProfile.promise);

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("email").props.children).toBe("test@example.com")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("loading");

    await act(async () => repositories.emit(userBSession));

    await waitFor(() =>
      expect(screen.getByTestId("email").props.children).toBe("b@example.com")
    );
    expect(screen.getByTestId("profile-status").props.children).toBe("loading");

    await act(async () => userAProfile.resolve(profile));

    expect(screen.getByTestId("profile-status").props.children).toBe("loading");

    await act(async () =>
      userBProfile.resolve({ ...profile, id: userBSession.user.id })
    );

    await waitFor(() =>
      expect(screen.getByTestId("profile-status").props.children).toBe("ready")
    );
  });

  it("prevents duplicate profile fetches when identical user sessions are emitted concurrently", async () => {
    const repositories = createRepositories(Promise.resolve(userASession));

    await render(
      <AuthProvider
        authRepository={repositories.auth}
        profileRepository={repositories.profiles}
      >
        <Probe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("status").props.children).toBe("signedIn")
    );

    await act(async () => repositories.emit(userASession));
    await act(async () => repositories.emit({ ...userASession }));

    expect(repositories.profiles.getOwnProfile).toHaveBeenCalledTimes(1);
  });

  it("safeguards refreshProfile against User A -> User B stale race", async () => {
    const userARefresh = deferred<Profile | null>();
    const userBProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(userASession));

    const userBSession: AuthenticatedSession = {
      user: { id: asUserId("22222222-2222-4222-8222-222222222222"), email: "b@example.com", displayName: "User B" },
      expiresAt: null,
    };

    const user = userEvent.setup();

    jest.mocked(repositories.profiles.getOwnProfile)
      .mockResolvedValueOnce(profile)
      .mockReturnValueOnce(userARefresh.promise)
      .mockReturnValueOnce(userBProfile.promise);

    await render(
      <AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("profile-status").props.children).toBe("ready"));

    await user.press(screen.getByText("refresh"));

    await waitFor(() => expect(screen.getByTestId("profile-status").props.children).toBe("loading"));

    await act(async () => repositories.emit(userBSession));

    await waitFor(() => {
      expect(screen.getByTestId("email").props.children).toBe("b@example.com");
      expect(screen.getByTestId("profile-status").props.children).toBe("loading");
    });

    await act(async () => userARefresh.resolve(profile));
    expect(screen.getByTestId("profile-status").props.children).toBe("loading");
    await act(async () => userBProfile.resolve(profile));
  });

  it("safeguards updateProfile against User A -> User B stale race", async () => {
    const userAUpdate = deferred<Profile | null>();
    const userBProfile = deferred<Profile | null>();
    const repositories = createRepositories(Promise.resolve(userASession));

    const userBSession: AuthenticatedSession = {
      user: { id: asUserId("22222222-2222-4222-8222-222222222222"), email: "b@example.com", displayName: "User B" },
      expiresAt: null,
    };

    const user = userEvent.setup();

    jest.mocked(repositories.profiles.getOwnProfile)
      .mockResolvedValueOnce(profile)
      .mockReturnValueOnce(userBProfile.promise);

    jest.mocked(repositories.profiles.updateOwnProfile)
      .mockReturnValueOnce(userAUpdate.promise as unknown as Promise<Profile>);

    await render(
      <AuthProvider authRepository={repositories.auth} profileRepository={repositories.profiles}>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("profile-status").props.children).toBe("ready"));

    await user.press(screen.getByText("update"));

    await act(async () => repositories.emit(userBSession));

    await waitFor(() => {
      expect(screen.getByTestId("email").props.children).toBe("b@example.com");
      expect(screen.getByTestId("profile-status").props.children).toBe("loading");
    });

    await act(async () => userAUpdate.resolve(profile));
    expect(screen.getByTestId("profile-status").props.children).toBe("loading");
    await act(async () => userBProfile.resolve(profile));
  });
});
