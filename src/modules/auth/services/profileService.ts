import { supabase } from "../../core/supabaseClient";
import type { Profile } from "../types";

const PROFILE_FIELDS = "id, name, phone, role";

export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
};

export const upsertProfile = async (profile: Profile) => {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select(PROFILE_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
};

export const fetchDrivers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("role", "driver")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Profile[];
};
