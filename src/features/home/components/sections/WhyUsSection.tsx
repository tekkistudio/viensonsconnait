// src/features/home/components/sections/WhyUsSection.tsx
"use client"

import { Trophy, Heart, Star } from 'lucide-react';

const stats = [
  {
    number: "4 217",
    label: "Jeux vendus",
    sublabel: "la première année d'existence de notre marque",
    icon: Trophy,
    bgColor: "bg-brand-blue",
    textColor: "text-brand-blue"
  },
  {
    number: "+5 000",
    label: "Personnes",
    sublabel: "dans le monde solidifient leurs liens grâce à nos jeux",
    icon: Heart,
    bgColor: "bg-brand-pink",
    textColor: "text-brand-pink"
  },
  {
    number: "98%",
    label: "de nos clients",
    sublabel: "sont satisfaits de nos jeux et les recommandent",
    icon: Star,
    bgColor: "bg-brand-blue",
    textColor: "text-brand-blue"
  }
];

export function WhyUsSection() {
  return (
    <section className="w-full bg-white py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-brand-blue mb-4">
            Pourquoi VIENS ON S'CONNAÎT ?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Découvrez ce qui rend nos jeux uniques et pourquoi des milliers de 
            personnes nous font confiance pour renforcer leurs relations.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:justify-between gap-8">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex-1 text-center p-6 bg-gray-50 rounded-lg transition-all hover:-translate-y-1"
                >
                  <div className={`w-16 h-16 ${stat.bgColor} rounded-full mx-auto mb-6 flex items-center justify-center`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className={`text-4xl font-bold ${stat.textColor} mb-2`}>
                    {stat.number}
                  </div>
                  <div className="text-xl font-medium text-brand-blue mb-2">
                    {stat.label}
                  </div>
                  <p className="text-gray-600">
                    {stat.sublabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyUsSection;