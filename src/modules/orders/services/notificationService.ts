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
  try {
    // 1. Fetch customer email from profiles table in Supabase
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      console.error("[Email Gateway] Error fetching customer profile:", error);
      return { success: false, error: `Gagal mengambil profil database: ${error.message}` };
    }

    if (!profile || !profile.email) {
      console.warn(`[Email Gateway] Customer profile or email not found for ID: ${customerId}`);
      return { success: false, error: "Email pelanggan tidak ditemukan di tabel profiles" };
    }

    const email = profile.email;
    let subject = "";
    let htmlContent = "";

    // 2. Draft email content based on order status
    if (status === "dikirim") {
      subject = "Pesanan Air BWJ Kamu Sedang Dikirim! 🚛💨";
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; margin-top: 0;">Halo ${customerName},</h2>
          <p>Pesanan air BWJ kamu sedang <strong style="color: #2563eb;">DALAM PERJALANAN</strong>. Supir kami sedang menuju lokasimu! 🚛💨</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">Terima kasih,<br><strong>Admin BWJ Tracking</strong></p>
        </div>
      `;
    } else if (status === "selesai") {
      subject = "Pesanan Air BWJ Kamu Telah Selesai! 🙌";
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; margin-top: 0;">Halo ${customerName},</h2>
          <p>Pesanan air BWJ kamu telah <strong style="color: #16a34a;">SELESAI</strong> dikirim. Terima kasih telah menggunakan layanan kami! 🙌</p>
          <p>Jangan lupa berikan ulasan pelayanan kami melalui dashboard pelanggan ya.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">Terima kasih,<br><strong>Admin BWJ Tracking</strong></p>
        </div>
      `;
    } else {
      subject = `Update Status Pesanan Air BWJ: ${status.toUpperCase()}`;
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <h2 style="color: #0f172a; margin-top: 0;">Halo ${customerName},</h2>
          <p>Status pesanan air BWJ kamu saat ini: <strong style="color: #475569;">${status.toUpperCase()}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">Terima kasih,<br><strong>Admin BWJ Tracking</strong></p>
        </div>
      `;
    }

    console.log(`[Email Gateway] Sending via Supabase Edge Function to ${email}`);

    // 3. Call Supabase Edge Function (server-side, no CORS issue)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const fromEmail = import.meta.env.VITE_EMAIL_FROM || "onboarding@resend.dev";
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${accessToken || supabaseAnonKey}`,
      },
      body: JSON.stringify({
        from: `BWJ Tracking <${fromEmail}>`,
        to: email,
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const errJson = JSON.parse(errorText);
        parsedError = errJson.error || errJson.message || errorText;
      } catch {
        // use raw text
      }
      console.error("[Email Gateway] Edge Function error:", errorText);
      return { success: false, email, error: `Edge Function Error: ${parsedError}` };
    }

    const data = await response.json();
    console.log("[Email Gateway] Edge Function success:", data);
    return { success: true, email };
  } catch (error) {
    console.error("[Email Gateway] Exception occurred:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};
