import { useCountryStore } from "@/core/hooks/useCountryStore";

export function formatPrice(amount: number, currencyCode?: string): string {
  const { currentCountry, convertPrice } = useCountryStore.getState();
  
  if (!currentCountry) {
    return `${amount.toLocaleString()} FCFA`;
  }

  const { value, formatted } = convertPrice(amount);
  return formatted;
}

export function calculateOrderTotal(
  items: Array<{ price: number; quantity: number }>,
  city: string
): {
  subtotal: number;
  deliveryCost: number;
  total: number;
  formatted: string;
} {
  const subtotal = items.reduce((acc, item) => {
    let itemTotal = 0;
    if (item.quantity >= 4) {
      itemTotal = item.price * item.quantity * 0.8; // -20%
    } else if (item.quantity === 3) {
      itemTotal = 35700; // Prix fixe pour 3
    } else if (item.quantity === 2) {
      itemTotal = 25200; // Prix fixe pour 2
    } else {
      itemTotal = item.price * item.quantity;
    }
    return acc + itemTotal;
  }, 0);

  const deliveryCost = city.toLowerCase() === 'dakar' ? 0 : 3000;
  const total = subtotal + deliveryCost;

  return {
    subtotal,
    deliveryCost,
    total,
    formatted: formatPrice(total)
  };
}