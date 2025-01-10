// features/concept/components/LeConcept.tsx
"use client"

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, Heart, Users, Star, Award } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: "Des conversations authentiques",
    description: "Des questions soigneusement élaborées pour encourager des échanges sincères et profonds entre les participants."
  },
  {
    icon: Heart,
    title: "Un format ludique",
    description: "Un jeu de cartes simple et intuitif qui rend les discussions naturelles et agréables."
  },
  {
    icon: Users,
    title: "Pour toutes les relations",
    description: "Des versions adaptées pour les couples, les familles, les amis et les collègues, chacune avec son contenu spécifique."
  },
  {
    icon: Star,
    title: "Une approche unique",
    description: "Des cartes créées avec l'aide de psychologues et de spécialistes des relations humaines."
  }
];

const values = [
  {
    icon: Heart,
    title: "Authenticité",
    description: "Nous encourageons l'honnêteté et l'ouverture dans toutes les interactions, croyant que la véritable connexion naît de l'authenticité."
  },
  {
    icon: Users,
    title: "Respect",
    description: "Nous valorisons la diversité des expériences et des points de vue, promouvant un environnement de respect mutuel dans toutes les relations."
  },
  {
    icon: Star,
    title: "Innovation",
    description: "Nous nous efforçons constamment de créer des solutions créatives et engageantes pour répondre aux défis relationnels modernes."
  },
  {
    icon: Award,
    title: "Qualité",
    description: "Nous nous engageons à offrir des produits de haute qualité, tant dans leur conception que dans leur contenu, pour assurer la meilleure expérience possible."
  }
];

const howItWorks = [
  {
    title: "Choisissez votre jeu",
    description: "Sélectionnez le jeu qui correspond à la relation que vous souhaitez renforcer."
  },
  {
    title: "Tirez une carte",
    description: "Chaque carte contient une question ou un sujet de discussion unique."
  },
  {
    title: "Partagez et écoutez",
    description: "Prenez le temps d'échanger de manière authentique et d'écouter l'autre."
  },
  {
    title: "Renforcez vos liens",
    description: "Approfondissez votre relation au fil des parties et des conversations."
  }
];

export default function LeConcept() {
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
            Des jeux qui renforcent les relations avec vos proches
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Au-delà de simples moments de divertissement, nos jeux offrent une plateforme ludique 
            pour mieux se connaître, se comprendre et s'écouter.
          </p>
        </motion.div>
      </section>

      {/* Vision et Mission Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="/images/concept/vision.jpg"
                alt="Notre Vision"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-brand-blue">
                Vision & Mission
              </h2>
              <p className="text-lg text-gray-600">
                Nous envisageons un monde où les relations humaines sont au cœur de notre épanouissement. 
                Nous croyons en un avenir où chaque couple, groupe d'amis et famille dispose des outils nécessaires 
                pour cultiver des liens profonds, authentiques et durables.
              </p>
              <p className="text-lg text-gray-600">
                Notre mission est d'offrir des solutions ludiques et efficaces pour améliorer la communication 
                et renforcer les relations entre les individus. À travers nos jeux de cartes innovants, 
                nous facilitons des conversations significatives, encourageons la découverte mutuelle et créons 
                des moments de partage mémorables.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-brand-blue mb-4">
              Nos Valeurs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ces principes fondamentaux guident chacune de nos décisions et façonnent tous nos produits.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 p-6 rounded-lg"
                >
                  <div className="w-12 h-12 bg-brand-blue rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-brand-blue mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-brand-blue text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Comment ça marche
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Une approche simple et efficace pour des conversations significatives.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-brand-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-white">{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">
                  {step.title}
                </h3>
                <p className="text-white/90">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-brand-blue mb-6">
                Impact positif
              </h2>
              <p className="text-lg text-gray-600">
                Plus de 7000 personnes ont déjà choisi nos jeux pour renforcer leurs relations. 
                Nos utilisateurs rapportent des conversations plus profondes, une meilleure 
                compréhension mutuelle et des liens plus forts avec leurs proches.
              </p>
              <div className="pt-4">
                <Link
                  href="/temoignages"
                  className="inline-block bg-brand-blue text-white px-8 py-4 rounded-lg 
                    font-medium hover:bg-brand-pink transition-colors"
                >
                  Lire les témoignages
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] rounded-lg overflow-hidden"
            >
              <Image
                src="/images/concept/impact.jpg"
                alt="Impact de nos jeux"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-brand-blue mb-6">
              Prêt à renforcer vos relations ?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Choisissez le jeu qui correspond à vos besoins et commencez à créer 
              des moments de connexion authentiques avec vos proches.
            </p>
            <Link
              href="/nos-jeux"
              className="inline-block bg-brand-blue text-white px-8 py-4 rounded-lg 
                font-medium hover:bg-brand-pink transition-colors"
            >
              Découvrir nos jeux
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}