// src/features/home/components/sections/TestimonialsSection.tsx
"use client"

import Link from 'next/link';

const testimonials = [
  {
    letter: "M",
    name: "Mariama S.",
    status: "Couple depuis 3 ans",
    text: "Ce jeu a vraiment transformé nos soirées. Nous avons découvert tellement de choses l'un sur l'autre ! Les questions sont pertinentes et nous permettent d'avoir des conversations profondes que nous n'aurions peut-être jamais eues autrement.",
    rating: 5
  },
  {
    letter: "A",
    name: "Abdou K.",
    status: "Couple depuis 1 an",
    text: "Au début, on était un peu sceptiques, mais dès la première utilisation, on a été conquis ! Les cartes nous aident à aborder naturellement des sujets importants. C'est devenu notre rituel du weekend.",
    rating: 5
  },
  {
    letter: "F",
    name: "Fatou D.",
    status: "Couple depuis 2 ans",
    text: "Un excellent investissement pour notre couple ! Les questions sont bien pensées et nous permettent d'avoir des discussions enrichissantes. Je le recommande à tous les couples qui veulent approfondir leur relation.",
    rating: 5
  }
];

export function TestimonialsSection() {
  return (
    <section className="w-full bg-brand-white py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-brand-blue mb-4">
          Ce que disent nos clients
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-3xl mx-auto">
          Découvrez les témoignages de gens qui ont renforcé leurs relations grâce à nos jeux.
        </p>

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex-1 bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-brand-blue w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl font-bold">
                      {testimonial.letter}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-brand-blue">
                      {testimonial.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {testimonial.status}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4 line-clamp-4">
                  {testimonial.text}
                </p>
                <div className="flex text-brand-pink">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/temoignages"
            className="inline-flex items-center px-6 py-3 bg-brand-blue text-white rounded-lg hover:bg-brand-pink transition-colors"
          >
            Voir plus de témoignages
          </Link>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;