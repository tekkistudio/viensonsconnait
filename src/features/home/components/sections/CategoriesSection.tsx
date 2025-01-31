// src/features/home/components/sections/CategoriesSection.tsx
"use client"

import { Heart, Users, UserCircle, Briefcase } from 'lucide-react';
import { useBreakpoint } from '../../../../core/theme/hooks/useBreakpoint';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
  index: number;
}

const categories = [
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Pour les Couples",
    description: "Apprenez à mieux vous connaître, mariés ou pas encore, et solidifiez vos liens",
    href: "/couples",
    color: "brand-pink"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Pour les Familles",
    description: "Renforcez les liens avec vos Parents ou Enfants grâce à des échanges significatifs",
    href: "/products/famille",
    color: "brand-blue"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Pour les Amis",
    description: "Dynamisez vos rencontres entre amis et approfondissez vos relations amicales",
    href: "/products/amis",
    color: "brand-blue"
  },
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: "Pour les Collègues",
    description: "Renforcez la cohésion et la collaboration dans votre entreprise",
    href: "/products/collegues",
    color: "brand-blue"
  }
];

function CategoryCard({ icon, title, description, href, color, index }: CategoryCardProps) {
  const { isMobile } = useBreakpoint();
  
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: { 
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.5,
        delay: index * 0.1
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link 
        href={href}
        className="flex flex-col items-center bg-white p-4 md:p-6 rounded-lg 
          shadow-sm hover:shadow-lg transition-all duration-300 h-full"
      >
        <div className={`w-12 h-12 bg-${color} rounded-full mb-4 
          flex items-center justify-center text-white
          transform transition-transform duration-300`}
        >
          {icon}
        </div>
        <h3 className="font-medium text-lg mb-2 text-brand-blue text-center">{title}</h3>
        <p className="text-sm text-gray-600 text-center">{description}</p>
      </Link>
    </motion.div>
  );
}

export function CategoriesSection() {
  return (
    <section className="py-12 md:py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div 
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-brand-blue mb-4">
            Des jeux pour chaque relation
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Choisissez parmi notre sélection de jeux spécialement conçus pour renforcer 
            vos relations avec les personnes qui partagent votre quotidien.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <CategoryCard 
              key={category.title} 
              {...category} 
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategoriesSection;