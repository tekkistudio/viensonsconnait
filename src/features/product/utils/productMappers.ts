// src/features/product/utils/productMappers.ts
import type { Product } from '@/types/product';
import type { OrderItem } from '../../../types/chat';

export const mapProductToOrderItem = (product: Product): OrderItem => ({
  productId: product.id,
  name: product.name,
  price: product.price,
  quantity: 1,
  totalPrice: product.price
});

export const getProductFromOrderItem = (orderItem: OrderItem, products: Record<string, Product>): Product => {
  const product = products[orderItem.productId];
  if (!product) {
    throw new Error(`Product not found for order item: ${orderItem.productId}`);
  }
  return product;
};
