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

export interface ProfileFilters {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

export const fetchProfilesPaginated = async (
  page: number,
  limit: number,
  filters: ProfileFilters = {}
) => {
  let query = supabase.from("profiles").select(PROFILE_FIELDS, { count: "exact" });

  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.name) {
    query = query.ilike("name", `%${filters.name}%`);
  }
  if (filters.email) {
    query = query.ilike("email", `%${filters.email}%`);
  }
  if (filters.phone) {
    query = query.ilike("phone", `%${filters.phone}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .range(from, to)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return { data: (data ?? []) as Profile[], count: count ?? 0 };
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
  // We call a secure RPC function to delete the user from auth.users
  // This will also cascade and delete the profile from public.profiles
  const { error } = await supabase.rpc("delete_user_by_admin", {
    target_user_id: userId
  });

  if (error) {
    throw error;
  }
};
