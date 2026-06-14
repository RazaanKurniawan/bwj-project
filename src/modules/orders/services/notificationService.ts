import { supabase } from "../../core/supabaseClient";

export type EmailNotificationResult = {
  success: boolean;
  email?: string;
  error?: string;
};

export const sendEmailNotification = async (
  customerId: string,
  customerName: string,
  status: string
): Promise<EmailNotificationResult> => {
  // Feature disabled for now as notification services are paid
  console.log(`[Email Gateway] Notifikasi dinonaktifkan sementara. Skip kirim email untuk ${customerName} (${status}).`);
  return { success: true, email: "disabled@example.com" };
};
