export type OrderStatus = "menunggu" | "menunggu_persetujuan" | "diproses" | "dikirim" | "selesai" | "batal";
export type PaymentMethod = "transfer" | "cash";
export type PaymentStatus = "belum_bayar" | "menunggu_verifikasi" | "lunas";

export type Order = {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  address: string;
  schedule_at: string | null;
  volume: string;
  notes: string | null;
  status: OrderStatus;
  truck_id: string | null;
  assigned_driver_id: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  customer_lat: number | null;
  customer_lng: number | null;
  proof_url: string | null;
  rating: number | null;
  review: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_url: string | null;
  payment_verified_at: string | null;
  payment_verified_by: string | null;
  payment_amount: number;
  created_at: string;
  updated_at: string;
};

export type NewOrder = Omit<Order, "id" | "created_at" | "updated_at">;
