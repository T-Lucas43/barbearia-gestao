export type Professional = {
  id: string;
  name: string;
  specialty: string;
  color: string;
  commission_bps?: number;
  active?: boolean;
  commission_kind?: "percent" | "fixed";
  commission_fixed?: number;
};
export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  active?: boolean;
  commission_bps?: number | null;
};
export type Appointment = {
  id: string;
  professional_id: string;
  professional_name: string;
  color: string;
  service_name: string;
  customer: string;
  phone: string;
  starts_at: string;
  ends_at: string;
  price: number;
  commission: number;
  status: string;
  paid: number;
  list_price?: number;
  discount?: number;
  source?: "booking" | "walk_in";
  consent?: boolean;
  schedule_version?: number;
};
export type Data = {
  platformAdmin?: boolean;
  subscription?: {
    state: string;
    billing_enforced: boolean;
    plan_name: string;
    period_end: string | null;
  };
  role: string;
  readOnly?: boolean;
  isDemo?: boolean;
  whatsappEnabled?: boolean;
  name: string;
  tenant: {
    name: string;
    slug: string;
    address: string;
    phone: string;
    cancellation_minutes: number;
    reminder_minutes: number;
  };
  finance: {
    shopShare: number;
    received: number;
    tips: number;
    fees: number;
    commissions: number;
    tipsReleased: number;
    expenses: number;
    result: number | null;
  } | null;
  professionalId: string | null;
  professionals: Professional[];
  services: Service[];
  appointments: Appointment[];
  expenses: {
    id: string;
    description: string;
    amount: number;
    paid_at: string;
  }[];
  payouts: {
    id: string;
    professional_id: string;
    amount: number;
    created_at: string;
  }[];
  notifications: {
    id: string;
    customer: string;
    kind: string;
    status: string;
    due_at: string;
    last_error?: string;
    professional_id?: string;
  }[];
  totals: {
    service_total: number;
    service_received: number;
    shop_generated: number;
    shop_released: number;
    professional_id: string;
    earned: number;
    generated: number;
    released: number;
    tips: number;
    paid: number;
    advances: number;
    available: number;
  }[];
};
