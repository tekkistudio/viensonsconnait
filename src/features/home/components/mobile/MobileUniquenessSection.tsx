// src/features/home/components/mobile/MobileUniquenessSection.tsx - VERSION OPTIMISÉE THÈMES
"use client"

import { motion } from 'framer-motion';
import { Trophy, Star, Heart, Target } from 'lucide-react';
import { useEffect, useState } from 'react';

const stats = [
  {
    icon: Trophy,
    number: "+7000",
    label: "Jeux Vendus",
    sublabel: "En seulement 2 ans",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: Heart,
    number: "98%",
    label: "Satisfaction",
    sublabel: "Clients satisfaits",
    color: "from-pink-500 to-red-500"
  },
  {
    icon: Star,
    number: "4.9/5",
    label: "Note Moyenne",
    sublabel: "Sur tous nos jeux",
    color: "from-blue-500 to-indigo-500"
  },
  {
    icon: Target,
    number: "+3",
    label: "Pays Conquis",
    sublabel: "En Afrique et Europe",
    color: "from-green-500 to-emerald-500"
  }
];

export default function MobileUniquenessSection() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <section className="bg-gradient-to-b from-theme-primary to-theme-secondary/5 py-16 transition-colors duration-300">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-theme-primary mb-4">
            Voici Pourquoi Nous Sommes Uniques
          </h2>
          <p className="text-theme-secondary text-lg leading-relaxed max-w-2xl mx-auto">
            VIENS ON S'CONNAÎT révolutionne les relations humaines en Afrique et au-delà. 
            Voici ce qui nous rend spéciaux.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                className="bg-theme-card backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-theme-secondary/10 transition-all border border-theme shadow-sm hover:shadow-lg"
              >
                <div className={`bg-gradient-to-r ${stat.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-theme-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-theme-primary font-semibold mb-1">
                  {stat.label}
                </div>
                <div className="text-theme-secondary text-sm">
                  {stat.sublabel}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Points d'unicité */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="bg-gradient-to-r from-brand-pink/10 to-brand-blue/10 backdrop-blur-sm rounded-2xl p-6 border border-theme transition-colors duration-300"
        >
          <h3 className="text-theme-primary text-xl font-bold mb-6 text-center">
            Notre Secret ? Une Approche 100% Humaine
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0" />
              <p className="text-theme-secondary">
                <strong className="text-theme-primary">Conçu avec l'aide de Psychologues</strong> - Nos jeux reflètent notre passion pour les relations humaines
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0" />
              <p className="text-theme-secondary">
                <strong className="text-theme-primary">Livraison dans +8 pays</strong> - De Dakar à Abidjan, en passant par Paris, nous sommes partout
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0" />
              <p className="text-theme-secondary">
                <strong className="text-theme-primary">Application mobile</strong> - Emportez tous nos jeux dans votre poche
              </p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0" />
              <p className="text-theme-secondary">
                <strong className="text-theme-primary">Service client réactif</strong> - Nous sommes continuellement à votre écoute
              </p>
            </div>
          </div>
        </motion.div>

        {/* Badge de confiance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-full border border-green-500/30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Marque de confiance depuis 2022</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}