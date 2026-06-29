const DEPOT_LAT = -6.432513175969628;
const DEPOT_LNG = 106.88722928789123;

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getPricePerTank = (volume: string) => {
  return volume === "Air Minum" ? 90000 : 100000;
};

export const formatRupiah = (num: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
};

export const calculateOrderTotal = (
  volume: string,
  customerLat: number | null,
  customerLng: number | null
) => {
  const base = getPricePerTank(volume);
  if (customerLat && customerLng) {
    const dist = calculateDistance(DEPOT_LAT, DEPOT_LNG, customerLat, customerLng);
    const delivery = Math.round(dist * 5000);
    return base + delivery;
  }
  return base;
};
