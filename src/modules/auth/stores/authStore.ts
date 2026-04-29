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

const initAuth = async () => {
  if (initialized && initPromise) {
    return initPromise;
  }

  initialized = true;
  loading.value = true;

  initPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    session.value = data.session ?? null;

    if (data.session?.user) {
      await loadProfile(data.session.user.id);
    } else {
      profile.value = null;
    }

    if (!authListenerReady) {
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session.value = newSession ?? null;

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          profile.value = null;
        }
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
  };
};
