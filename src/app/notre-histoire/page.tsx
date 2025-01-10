import { Metadata } from "next";
import NotreHistoire from "../../features/about/components/NotreHistoire";

export const metadata: Metadata = {
  title: "Notre Histoire | VIENS ON S'CONNAÎT",
  description:
    "Découvrez l'histoire de VIENS ON S'CONNAÎT, une marque de jeux de cartes créée au Sénégal pour renforcer les relations humaines.",
};

export default function NotreHistoirePage() {
  return <NotreHistoire />;
}