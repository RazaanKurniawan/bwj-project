export type OrderStatus = "menunggu" | "menunggu_persetujuan" | "diproses" | "dikirim" | "selesai" | "batal";

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
  created_at: string;
  updated_at: string;
};

export type NewOrder = Omit<Order, "id" | "created_at" | "updated_at">;
