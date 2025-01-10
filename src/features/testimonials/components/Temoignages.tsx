// features/testimonials/components/Temoignages.tsx
"use client"

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    letter: "M",
    name: "Mariama S.",
    status: "Couple depuis 3 ans",
    text: "Ce jeu a vraiment transformé nos soirées. Nous avons découvert tellement de choses l'un sur l'autre ! Les questions sont pertinentes et nous permettent d'avoir des conversations profondes que nous n'aurions peut-être jamais eues autrement.",
    rating: 5,
    category: "couples"
  },
  {
    letter: "A",
    name: "Abdou K.",
    status: "Couple depuis 1 an",
    text: "Au début, on était un peu sceptiques, mais dès la première utilisation, on a été conquis ! Les cartes nous aident à aborder naturellement des sujets importants. C'est devenu notre rituel du weekend.",
    rating: 5,
    category: "couples"
  },
  {
    letter: "F",
    name: "Fatou D.",
    status: "Couple depuis 2 ans",
    text: "Un excellent investissement pour notre couple ! Les questions sont bien pensées et nous permettent d'avoir des discussions enrichissantes. Je le recommande à tous les couples qui veulent approfondir leur relation.",
    rating: 5,
    category: "couples"
  },
  {
    letter: "S",
    name: "Sarah M.",
    status: "Famille de 4 personnes",
    text: "Depuis que nous avons commencé à jouer en famille, nos dîners sont devenus des moments privilégiés de partage. Nos enfants s'ouvrent plus facilement et nous avons des conversations incroyables !",
    rating: 5,
    category: "famille"
  },
  {
    letter: "O",
    name: "Omar D.",
    status: "Marié depuis 5 ans",
    text: "Ces cartes ont ravivé la flamme dans notre mariage. Nous redécouvrons des aspects de notre relation que nous avions oubliés. Un véritable cadeau pour notre couple.",
    rating: 5,
    category: "maries"
  },
  {
    letter: "B",
    name: "Bineta F.",
    status: "Groupe d'amis",
    text: "Nos soirées entre amis ont pris une toute nouvelle dimension. Au lieu des discussions habituelles, nous partageons des moments plus profonds et significatifs.",
    rating: 5,
    category: "amis"
  },
  {
    letter: "K",
    name: "Khady N.",
    status: "Couple depuis 6 mois",
    text: "Ce jeu nous a permis d'aborder des sujets importants dès le début de notre relation. C'est un excellent outil pour construire des bases solides.",
    rating: 5,
    category: "couples"
  },
  {
    letter: "M",
    name: "Moussa T.",
    status: "Marié depuis 2 ans",
    text: "Les questions nous ont aidés à mieux comprendre nos différences et à les accepter. Notre communication s'est nettement améliorée.",
    rating: 5,
    category: "maries"
  },
  {
    letter: "A",
    name: "Aïssatou L.",
    status: "Famille de 3 enfants",
    text: "Un excellent moyen de créer des moments de qualité en famille. Nos adolescents participent volontiers et s'ouvrent plus facilement.",
    rating: 5,
    category: "famille"
  },
  {
    letter: "I",
    name: "Ibrahim C.",
    status: "Groupe d'amis de longue date",
    text: "Même après 15 ans d'amitié, nous découvrons encore de nouvelles choses les uns sur les autres grâce à ce jeu !",
    rating: 5,
    category: "amis"
  },
  {
    letter: "R",
    name: "Rama S.",
    status: "Couple depuis 4 ans",
    text: "Les cartes nous ont aidés à surmonter une période difficile en améliorant notre communication. Un véritable outil de développement relationnel.",
    rating: 5,
    category: "couples"
  },
  {
    letter: "Y",
    name: "Yacine M.",
    status: "Marié depuis 3 ans",
    text: "Ces cartes ont ajouté une nouvelle dimension à notre relation. Nous avons des conversations plus profondes et significatives.",
    rating: 5,
    category: "maries"
  }
];

const categories = [
  { value: "all", label: "Tous" },
  { value: "couples", label: "Couples" },
  { value: "maries", label: "Mariés" },
  { value: "famille", label: "Famille" },
  { value: "amis", label: "Amis" }
];

export default function Temoignages() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const itemsPerPage = 12;

  const filteredTestimonials = testimonials.filter(
    testimonial => selectedCategory === "all" || testimonial.category === selectedCategory
  );

  const totalPages = Math.ceil(filteredTestimonials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTestimonials = filteredTestimonials.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-brand-blue text-white py-16 md:py-24">
        <motion.div 
          className="max-w-6xl mx-auto px-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Témoignages
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Découvrez les expériences authentiques de personnes qui ont renforcé
            leurs relations grâce à nos jeux.
          </p>
        </motion.div>
      </section>

      {/* Filters */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setCurrentPage(1);
                }}
                className={`px-6 py-2 rounded-full transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="initial"
            animate="animate"
            variants={{
              initial: { opacity: 0 },
              animate: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {displayedTestimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 }
                }}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
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
                <p className="text-gray-600 mb-4">
                  {testimonial.text}
                </p>
                <div className="flex text-brand-pink">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === index + 1
                      ? 'bg-brand-blue text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}