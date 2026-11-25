import type { OrderItem } from './db';

export const statusLabel: Record<string, string> = {
  PENDING_VERIFICATION: 'Por verificar',
  PAID: 'Pagados',
  PACKING: 'En preparación',
  AWAITING_PAYMENT: 'En espera de pago',
  PENDING_CONFIRMATION: 'Solicitudes anteriores',
  EXPIRED: 'Reservas vencidas',
  SHIPPED: 'Pedido enviado',
  CANCELLED: 'Pedido cancelado',
};

export const customerStatusLabel = {
  ...statusLabel,
  PENDING_VERIFICATION: 'Por verificar el pago',
  PAID: 'Pago verificado',
  PENDING_CONFIRMATION: 'Solicitud registrada',
  EXPIRED: 'Reserva vencida',
} as Record<string, string>;

export interface OrderRow {
  order_code: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  shipping_address: string;
  shipping_method: string;
  items_json: string;
  total_cents: number;
  freight_cents: number | null;
  agency_id: number | null;
  destination_ubigeo: string | null;
  whatsapp_offers: number;
  stock_reserved: number;
  reserved_until: string | null;
  payment_method: string | null;
  receipt_r2_key: string | null;
  status: string;
  is_demo: number;
  created_at: string;
}

export interface CartRow {
  session_id: string;
  customer_name: string;
  customer_phone: string;
  items_json: string;
  total_cents: number;
  updated_at: string;
}

type PaymentState = Pick<OrderRow, 'status' | 'is_demo'>;

const matchesMode = (order: PaymentState, mode: string) => order.is_demo ? mode === 'demo' : mode === 'live';

export const isPayable = (order: PaymentState, mode: string) =>
  order.status === 'AWAITING_PAYMENT' && matchesMode(order, mode);

export const canSubmitReceipt = (order: PaymentState, mode: string) =>
  (order.status === 'AWAITING_PAYMENT' || order.status === 'EXPIRED') && matchesMode(order, mode);

export const hasReceipt = (order: Pick<OrderRow, 'receipt_r2_key' | 'status'>) =>
  Boolean(order.receipt_r2_key && ['PENDING_VERIFICATION', 'PAID', 'PACKING', 'SHIPPED'].includes(order.status));

export const expireReservations = (db: D1Database) => db.prepare(`
  UPDATE orders SET status = 'EXPIRED', stock_reserved = 0
  WHERE status = 'AWAITING_PAYMENT' AND reserved_until <= CURRENT_TIMESTAMP
`).run();

export const orderItems = (snapshot: string): OrderItem[] => JSON.parse(snapshot);
