// src/lib/products.ts
import { Product } from '../types/product';

type ProductsMap = {
  [key: string]: Product;
};

export const products: ProductsMap = {
  'couples': {
    id: 'couples',
    slug: 'couples',
    name: 'Pour Les Couples',
    description: 'Un jeu de cartes pour renforcer votre relation de couple et créer des moments de complicité.',
    price: 14000,
    compareAtPrice: 16500,
    images: [
      '/images/products/couples-1.jpg',
      '/images/products/couples-2.jpg',
      '/images/products/couples-3.jpg',
      '/images/products/couples-4.jpg'
    ],
    media: [
      {
        url: '/images/products/couples-1.jpg',
        alt: 'Pour Les Couples - Vue 1'
      },
      {
        url: '/images/products/couples-2.jpg',
        alt: 'Pour Les Couples - Vue 2'
      }
    ],
    badges: [
      {
        type: 'promo',
        text: '-15%'
      }
    ],
    stats: {
      sold: 2854,
      satisfaction: 98,
      reviews: 39
    }
  },
  'maries': {
    id: 'maries',
    slug: 'maries',
    name: 'Pour Les Mariés',
    description: 'Un jeu de cartes pour enrichir votre vie conjugale et approfondir votre relation.',
    price: 14000,
    compareAtPrice: 16500,
    images: [
      '/images/products/maries-1.jpg',
      '/images/products/maries-2.jpg',
      '/images/products/maries-3.jpg',
      '/images/products/maries-4.jpg'
    ],
    media: [
      {
        url: '/images/products/maries-1.jpg',
        alt: 'Pour Les Mariés - Vue 1'
      },
      {
        url: '/images/products/maries-2.jpg',
        alt: 'Pour Les Mariés - Vue 2'
      }
    ],
    badges: [
      {
        type: 'promo',
        text: '-15%'
      }
    ],
    stats: {
      sold: 1453,
      satisfaction: 97,
      reviews: 27
    }
  },
  'famille': {
    id: 'famille',
    slug: 'famille',
    name: 'Pour La Famille',
    description: 'Un jeu de cartes pour créer des liens plus forts en famille et partager des moments inoubliables.',
    price: 14000,
    compareAtPrice: 16500,
    images: [
      '/images/products/famille-1.jpg',
      '/images/products/famille-2.jpg',
      '/images/products/famille-3.jpg',
      '/images/products/famille-4.jpg'
    ],
    media: [
      {
        url: '/images/products/famille-1.jpg',
        alt: 'Pour La Famille - Vue 1'
      },
      {
        url: '/images/products/famille-2.jpg',
        alt: 'Pour La Famille - Vue 2'
      }
    ],
    badges: [
      {
        type: 'promo',
        text: '-15%'
      }
    ],
    stats: {
      sold: 978,
      satisfaction: 96,
      reviews: 18
    }
  },
  'amis': {
    id: 'amis',
    slug: 'amis',
    name: 'Pour Les Amis',
    description: 'Un jeu de cartes pour renforcer vos amitiés et créer des souvenirs mémorables entre amis.',
    price: 14000,
    compareAtPrice: 16500,
    images: [
      '/images/products/amis-1.jpg',
      '/images/products/amis-2.jpg',
      '/images/products/amis-3.jpg',
      '/images/products/amis-4.jpg'
    ],
    media: [
      {
        url: '/images/products/amis-1.jpg',
        alt: 'Pour Les Amis - Vue 1'
      },
      {
        url: '/images/products/amis-2.jpg',
        alt: 'Pour Les Amis - Vue 2'
      }
    ],
    badges: [
      {
        type: 'new',
        text: 'Nouveau'
      }
    ],
    stats: {
      sold: 456,
      satisfaction: 95,
      reviews: 12
    }
  },
  'collegues': {
    id: 'collegues',
    slug: 'collegues',
    name: 'Pour Les Collègues',
    description: 'Développez des relations professionnelles plus authentiques et un environnement de travail plus humain.',
    price: 14000,
    compareAtPrice: 16500,
    images: [
      '/images/products/collegues-1.jpg',
      '/images/products/collegues-2.jpg'
    ],
    media: [
      {
        url: '/images/products/collegues-1.jpg',
        alt: 'Jeu Pour Les Collègues - Vue principale'
      },
      {
        url: '/images/products/collegues-2.jpg',
        alt: 'Jeu Pour Les Collègues - Contenu'
      }
    ],
    badges: [
      {
        type: 'promo',
        text: '-15%'
      }
    ],
    stats: {
      sold: 2756,
      satisfaction: 95,
      reviews: 187
    }
  },
  'stvalentin': {
    id: 'stvalentin',
    slug: 'st-valentin',
    name: 'Édition St-Valentin',
    description: 'Célébrez votre amour avec cette édition spéciale : 120 questions pour faire le bilan et 20 activités et 10 défis romantiques pour raviver la flamme.',
    price: 14000,
    compareAtPrice: 16500,
    images: [
      '/images/products/st-valentin-1.jpg',
      '/images/products/st-valentin-2.jpg'
    ],
    media: [
      {
        url: '/images/products/st-valentin-1.jpg',
        alt: 'Édition St-Valentin - Vue principale'
      },
      {
        url: '/images/products/st-valentin-2.jpg',
        alt: 'Édition St-Valentin - Contenu'
      }
    ],
    badges: [
      {
        type: 'special',
        text: 'Édition Spéciale'
      },
      {
        type: 'promo',
        text: '-15%'
      }
    ],
    stats: {
      sold: 1523,
      satisfaction: 99,
      reviews: 142
    }
  }
};

export default products;