import { computed, ref } from "vue";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../../core/supabaseClient";
import type { Profile } from "../types";
import { fetchProfile } from "../services/profileService";

const session = ref<Session | null>(null);
const profile = ref<Profile | null>(null);
const loading = ref(true);

/**
 * True when the user arrived via a password-recovery link.
 * Even though Supabase creates a valid session for the recovery token,
 * we should NOT treat the user as fully logged-in.
 */
const isRecoveryMode = ref(false);

let initialized = false;
let authListenerReady = false;
let initPromise: Promise<void> | null = null;

/** Callbacks registered via onSessionExpired() */
const sessionExpiredCallbacks: Array<() => void> = [];

const loadProfile = async (userId: string) => {
  try {
    profile.value = await fetchProfile(userId);
  } catch (error) {
    console.error("Failed to load profile", error);
    profile.value = null;
  }
};

const clearSession = () => {
  session.value = null;
  profile.value = null;
  initialized = false;
  initPromise = null;
};

const notifySessionExpired = () => {
  sessionExpiredCallbacks.forEach((cb) => cb());
};

const updateSession = async (newSession: Session | null) => {
  session.value = newSession;
  if (newSession?.user) {
    if (profile.value?.id === newSession.user.id) {
      return;
    }
    await loadProfile(newSession.user.id);
  } else {
    profile.value = null;
  }
};

const handleAuthEvent = async (event: AuthChangeEvent, newSession: Session | null) => {
  // Session expired or user signed out
  if (event === "SIGNED_OUT") {
    isRecoveryMode.value = false;
    clearSession();
    notifySessionExpired();
    return;
  }

  // Supabase fires PASSWORD_RECOVERY when the user arrives via a recovery link
  if (event === "PASSWORD_RECOVERY") {
    isRecoveryMode.value = true;
  }

  // Token refresh failed — session is gone
  if (event === "TOKEN_REFRESHED" && !newSession) {
    clearSession();
    notifySessionExpired();
    return;
  }

  await updateSession(newSession ?? null);
};

const initAuth = async () => {
  if (initialized && initPromise) {
    return initPromise;
  }

  initialized = true;
  loading.value = true;

  initPromise = (async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn("Session retrieval failed:", error.message);
      clearSession();
      notifySessionExpired();
      loading.value = false;
      return;
    }

    await updateSession(data.session ?? null);

    if (!authListenerReady) {
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        await handleAuthEvent(event, newSession);
      });
      authListenerReady = true;
    }

    loading.value = false;
  })();

  return initPromise;
};

/**
 * Register a callback to be called when the session expires.
 * Typically used in App.vue to redirect to the login page.
 */
const onSessionExpired = (callback: () => void) => {
  sessionExpiredCallbacks.push(callback);
};

export const useAuthStore = () => {
  return {
    session,
    profile,
    loading,
    isRecoveryMode,
    user: computed(() => session.value?.user ?? null),
    initAuth,
    updateSession,
    clearSession,
    onSessionExpired,
  };
};
