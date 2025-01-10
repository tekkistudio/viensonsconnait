// src/features/home/components/sections/FAQSection.tsx
"use client"

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Quel type de cartes puis-je trouver dans le jeu pour les couples?",
    answer: `Le jeu contient plusieurs types de cartes conçues pour enrichir votre relation :
    - Des questions pour mieux connaître votre partenaire
    - Des sujets de conversation profonds
    - Des scénarios de réflexion
    - Des défis ludiques pour le couple`
  },
  {
    question: "Le jeu pour les couples convient-il aux couples non mariés ?",
    answer: "Oui, absolument ! Le jeu est spécialement conçu pour les couples non mariés. Il aborde des sujets adaptés aux différentes étapes de la relation et permet d'approfondir la connaissance mutuelle."
  },
  {
    question: "Comment puis-je acheter \"Viens on s'connaît\" ?",
    answer: "Vous pouvez acheter nos jeux directement sur notre site web avec paiement par Orange Money, Wave ou en espèces à la livraison. Nous livrons partout au Sénégal et en Afrique de l'Ouest."
  },
  {
    question: "Puis-je payer à la livraison?",
    answer: "Oui, le paiement à la livraison est disponible à Dakar et sa banlieue. Pour les autres régions, nous privilégions le paiement mobile (Orange Money, Wave) avant expédition."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-brand-blue mb-4">
          Questions Fréquentes
        </h2>
        <p className="text-gray-600 mb-8">
          Nous avons rassemblé ci-dessous les questions les plus fréquemment 
          posées par notre communauté. Parcourez-les pour trouver 
          rapidement les informations dont vous avez besoin.
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-brand-white rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-4 pb-4">
                  <p className="text-gray-600 whitespace-pre-line">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>Notre service client est disponible du Lundi au Samedi, de 9h à 18h</p>
          <p>Temps moyen de réponse : 1 heure</p>
        </div>
      </div>
    </section>
  );
}

export default FAQSection;