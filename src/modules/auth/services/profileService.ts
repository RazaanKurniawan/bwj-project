import { supabase } from "../../core/supabaseClient";
import type { Profile } from "../types";

const PROFILE_FIELDS = "id, name, email, phone, role";

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
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Gagal menyimpan profil.");
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

export const fetchAllProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Profile[];
};

export const updateProfile = async (userId: string, patch: Partial<Omit<Profile, "id">>) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select(PROFILE_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Gagal update profil: user tidak ditemukan.");
  }

  return data as Profile;
};

export const deleteProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("Gagal menghapus: Akses ditolak (RLS Policy), atau user tidak ditemukan.");
  }
};
