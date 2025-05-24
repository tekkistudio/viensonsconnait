// src/app/(public)/nos-jeux/page.tsx
import { Metadata } from "next";
import { ProductsCollection } from "@/features/product/components/ProductsCollection";

export const metadata: Metadata = {
  title: "Nos Jeux de Cartes | VIENS ON S'CONNAÎT",
  description: "Découvrez notre collection de jeux de cartes conçus pour renforcer vos relations. Des jeux pour couples, familles, amis et collègues.",
};

export default function ProductsPage() {
  return <ProductsCollection />;
}

