// src/features/home/components/mobile/MobileWhyUsSection.tsx - VERSION OPTIMISÉE THÈMES
"use client"

import { motion } from 'framer-motion';
import { MessageCircle, Heart, Users, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';

const benefits = [
  {
    icon: MessageCircle,
    title: "Conversations Significatives",
    description: "Dépassez les bavardages superficiels et créez des échanges profonds qui renforcent vos liens."
  },
  {
    icon: Heart,
    title: "Relations Plus Fortes",
    description: "Tissez des liens durables avec vos proches grâce à une meilleure compréhension mutuelle."
  },
  {
    icon: Users,
    title: "Moments de Connexion",
    description: "Transformez vos soirées en instants inoubliables de partage et de découverte."
  },
  {
    icon: Lightbulb,
    title: "Découvertes Surprenantes",
    description: "Apprenez des choses étonnantes sur les personnes que vous pensez le mieux connaître."
  }
];

export default function MobileWhyUsSection() {
  const router = useRouter();

  const handleDiscoverGames = () => {
    router.push('/nos-jeux');
  };

  return (
    <section className="bg-theme-primary py-16 transition-colors duration-300">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-theme-primary mb-4">
            Pourquoi Jouer à Nos Jeux ?
          </h2>
          <p className="text-theme-secondary text-lg leading-relaxed max-w-2xl mx-auto">
            Nos jeux de cartes ne sont pas comme les autres. Ils sont spécialement conçus 
            pour créer des moments authentiques de connexion avec vos proches.
          </p>
        </motion.div>

        <div className="bg-theme-secondary/5 dark:bg-theme-card rounded-3xl p-6 backdrop-blur-sm border border-theme transition-colors duration-300">
          <div className="grid grid-cols-1 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="bg-theme-card hover:bg-theme-secondary/10 rounded-2xl p-6 transition-all duration-300 border border-theme shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-brand-pink rounded-full p-3 flex-shrink-0 shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-theme-primary font-semibold text-lg mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-theme-secondary leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-theme-secondary text-sm mb-6">
            Plus de 7 000 personnes nous font déjà confiance
          </p>
          <div className="flex justify-center">
            <button 
              onClick={handleDiscoverGames}
              className="bg-gradient-to-r from-brand-pink to-red-500 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95"
            >
              Découvrir Nos Jeux
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}