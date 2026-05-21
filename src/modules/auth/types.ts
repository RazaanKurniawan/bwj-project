export type UserRole = "customer" | "driver" | "admin";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
};
