import { supabase } from "../../core/supabaseClient";
import type { NewOrder, Order, OrderStatus } from "../types";

const ORDER_FIELDS = "*";

export const createOrder = async (payload: NewOrder) => {
  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select(ORDER_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Gagal membuat pesanan: tidak ada data yang dikembalikan.");
  }

  return data as Order;
};

export const fetchCustomerOrders = async (customerId: string, status?: string) => {
  let query = supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("customer_id", customerId);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Order[];
};

export const fetchDriverOrders = async (driverId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("assigned_driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Order[];
};

export const fetchAvailableOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .is("assigned_driver_id", null)
    .eq("status", "menunggu")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Order[];
};

export const fetchAllOrders = async () => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Order[];
};

export const fetchOrderById = async (orderId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Order | null;
};

export const updateOrder = async (orderId: string, patch: Partial<Order>) => {
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select(ORDER_FIELDS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Gagal update pesanan: order tidak ditemukan.");
  }

  return data as Order;
};

export const updateOrderStatus = (orderId: string, status: OrderStatus) => {
  return updateOrder(orderId, { status });
};

export const updateOrderLocation = (
  orderId: string,
  lat: number,
  lng: number,
  accuracy: number | null
) => {
  return updateOrder(orderId, { lat, lng, accuracy });
};

export const claimOrder = (orderId: string, driverId: string) => {
  return updateOrder(orderId, { assigned_driver_id: driverId, status: "dikirim" });
};

export const deleteOrder = async (orderId: string) => {
  const { data, error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .select("id");

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("Gagal menghapus: Akses ditolak oleh database (RLS Policy), atau pesanan tidak ditemukan.");
  }
};

export const uploadProof = async (orderId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${orderId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('proofs')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('proofs').getPublicUrl(filePath);
  
  return updateOrder(orderId, { proof_url: data.publicUrl, status: 'selesai' });
};

export const submitReview = (orderId: string, rating: number, review: string | null) => {
  return updateOrder(orderId, { rating, review });
};

export const subscribeOrder = (orderId: string, handler: (order: Order) => void) => {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
      (payload) => {
        handler(payload.new as Order);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
