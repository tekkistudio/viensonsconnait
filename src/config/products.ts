// src/config/products.ts

export const PRODUCTS_INFO: Record<string, ProductInfo> = {
    couples: {
      name: "Pour les Couples non mariés",
      description: `Jeu de 150 questions soigneusement élaborées pour les couples non mariés. Ce jeu a été conçu pour stimuler le dialogue et permettre aux couples de mieux se connaître afin de se préparer aux prochaines étapes de leur relation : fiançailles, mariage, vie de couple, parentalité, etc. Il est parfait pour les couples non mariés qui veulent approfondir leur connexion. Il permet d'aborder des sujets essentiels tels que les finances, les différences culturelles, les croyances, le mariage, les projets d'avenir, la vie de couple, les valeurs personnelles, l'intimité, la parentalité, et bien plus encore.`,
      price: 14000,
      benefits: [
        "Mieux se connaître mutuellement pour mieux se projeter dans l'avenir",
        "Renforcer votre lien émotionnel afin de préparer votre vie de couple future",
        "Aborder des sujets importants pour votre couple dans une atmosphère détendue",
        "Créer des moments de connexion profonde où vous vous découvrez en profondeur",
        "Discuter de vos projets d'avenir ensemble et vous assurer d'avoir la même vision"
      ],
      topics: [
        "Finances et projets communs",
        "Communication et attentes",
        "Valeurs et aspirations",
        "Intimité et complicité",
        "Défis et croissance du couple"
      ]
    },
    maries: {
      name: "Pour les Couples Mariés",
      description: `Jeu de cartes contenant 150 questions profondes pour les couples mariés. Ce jeu a été conçu pour permettre aux couples mariés de se redécouvrir et renforcer leurs liens conjugaux, en abordant des sujets importants qui sont souvent ignorés voire évités. Ce jeu est idéal pour les couples mariés qui veulent raviver la passion, améliorer leur communication, approfondir leur relation et sortir de la routine. Ce jeu offre une opportunité unique d'explorer les aspects les plus intimes et significatifs de votre vie à deux, tout en créant des moments de connexion authentique et de croissance mutuelle.`,
      price: 14000,
      benefits: [
        "Redynamiser votre vie conjugale",
        "Approfondir votre communication",
        "Raviver la flamme dans votre mariage",
        "Créer des moments privilégiés à deux",
        "Renforcer votre intimité émotionnelle"
      ],
      topics: [
        "Défis du mariage",
        "Projets communs",
        "Communication conjugale",
        "Intimité et romance",
        "Traditions familiales"
      ]
    },
    famille: {
      name: "Pour les Familles",
      description: `150 cartes questions pour stimuler la communication bienveillante au sein des familles. Ce jeu a été conçu pour permettre une meilleure compréhension entre parents et enfants, renforcer les liens familiaux et aider à résoudre les malentendus en encourageant une communication ouverte et honnête. Grâce à des questions profondes et significatives, ce jeu offre l'opportunité de partager des moments privilégiés où chacun peut s'exprimer librement, écouter, comprendre et mieux connaître les autres membres de la famille. Il faudrait avoir au moins 16 ans pour jouer à ce jeu. Ce jeu a été pensé pour :
      👨‍👩‍👧‍👦 Enrichir la communication parents-enfants
      💝 Renforcer les liens familiaux
      💫 Résoudre les malentendus
      🤗 Encourager une communication ouverte`,
      price: 14000,
      benefits: [
        "Améliorer la communication familiale",
        "Créer des liens plus forts",
        "Comprendre chaque membre de la famille",
        "Partager des moments privilégiés",
        "Créer des souvenirs précieux"
      ],
      topics: [
        "Valeurs familiales",
        "Communication intergénérationnelle",
        "Traditions et souvenirs",
        "Aspirations individuelles",
        "Résolution de conflits"
      ]
    },
    amis: {
      name: "Pour les Amis",
      description: `150 cartes de questions soigneusement élaborées pour redynamiser vos rencontres entre amis et vous permettre d'approfondir votre connaissance les uns des autres. Ce jeu vous permet de vous poser des questions amusantes, profondes et sans tabou sur divers sujets de la vie, ce qui enrichit vos échanges et crée des moments mémorables ensemble. Que vous connaissiez vos amis depuis des années ou que vous souhaitiez créer des liens plus forts avec de nouveaux amis, ce jeu vous offre l'opportunité de vivre des moments inoubliables et de découvrir des facettes inexplorées de vos amis. Ce jeu ne correspond pas aux gens qui ont moins de 18 ans. Les sujets abordés sont :
      🌟 Vie et ambitions personnelles
      💝 Relations amicales & amoureuses
      💼 Vie professionnelle et vie d'adulte
      🤔 Anecdotes et souvenirs
      🎭 Culture & Divertissement`,
      price: 14000,
      benefits: [
        "Approfondir vos amitiés",
        "Découvrir de nouvelles facettes de vos amis",
        "Créer des moments mémorables",
        "Renforcer les liens d'amitié",
        "Générer des discussions passionnantes"
      ],
      topics: [
        "Projets et ambitions",
        "Souvenirs partagés",
        "Valeurs et philosophie de vie",
        "Centres d'intérêt",
        "Expériences personnelles"
      ]
    },
    collegues: {
      name: "Pour les Collègues",
      description: `Jeu de 150 cartes conçu pour renforcer la cohésion et la collaboration entre collègues afin d'améliorer la vie en entreprise. Ce jeu vous permet d'aborder des sujets importants pour la connaissance et la compréhension des autres. Il vous permet de :
      💼 Développer des relations professionnelles authentiques
      🤝 Créer un environnement de travail plus humain
      💫 Favoriser la cohésion d'équipe
      🌟 Améliorer la communication au bureau`,
      price: 14000,
      benefits: [
        "Renforcer la cohésion d'équipe",
        "Améliorer l'ambiance au travail",
        "Faciliter l'intégration des nouveaux",
        "Développer la communication professionnelle",
        "Créer des liens authentiques"
      ],
      topics: [
        "Parcours professionnel",
        "Objectifs de carrière",
        "Travail d'équipe",
        "Communication professionnelle",
        "Équilibre vie pro/perso"
      ]
    },
    stvalentin: {
      name: "Pour la St-Valentin",
      description: `Offrez à votre relation un moment unique et mémorable avec l’édition spéciale St-Valentin du jeu VIENS ON S’CONNAÎT. Spécialement conçu pour célébrer l’amour, ce jeu de cartes transforme votre Saint-Valentin en une expérience profonde, romantique et pleine de surprises. Que vous soyez en couple depuis des mois ou des années, ce jeu vous permet de revisiter votre relation, de découvrir de nouvelles facettes de votre partenaire, et de raviver la flamme qui vous unit. Avec 150 cartes captivantes, cette édition est une invitation à renforcer votre lien, explorer vos rêves communs, et créer de nouveaux souvenirs ensemble. Ce jeu est interdit aux moins de 18 ans. Le jeu contient :
      💝 120 cartes de questions pour faire le bilan de votre relation
      💫 20 cartes d'activités romantiques à réaliser ensemble
      💑 10 cartes de défis pour pimenter votre St-Valentin`,
      price: 14000,
      benefits: [
        "Célébrer votre amour de façon unique",
        "Créer des moments romantiques mémorables",
        "Renforcer votre connexion",
        "Faire le bilan de votre relation",
        "Partager des moments complices"
      ],
      topics: [
        "Moments romantiques",
        "Souvenirs de couple",
        "Projets à deux",
        "Défis amoureux",
        "Activités romantiques"
      ]
    }
  } as const;  

  export interface ProductInfo {
    name: string;
    description: string;
    price: number;
    benefits: string[];
    topics: string[];
    howToPlay?: string;
    testimonials?: string;
  }
  
  export type ProductId = keyof typeof PRODUCTS_INFO;
  export type Product = typeof PRODUCTS_INFO[ProductId];

// Validation de produit
export const isValidProduct = (id: string): id is ProductId => {
  return id in PRODUCTS_INFO;
};

// Récupération des informations d'un produit
export const getProductInfo = (id: ProductId) => {
  return PRODUCTS_INFO[id];
};