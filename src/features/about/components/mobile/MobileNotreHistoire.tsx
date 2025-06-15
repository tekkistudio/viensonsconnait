// src/features/about/components/mobile/MobileNotreHistoire.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Heart, Users, Award, Calendar, MapPin, Star, ChevronRight, Play } from "lucide-react";

const milestones = [
  {
    year: "2022",
    title: "La naissance d'une idée",
    description: "Tout commence avec une simple observation : les conversations profondes se font de plus en plus rares dans nos relations. L'idée de VIENS ON S'CONNAÎT naît de ce constat.",
    image: "/images/about/milestone-1-mobile.jpg",
    color: "from-pink-500 to-red-500",
    icon: "💡"
  },
  {
    year: "2023", 
    title: "Les premiers jeux",
    description: "Après des mois de recherche et de développement, nous lançons notre première collection. Le succès est immédiat avec plus de 1000 jeux vendus en 3 mois.",
    image: "/images/about/milestone-2-mobile.jpg",
    color: "from-blue-500 to-purple-500",
    icon: "🎮"
  },
  {
    year: "2024",
    title: "L'expansion continue", 
    description: "Notre gamme s'enrichit et nous nous étendons à travers l'Afrique de l'Ouest. Plus de 7000 personnes utilisent désormais nos jeux pour renforcer leurs relations.",
    image: "/images/about/milestone-3-mobile.jpg",
    color: "from-green-500 to-emerald-500",
    icon: "🚀"
  },
];

const values = [
  {
    icon: Heart,
    title: "Authenticité",
    description: "Nous croyons en la puissance des relations authentiques et encourageons des conversations sincères.",
    emoji: "❤️",
    gradient: "from-pink-500 to-red-500"
  },
  {
    icon: Users,
    title: "Inclusion",
    description: "Nos jeux sont conçus pour tous, respectant la diversité des relations et des cultures.",
    emoji: "🤝",
    gradient: "from-blue-500 to-indigo-500"
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Chaque carte est soigneusement créée pour garantir des moments de qualité et des échanges enrichissants.",
    emoji: "🏆",
    gradient: "from-yellow-500 to-orange-500"
  },
];

const achievements = [
  { number: "7000+", label: "Jeux vendus", icon: "🎯" },
  { number: "8", label: "Pays de livraison", icon: "🌍" },
  { number: "98%", label: "Clients satisfaits", icon: "⭐" },
  { number: "2", label: "Années d'expérience", icon: "📅" }
];

export default function MobileNotreHistoire() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] bg-gradient-to-r from-brand-blue/30 to-brand-pink/30 overflow-hidden pt-24 pb-12">
        <div className="absolute inset-0 bg-black/50" />
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
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full mb-8 relative z-10">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Notre Histoire</span>
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
            Comment une simple idée est devenue une 
            <span className="text-brand-pink"> mission</span>
          </h1>
          
          <p className="text-white/80 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Renforcer les relations humaines à travers le jeu, 
            une carte à la fois.
          </p>

          <div className="flex items-center justify-center gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>Dakar, Sénégal</span>
            </div>
            <div className="w-1 h-1 bg-white/40 rounded-full" />
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Depuis 2022</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Achievements Section */}
      <section className="py-8 -mt-12 relative z-10">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-4"
          >
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10"
              >
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {achievement.number}
                </div>
                <div className="text-white/70 text-sm">
                  {achievement.label}
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
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-3">
                Notre Vision
              </h2>
              <div className="w-16 h-1 bg-brand-pink rounded-full mx-auto" />
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
              <Image
                src="/images/about/founder-mobile.jpg"
                alt="Fondateur de VIENS ON S'CONNAÎT"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-4">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-white/90 leading-relaxed">
                Dans un monde de plus en plus connecté numériquement mais déconnecté émotionnellement, 
                nous avons voulu créer quelque chose de différent.
              </p>
              <p className="text-white/80 leading-relaxed">
                VIENS ON S'CONNAÎT est né de la conviction que les relations humaines méritent du temps, 
                de l'attention et des outils adaptés pour s'épanouir.
              </p>
              
              <div className="bg-brand-pink/20 rounded-xl p-4 border border-brand-pink/30">
                <p className="text-white font-medium italic">
                  "Notre mission est simple : créer des jeux qui permettent aux gens de se reconnecter, 
                  une carte à la fois."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Notre Parcours
            </h2>
            <p className="text-white/70">
              L'évolution de notre mission année après année
            </p>
          </motion.div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.year}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  {/* Year badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`bg-gradient-to-r ${milestone.color} rounded-full p-3 text-2xl`}>
                      {milestone.icon}
                    </div>
                    <div>
                      <div className="text-brand-pink font-bold text-lg">
                        {milestone.year}
                      </div>
                      <h3 className="text-white font-bold text-xl">
                        {milestone.title}
                      </h3>
                    </div>
                  </div>

                  <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                    <Image
                      src={milestone.image}
                      alt={milestone.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </div>
                  
                  <p className="text-white/80 leading-relaxed">
                    {milestone.description}
                  </p>
                </div>

                {/* Timeline connector */}
                {index < milestones.length - 1 && (
                  <div className="flex justify-center my-4">
                    <div className="w-1 h-8 bg-gradient-to-b from-brand-pink to-brand-blue rounded-full" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gradient-to-r from-brand-pink/10 to-brand-blue/10">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold text-white mb-3">
              Nos Valeurs
            </h2>
            <p className="text-white/70">
              Ces principes guident chacune de nos décisions
            </p>
          </motion.div>

          <div className="space-y-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-start gap-4">
                    <div className={`bg-gradient-to-r ${value.gradient} rounded-full p-3 flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{value.emoji}</span>
                        <h3 className="text-white font-bold text-lg">
                          {value.title}
                        </h3>
                      </div>
                      <p className="text-white/80 leading-relaxed">
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

      {/* Team Section */}
      <section className="py-16">
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-3">
                L'équipe derrière VIENS ON S'CONNAÎT
              </h2>
              <div className="w-16 h-1 bg-brand-pink rounded-full mx-auto mb-4" />
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-white/90 leading-relaxed">
                Une équipe passionnée de <strong className="text-brand-pink">créatifs</strong>, 
                <strong className="text-brand-blue"> psychologues</strong> et 
                <strong className="text-brand-pink"> développeurs</strong> unis par une mission commune.
              </p>
              <p className="text-white/80 leading-relaxed">
                Nous travaillons chaque jour pour créer des expériences qui transforment 
                la façon dont les gens se connectent et communiquent.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-brand-pink/20 rounded-xl p-4 text-center border border-brand-pink/30">
                <div className="text-3xl mb-2">🧠</div>
                <div className="text-white font-semibold">Psychologues</div>
                <div className="text-white/60 text-sm">Contenu expert</div>
              </div>
              <div className="bg-brand-blue/20 rounded-xl p-4 text-center border border-brand-blue/30">
                <div className="text-3xl mb-2">🎨</div>
                <div className="text-white font-semibold">Créatifs</div>
                <div className="text-white/60 text-sm">Design unique</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
              <MapPin className="w-4 h-4" />
              <span>Basée à Dakar, Sénégal</span>
              <div className="w-1 h-1 bg-white/40 rounded-full mx-2" />
              <span>🇸🇳 Made in Senegal</span>
            </div>
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
            className="text-center bg-gradient-to-r from-brand-pink/20 to-brand-blue/20 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
          >
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Rejoignez l'aventure
            </h2>
            <p className="text-white/80 mb-8 leading-relaxed">
              Découvrez nos jeux et commencez à renforcer vos relations dès aujourd'hui. 
              Faites partie de notre communauté grandissante !
            </p>
            
            <div className="space-y-4">
              <Link
                href="/nos-jeux"
                className="w-full bg-white text-gray-900 py-4 px-6 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
              >
                <span>Découvrir nos jeux</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
              
              <Link
                href="/temoignages"
                className="w-full bg-white/10 backdrop-blur-sm text-white py-3 px-6 rounded-full font-medium flex items-center justify-center gap-2 border border-white/20 hover:bg-white/20 transition-colors"
              >
                <Star className="w-4 h-4" />
                <span>Lire les témoignages</span>
              </Link>
            </div>

            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center justify-center gap-4 text-white/60 text-sm">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-brand-pink" />
                  <span>7000+ jeux vendus</span>
                </div>
                <div className="w-1 h-1 bg-white/40 rounded-full" />
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-brand-blue" />
                  <span>98% satisfaction</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}