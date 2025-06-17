// src/features/concept/components/mobile/MobileLeConcept.tsx - VERSION OPTIMISÉE THÈMES
"use client"

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MessageSquare, 
  Heart, 
  Users, 
  Star, 
  Award, 
  Lightbulb,
  Play,
  ChevronRight,
  Target,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: "Conversations authentiques",
    description: "Des questions soigneusement élaborées pour encourager des échanges sincères et profonds.",
    color: "from-blue-500 to-purple-500"
  },
  {
    icon: Heart,
    title: "Format ludique",
    description: "Un jeu de cartes simple et intuitif qui rend les discussions naturelles et agréables.",
    color: "from-pink-500 to-red-500"
  },
  {
    icon: Users,
    title: "Pour toutes les relations",
    description: "Des versions adaptées pour couples, familles, amis et collègues avec du contenu spécifique.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: Star,
    title: "Approche unique",
    description: "Créées avec l'aide de psychologues et de spécialistes des relations humaines.",
    color: "from-yellow-500 to-orange-500"
  }
];

const values = [
  {
    icon: Heart,
    title: "Authenticité",
    description: "Nous encourageons l'honnêteté et l'ouverture dans toutes les interactions.",
    emoji: "🎯"
  },
  {
    icon: Users,
    title: "Respect",
    description: "Nous valorisons la diversité des expériences et des points de vue.",
    emoji: "🤝"
  },
  {
    icon: Star,
    title: "Innovation",
    description: "Nous créons des solutions créatives pour les défis relationnels modernes.",
    emoji: "💡"
  },
  {
    icon: Award,
    title: "Qualité",
    description: "Nous offrons des produits de haute qualité pour la meilleure expérience possible.",
    emoji: "🏆"
  }
];

const howItWorks = [
  {
    number: "1",
    title: "Choisissez votre jeu",
    description: "Sélectionnez le jeu qui correspond à la relation que vous souhaitez renforcer.",
    icon: Target
  },
  {
    number: "2", 
    title: "Tirez une carte",
    description: "Chaque carte contient une question ou un sujet de discussion unique.",
    icon: Sparkles
  },
  {
    number: "3",
    title: "Partagez et écoutez",
    description: "Prenez le temps d'échanger de manière authentique et d'écouter l'autre.",
    icon: MessageSquare
  },
  {
    number: "4",
    title: "Renforcez vos liens",
    description: "Approfondissez votre relation au fil des parties et des conversations.",
    icon: Heart
  }
];

const stats = [
  { number: "+7000", label: "Jeux vendus", sublabel: "en 2 ans" },
  { number: "98%", label: "Satisfaction", sublabel: "clients satisfaits" },
  { number: "4.9/5", label: "Note moyenne", sublabel: "sur tous nos jeux" },
  { number: "+8", label: "Pays", sublabel: "de livraison" }
];

export default function MobileLeConcept() {
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] bg-gradient-to-r from-brand-pink/30 to-brand-blue/30 overflow-hidden pt-24 pb-12">
        <div className="absolute inset-0 bg-theme-primary/50" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative h-full flex flex-col justify-center px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-theme-card backdrop-blur-sm text-theme-primary px-4 py-2 rounded-full mb-8 relative z-10 border border-theme">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm font-medium">Le Concept</span>
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-bold text-theme-primary mb-6 leading-tight">
            Des jeux qui renforcent 
            <span className="text-brand-pink"> les relations</span> avec vos proches
          </h1>
          
          <p className="text-theme-secondary text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Au-delà de simples moments de divertissement, nos jeux offrent une plateforme 
            ludique pour mieux se connaître.
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 bg-brand-pink text-white px-8 py-4 rounded-full font-semibold mx-auto relative z-10 mb-8 shadow-lg hover:shadow-xl transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Découvrir nos jeux</span>
          </motion.button>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-8 -mt-12 relative z-10">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-theme-card backdrop-blur-sm rounded-xl p-4 text-center border border-theme shadow-sm"
              >
                <div className="text-2xl font-bold text-theme-primary mb-1">
                  {stat.number}
                </div>
                <div className="text-theme-primary font-medium text-sm mb-1">
                  {stat.label}
                </div>
                <div className="text-theme-secondary text-xs">
                  {stat.sublabel}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-theme-primary mb-4">
              Notre Vision & Mission
            </h2>
            <p className="text-theme-secondary text-base">
              Créer un monde où les relations humaines sont au cœur de notre épanouissement.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-theme-card backdrop-blur-sm rounded-2xl p-6 border border-theme mb-8 shadow-sm"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
              <Image
                src="/images/concept/vision-mobile.jpg"
                alt="Notre Vision"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
            
            <div className="space-y-4">
              <p className="text-theme-primary leading-relaxed">
                Nous envisageons un monde où les relations humaines sont au cœur de notre épanouissement. 
                Nous croyons en un avenir où chaque couple, groupe d'amis et famille dispose des outils 
                nécessaires pour cultiver des liens profonds et authentiques.
              </p>
              <p className="text-theme-secondary leading-relaxed">
                Notre mission est d'offrir des solutions ludiques et efficaces pour améliorer la communication 
                et renforcer les relations entre les individus.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-theme-secondary/5">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold text-theme-primary mb-3">
              Ce qui rend nos jeux uniques
            </h2>
            <p className="text-theme-secondary">
              Une approche innovante pour des relations plus fortes
            </p>
          </motion.div>

          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-theme-card backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className={`bg-gradient-to-r ${feature.color} rounded-full p-3 flex-shrink-0 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-theme-primary font-semibold text-lg mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-theme-secondary text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gradient-to-r from-brand-pink/5 to-brand-blue/5">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-theme-primary mb-3">
              Comment ça marche
            </h2>
            <p className="text-theme-secondary">
              Une approche simple et efficace en 4 étapes
            </p>
          </motion.div>

          <div className="space-y-6">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="flex items-start gap-4"
                >
                  <div className="bg-brand-pink rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white font-bold text-lg">{step.number}</span>
                  </div>
                  
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-brand-pink" />
                      <h3 className="text-theme-primary font-semibold">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-theme-secondary text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-theme-primary mb-3">
              Nos Valeurs
            </h2>
            <p className="text-theme-secondary">
              Ces principes guident chacune de nos décisions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-theme-card backdrop-blur-sm rounded-xl p-6 border border-theme shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">
                      {value.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-theme-primary font-bold text-lg mb-2 flex items-center gap-2">
                        <Icon className="w-5 h-5 text-brand-pink" />
                        {value.title}
                      </h3>
                      <p className="text-theme-secondary leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 bg-gradient-to-r from-brand-blue/5 to-brand-pink/5">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-theme-card backdrop-blur-sm rounded-2xl p-6 border border-theme shadow-sm"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-theme-primary mb-3">
                Impact positif
              </h2>
              <div className="w-16 h-1 bg-brand-pink rounded-full mx-auto mb-4" />
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-theme-primary leading-relaxed">
                Plus de <strong className="text-brand-pink">7000 personnes</strong> ont déjà choisi nos jeux 
                pour renforcer leurs relations.
              </p>
              <p className="text-theme-secondary leading-relaxed">
                Nos utilisateurs rapportent des conversations plus profondes, une meilleure 
                compréhension mutuelle et des liens plus forts avec leurs proches.
              </p>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
              <Image
                src="/images/concept/impact-mobile.jpg"
                alt="Impact de nos jeux"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>

            <Link
              href="/temoignages"
              className="w-full bg-brand-pink text-white py-3 px-6 rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-brand-pink/90 transition-colors shadow-lg hover:shadow-xl"
            >
              <span>Lire les témoignages</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center bg-gradient-to-r from-brand-pink/10 to-brand-blue/10 backdrop-blur-sm rounded-2xl p-8 border border-theme"
          >
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-theme-primary mb-3">
              Prêt à renforcer vos relations ?
            </h2>
            <p className="text-theme-secondary mb-8 leading-relaxed">
              Choisissez le jeu qui correspond à vos besoins et commencez à créer 
              des moments de connexion authentiques avec vos proches.
            </p>
            
            <div className="space-y-4">
              <Link
                href="/nos-jeux"
                className="w-full bg-brand-pink text-white py-4 px-6 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-brand-pink/90 transition-colors shadow-lg hover:shadow-xl"
              >
                <span>Découvrir nos jeux</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
              
              <Link
                href="/notre-histoire"
                className="w-full bg-theme-card backdrop-blur-sm text-theme-primary py-3 px-6 rounded-full font-medium flex items-center justify-center gap-2 border border-theme hover:bg-theme-secondary/10 transition-colors"
              >
                <span>Notre histoire</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}