"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Users, Award } from "lucide-react";

const milestones = [
  {
    year: "2022",
    title: "La naissance d'une idée",
    description:
      "Tout commence avec une simple observation : les conversations profondes se font de plus en plus rares dans nos relations. L'idée de VIENS ON S'CONNAÎT naît de ce constat et de l'envie de créer un outil ludique pour renforcer les liens.",
    image: "/images/about/milestone-1.jpg",
  },
  {
    year: "2023",
    title: "Les premiers jeux",
    description:
      "Après des mois de recherche et de développement, nous lançons notre première collection de jeux. Le succès est immédiat, avec plus de 1000 jeux vendus dans les trois premiers mois.",
    image: "/images/about/milestone-2.jpg",
  },
  {
    year: "2024",
    title: "L'expansion continue",
    description:
      "Notre gamme s'enrichit de nouveaux jeux, et nous nous étendons à travers l'Afrique de l'Ouest. Plus de 7000 personnes utilisent désormais nos jeux pour renforcer leurs relations.",
    image: "/images/about/milestone-3.jpg",
  },
];

const values = [
  {
    icon: Heart,
    title: "Authenticité",
    description:
      "Nous croyons en la puissance des relations authentiques et encourageons des conversations sincères.",
  },
  {
    icon: Users,
    title: "Inclusion",
    description:
      "Nos jeux sont conçus pour tous, respectant la diversité des relations et des cultures.",
  },
  {
    icon: Award,
    title: "Excellence",
    description:
      "Chaque carte est soigneusement créée pour garantir des moments de qualité et des échanges enrichissants.",
  },
];

export default function NotreHistoire() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-brand-blue text-white py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/20 to-transparent" />
        <motion.div
          className="relative max-w-6xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Notre Histoire
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Comment une simple idée est devenue une mission : renforcer les
            relations humaines à travers le jeu.
          </p>
        </motion.div>
      </section>

      {/* Vision Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src="/images/about/founder.jpg"
                  alt="Fondateur de VIENS ON S'CONNAÎT"
                  fill
                  className="object-cover"
                />
              </div>
            </motion.div>
            <motion.div className="space-y-6" variants={itemVariants}>
              <h2 className="text-3xl md:text-4xl font-bold text-brand-blue">
                Notre Vision
              </h2>
              <p className="text-lg text-gray-600">
                Dans un monde de plus en plus connecté numériquement mais
                déconnecté émotionnellement, nous avons voulu créer quelque
                chose de différent. VIENS ON S'CONNAÎT est né de la conviction
                que les relations humaines méritent du temps, de l'attention et
                des outils adaptés pour s'épanouir.
              </p>
              <p className="text-lg text-gray-600">
                Notre mission est simple : créer des jeux qui permettent aux
                gens de se reconnecter, de communiquer plus profondément et de
                renforcer leurs liens, une carte à la fois.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center text-brand-blue mb-16"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Notre Parcours
          </motion.h2>

          <div className="space-y-24">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.year}
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-12 items-center`}
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <motion.div className="w-full md:w-1/2" variants={itemVariants}>
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <Image
                      src={milestone.image}
                      alt={milestone.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </motion.div>
                <motion.div
                  className="w-full md:w-1/2 space-y-4"
                  variants={itemVariants}
                >
                  <div className="text-xl font-bold text-brand-pink">
                    {milestone.year}
                  </div>
                  <h3 className="text-2xl font-bold text-brand-blue">
                    {milestone.title}
                  </h3>
                  <p className="text-gray-600">{milestone.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-brand-blue mb-4">
              Nos Valeurs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ces principes guident chacune de nos décisions et façonnent tous
              nos produits.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  variants={itemVariants}
                >
                  <div className="w-12 h-12 bg-brand-blue rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-brand-blue mb-4">
                    {value.title}
                  </h3>
                  <p className="text-gray-600">{value.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-brand-blue to-brand-pink text-white">
        <motion.div
          className="max-w-4xl mx-auto px-4 text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-6"
            variants={itemVariants}
          >
            Rejoignez l'aventure
          </motion.h2>
          <motion.p
            className="text-xl text-white/90 mb-8"
            variants={itemVariants}
          >
            Découvrez nos jeux et commencez à renforcer vos relations dès
            aujourd'hui.
          </motion.p>
          <motion.div variants={itemVariants}>
            <a
              href="/nos-jeux"
              className="inline-block bg-brand-blue text-white px-8 py-4 rounded-lg font-medium hover:bg-white hover:text-brand-blue transition-colors"
            >
              Découvrir nos jeux
            </a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}