import { z } from "zod";

export const createOrderInput = z.object({
  candle_id: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(100),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().max(30).optional().nullable(),
  tribute_name: z.string().trim().min(2).max(100),
  tribute_message: z.string().trim().max(500).optional().nullable(),
  tribute_photo_url: z.string().url().max(2000).optional().nullable(),
  tribute_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  tribute_death_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  payment_method: z.enum(["checkout"]).default("checkout").optional(),
});

export const createRenewalInput = z.object({
  tribute_id: z.string().uuid(),
  candle_id: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(100).optional().nullable(),
  customer_email: z.string().trim().email().max(255).optional().nullable(),
});

export const uploadPhotoInput = z.object({
  filename: z.string().trim().min(1).max(120),
  content_type: z.string().trim().regex(/^image\/(jpeg|jpg|png|webp)$/i),
  data_base64: z.string().min(10).max(8_000_000),
});

const mercadoPagoId = z.coerce.string().trim().min(1).max(80).optional().nullable();

export const orderStatusInput = z.object({
  order_id: z.string().uuid(),
  payment_id: mercadoPagoId,
  collection_id: mercadoPagoId,
  merchant_order_id: mercadoPagoId,
});

export type CreateOrderInput = z.infer<typeof createOrderInput>;
export type CreateRenewalInput = z.infer<typeof createRenewalInput>;
export type UploadPhotoInput = z.infer<typeof uploadPhotoInput>;
export type OrderStatusInput = z.infer<typeof orderStatusInput>;