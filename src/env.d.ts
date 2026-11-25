interface StoreEnv {
  DB?: D1Database;
  RECEIPTS_BUCKET?: R2Bucket;
  DEMO_MODE?: string;
  STOREFRONT_PREVIEW?: string;
  PAYMENT_PHONE?: string;
  SUPPORT_WHATSAPP?: string;
  ADMIN_LOGIN_LIMIT?: RateLimit;
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

declare namespace App {
  interface Locals {
    cfContext: ExecutionContext;
  }
}
