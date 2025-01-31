// lib/validations/order.ts
import { z } from 'zod';

export const orderSchema = z.object({
  product_id: z.string().uuid(),
  customer_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string(),
  payment_method: z.enum(['wave', 'orange_money', 'card', 'cash']),
  total_amount: z.number(),
  delivery_cost: z.number().default(0),
  status: z.enum(['pending', 'confirmed', 'processing', 'delivered', 'cancelled']),
  metadata: z.record(z.any()).optional()
});

export type OrderSchemaType = z.infer<typeof orderSchema>;