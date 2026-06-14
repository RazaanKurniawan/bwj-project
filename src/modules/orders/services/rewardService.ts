import { supabase } from "../../core/supabaseClient";

export interface RewardMilestone {
  id: string;
  target: number;
  name: string;
  emoji: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
}

export type ClaimStatus = "pending" | "approved" | "rejected";

export interface RewardClaim {
  id: string;
  milestoneId: string;
  milestoneName: string;
  claimedAt: string;
  orderCountAtClaim: number;
  status: ClaimStatus;
  adminNotes?: string;
  reviewedAt?: string;
}

/**
 * DB row shape from Supabase `reward_claims` table.
 */
export interface RewardClaimRow {
  id: string;
  customer_id: string;
  milestone_id: string;
  milestone_name: string;
  claimed_at: string;
  order_count_at_claim: number;
  status: ClaimStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
}

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    id: "kipas-kecil",
    target: 15,
    name: "Kipas Kecil",
    emoji: "🌀",
    description: "Kipas angin kecil portable untuk kesejukan sehari-hari",
    tier: "bronze",
  },
  {
    id: "kipas-besar",
    target: 25,
    name: "Kipas Besar",
    emoji: "🌬️",
    description: "Kipas angin besar berdiri untuk rumah atau kantor",
    tier: "silver",
  },
  {
    id: "free-tangki",
    target: 90,
    name: "Free 1 Tangki Air",
    emoji: "💧",
    description: "Gratis 1 tangki air untuk pesanan berikutnya!",
    tier: "gold",
  },
  {
    id: "hape-android",
    target: 250,
    name: "Free Hape Android",
    emoji: "📱",
    description: "Smartphone Android terbaru gratis untuk kamu!",
    tier: "platinum",
  },
  {
    id: "kulkas",
    target: 300,
    name: "Kulkas",
    emoji: "🧊",
    description: "Kulkas 2 pintu berkualitas untuk keluarga tercinta",
    tier: "diamond",
  },
];

const STORAGE_KEY_PREFIX = "bwj_rewards_";

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export interface CustomerRewardData {
  accumulatedOrders: number;
  totalCompletedOrders: number;
  claims: RewardClaim[];
}

/**
 * Convert a DB row to the frontend RewardClaim interface.
 */
function rowToClaim(row: RewardClaimRow): RewardClaim {
  return {
    id: row.id,
    milestoneId: row.milestone_id,
    milestoneName: row.milestone_name,
    claimedAt: row.claimed_at,
    orderCountAtClaim: row.order_count_at_claim,
    status: row.status,
    adminNotes: row.admin_notes ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

/**
 * Fetch the total number of completed (selesai) orders for a customer from Supabase.
 */
export const fetchCompletedOrderCount = async (customerId: string): Promise<number> => {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "selesai");

  if (error) {
    console.error("Error fetching completed order count:", error);
    return 0;
  }

  // MOCK UNTUK TESTING: Tambahkan otomatis 250 pesanan agar tidak perlu membuat pesanan manual
  return (count ?? 0) + 250;
};

/**
 * Fetch claims from Supabase for a customer. If local storage has claims not in DB, migrate them.
 */
export const fetchClaimsFromDB = async (customerId: string): Promise<RewardClaim[]> => {
  const { data, error } = await supabase
    .from("reward_claims")
    .select("*")
    .eq("customer_id", customerId)
    .order("claimed_at", { ascending: true });

  let dbClaims: RewardClaim[] = [];
  
  if (!error && data) {
    dbClaims = data.map(rowToClaim);
  }

  // Check localStorage for old claims to migrate
  const key = getStorageKey(customerId);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as CustomerRewardData;
      const localClaims = parsed.claims || [];
      
      // Filter claims that are not yet in DB (based on milestoneId or timestamp)
      const unmigratedClaims = localClaims.filter(
        lc => !dbClaims.some(dbc => dbc.milestoneId === lc.milestoneId)
      );

      if (unmigratedClaims.length > 0) {
        console.log(`Migrating ${unmigratedClaims.length} old claims for user ${customerId} to DB...`);
        // Attempt to insert them into DB
        for (const claim of unmigratedClaims) {
          const { data: inserted, error: insertError } = await supabase
            .from("reward_claims")
            .insert({
              customer_id: customerId,
              milestone_id: claim.milestoneId,
              milestone_name: claim.milestoneName,
              order_count_at_claim: claim.orderCountAtClaim || 0,
              status: claim.status || "pending",
              claimed_at: claim.claimedAt || new Date().toISOString()
            })
            .select("*")
            .maybeSingle();
            
          if (!insertError && inserted) {
            dbClaims.push(rowToClaim(inserted as RewardClaimRow));
          }
        }
        
        // Update local storage to clear old unmigrated state or just leave it
        // The next syncRewardData will overwrite localStorage anyway with the full DB truth
      }
    } catch (e) {
      console.warn("Failed to migrate local claims:", e);
    }
  }

  return dbClaims.sort((a, b) => new Date(a.claimedAt).getTime() - new Date(b.claimedAt).getTime());
};

/**
 * Get the customer's reward data from localStorage.
 * This includes accumulated orders and claim history.
 */
export const getCustomerRewardData = (userId: string): CustomerRewardData => {
  const key = getStorageKey(userId);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as CustomerRewardData;
    } catch {
      // corrupted data, reset
    }
  }
  return {
    accumulatedOrders: 0,
    totalCompletedOrders: 0,
    claims: [],
  };
};

/**
 * Save customer reward data to localStorage.
 */
export const saveCustomerRewardData = (userId: string, data: CustomerRewardData): void => {
  const key = getStorageKey(userId);
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * Sync the accumulated order count with the actual completed orders from Supabase.
 * Formula: accumulated = totalCompleted - sumOfOrderCountsAtEachClaim
 */
export const syncRewardData = async (userId: string): Promise<CustomerRewardData> => {
  const totalCompleted = await fetchCompletedOrderCount(userId);
  const claims = await fetchClaimsFromDB(userId);

  // Calculate the total orders that were "consumed" by claims
  const totalConsumed = claims.reduce(
    (sum, claim) => sum + claim.orderCountAtClaim,
    0
  );

  const accumulated = Math.max(0, totalCompleted - totalConsumed);

  const updated: CustomerRewardData = {
    accumulatedOrders: accumulated,
    totalCompletedOrders: totalCompleted,
    claims,
  };

  saveCustomerRewardData(userId, updated);
  return updated;
};

/**
 * Claim a reward. This saves the claim to Supabase and resets accumulated orders to 0.
 */
export const claimReward = async (
  userId: string,
  milestone: RewardMilestone
): Promise<CustomerRewardData> => {
  // Re-sync first to get the latest data
  const current = await syncRewardData(userId);

  if (current.accumulatedOrders < milestone.target) {
    throw new Error("Jumlah pesanan belum mencukupi untuk klaim hadiah ini.");
  }

  // Save claim to Supabase
  const { data: insertedRow, error } = await supabase
    .from("reward_claims")
    .insert({
      customer_id: userId,
      milestone_id: milestone.id,
      milestone_name: milestone.name,
      order_count_at_claim: current.accumulatedOrders,
      status: "pending",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Error saving claim to DB:", error);
    // Fallback: save locally
    const newClaim: RewardClaim = {
      id: `claim-${Date.now()}`,
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      claimedAt: new Date().toISOString(),
      orderCountAtClaim: current.accumulatedOrders,
      status: "pending",
    };

    const updated: CustomerRewardData = {
      ...current,
      accumulatedOrders: 0,
      claims: [...current.claims, newClaim],
    };

    saveCustomerRewardData(userId, updated);
    return updated;
  }

  const newClaim = rowToClaim(insertedRow as RewardClaimRow);

  const updated: CustomerRewardData = {
    ...current,
    accumulatedOrders: 0,
    claims: [...current.claims, newClaim],
  };

  saveCustomerRewardData(userId, updated);
  return updated;
};

/**
 * Get the list of unlocked milestones based on accumulated orders.
 */
export const getUnlockedMilestones = (accumulatedOrders: number): RewardMilestone[] => {
  return REWARD_MILESTONES.filter((m) => accumulatedOrders >= m.target);
};

/**
 * Get the next upcoming milestone.
 */
export const getNextMilestone = (accumulatedOrders: number): RewardMilestone | null => {
  const next = REWARD_MILESTONES.find((m) => m.target > accumulatedOrders);
  return next ?? null;
};

// ─── ADMIN FUNCTIONS ──────────────────────────────────────────────────────

export interface AdminRewardClaim extends RewardClaim {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalCompletedOrders: number;
}

/**
 * Fetch ALL reward claims from Supabase for admin view, joined with customer profiles.
 */
export const fetchAllRewardClaims = async (): Promise<AdminRewardClaim[]> => {
  const { data: claims, error } = await supabase
    .from("reward_claims")
    .select("*")
    .order("claimed_at", { ascending: false });

  if (error) {
    console.error("Error fetching all reward claims:", error);
    return [];
  }

  if (!claims || claims.length === 0) return [];

  // Collect unique customer IDs
  const customerIds = [...new Set(claims.map((c: RewardClaimRow) => c.customer_id))];

  // Fetch profiles for these customers
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, phone")
    .in("id", customerIds);

  const profileMap = new Map<string, { name: string; phone: string }>();
  (profiles ?? []).forEach((p: { id: string; name: string | null; phone: string | null }) => {
    profileMap.set(p.id, { name: p.name ?? "Unknown", phone: p.phone ?? "-" });
  });

  // Fetch completed order counts for each customer
  const orderCounts = new Map<string, number>();
  for (const cid of customerIds) {
    const count = await fetchCompletedOrderCount(cid);
    orderCounts.set(cid, count);
  }

  return claims.map((row: RewardClaimRow) => {
    const profile = profileMap.get(row.customer_id);
    return {
      ...rowToClaim(row),
      customerId: row.customer_id,
      customerName: profile?.name ?? "Unknown",
      customerPhone: profile?.phone ?? "-",
      totalCompletedOrders: orderCounts.get(row.customer_id) ?? 0,
    };
  });
};

/**
 * Admin: Update the status of a reward claim (approve/reject).
 */
export const updateClaimStatus = async (
  claimId: string,
  status: ClaimStatus,
  adminNotes?: string
): Promise<void> => {
  const patch: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (adminNotes !== undefined) {
    patch.admin_notes = adminNotes;
  }

  const { error } = await supabase
    .from("reward_claims")
    .update(patch)
    .eq("id", claimId);

  if (error) {
    throw new Error(`Gagal update status klaim: ${error.message}`);
  }
};
