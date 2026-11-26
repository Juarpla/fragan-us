import type { OrderItem } from './db';
import type { DocumentType } from './checkout-document';

export const reservationMinutes = 15;

export const orderStages = [
  { id: 'PENDING_VERIFICATION', label: 'Por confirmar' },
  { id: 'PACKING', label: 'En preparación' },
  { id: 'SHIPPED', label: 'Enviados' },
] as const;

export const orderStatusLabel: Record<string, string> = {
  PENDING_CONFIRMATION: 'Solicitud registrada',
  AWAITING_PAYMENT: 'Pago pendiente',
  EXPIRED: 'Reserva vencida',
  PENDING_VERIFICATION: 'Por confirmar',
  PAID: 'En preparación',
  PACKING: 'En preparación',
  SHIPPED: 'Enviado',
  CANCELLED: 'Cancelado',
};

export interface OrderRow {
  order_code: string;
  customer_name: string;
  customer_phone: string;
  document_type: DocumentType | null;
  document_number: string | null;
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
  receipt_submitted_at: string | null;
  preparation_started_at: string | null;
  shipped_at: string | null;
  shipping_receipt_key: string | null;
  pickup_password: string | null;
  archive_at: string | null;
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
