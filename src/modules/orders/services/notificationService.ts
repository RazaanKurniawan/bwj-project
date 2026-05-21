export const sendWhatsAppNotification = async (
  phone: string,
  customerName: string,
  status: string
): Promise<boolean> => {
  let message = "";
  if (status === "dikirim") {
    message = `Halo *${customerName}*,\n\nPesanan air BWJ kamu sedang *DALAM PERJALANAN*. Supir kami sedang menuju lokasimu! 🚛💨\n\nTerima kasih,\n*Admin BWJ Tracking*`;
  } else if (status === "selesai") {
    message = `Halo *${customerName}*,\n\nPesanan air BWJ kamu telah *SELESAI* dikirim. Terima kasih telah menggunakan layanan kami! 🙌\n\nJangan lupa berikan ulasan pelayanan kami melalui dashboard pelanggan ya.\n\nTerima kasih,\n*Admin BWJ Tracking*`;
  } else {
    message = `Halo *${customerName}*,\n\nStatus pesanan air BWJ kamu saat ini: *${status.toUpperCase()}*.\n\nTerima kasih,\n*Admin BWJ Tracking*`;
  }

  // Format nomor HP agar diawali dengan 62 (Kode Negara Indonesia)
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "62" + formattedPhone.substring(1);
  }

  try {
    const formData = new FormData();
    formData.append("target", formattedPhone);
    formData.append("message", message);
    formData.append("delay", "2");

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: "Xp6TtZzZS4iRDth2nbyx",
      },
      body: formData,
    });

    const data = await response.json();
    console.log("[WA Gateway] Response:", data);
    return data.status === true;
  } catch (error) {
    console.error("[WA Gateway] Error:", error);
    return false;
  }
};
