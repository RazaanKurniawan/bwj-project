import { supabase } from "../../core/supabaseClient";

export const signInWithEmail = (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = (
  email: string, 
  password: string, 
  meta?: { name?: string; phone?: string; role?: string }
) => {
  return supabase.auth.signUp({ 
    email, 
    password,
    options: meta ? { data: meta } : undefined
  });
};

export const signOut = () => {
  return supabase.auth.signOut();
};

export const updateUserCredentials = (patch: { email?: string; password?: string }) => {
  return supabase.auth.updateUser(patch);
};
