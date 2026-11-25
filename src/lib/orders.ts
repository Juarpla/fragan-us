import type { OrderItem } from './db';

export const statusLabel: Record<string, string> = {
  PENDING_CONFIRMATION: 'Por confirmar',
  AWAITING_PAYMENT: 'En espera de pago',
  PENDING_VERIFICATION: 'Pendiente de verificación',
  PAID: 'Pago aprobado',
  SHIPPED: 'Pedido enviado',
  CANCELLED: 'Pedido cancelado',
};

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

export const isPayable = (order: Pick<OrderRow, 'status' | 'is_demo'>, mode: string) =>
  order.status === 'AWAITING_PAYMENT' && (order.is_demo ? mode === 'demo' : mode === 'live');

export const orderItems = (snapshot: string): OrderItem[] => JSON.parse(snapshot);
