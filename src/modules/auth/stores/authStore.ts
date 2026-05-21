import { computed, ref } from "vue";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../core/supabaseClient";
import type { Profile } from "../types";
import { fetchProfile } from "../services/profileService";

const session = ref<Session | null>(null);
const profile = ref<Profile | null>(null);
const loading = ref(true);

let initialized = false;
let authListenerReady = false;
let initPromise: Promise<void> | null = null;

const loadProfile = async (userId: string) => {
  try {
    profile.value = await fetchProfile(userId);
  } catch (error) {
    console.error("Failed to load profile", error);
    profile.value = null;
  }
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

const initAuth = async () => {
  if (initialized && initPromise) {
    return initPromise;
  }

  initialized = true;
  loading.value = true;

  initPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    await updateSession(data.session ?? null);

    if (!authListenerReady) {
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        await updateSession(newSession ?? null);
      });
      authListenerReady = true;
    }

    loading.value = false;
  })();

  return initPromise;
};

export const useAuthStore = () => {
  return {
    session,
    profile,
    loading,
    user: computed(() => session.value?.user ?? null),
    initAuth,
    updateSession,
  };
};
