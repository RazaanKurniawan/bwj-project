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

export const checkEmailExists = async (email: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("check_email_exists", {
    target_email: email,
  });
  if (error) {
    console.warn("check_email_exists RPC failed:", error.message);
    // If the RPC doesn't exist yet, fall back to allowing the request
    return true;
  }
  return data === true;
};

export const resetPasswordForEmail = (email: string, redirectTo?: string) => {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
};

export const verifyOtp = (email: string, token: string, type: 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change') => {
  return supabase.auth.verifyOtp({ email, token, type });
};

export const resendOtp = (email: string) => {
  return supabase.auth.resend({ type: 'signup', email });
};
