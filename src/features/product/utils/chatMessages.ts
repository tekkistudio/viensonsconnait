// src/features/product/utils/chatMessages.ts
import { ReactNode } from 'react';
import type { 
  ProductId, 
  MessagesType, 
  MessageStructure, 
  BaseMessageContent
} from '../types/chat';

interface GenericMessages {
  howToPlay: ReactNode | BaseMessageContent;
  testimonials: ReactNode | BaseMessageContent;
  pricing(convertPrice: (price: number) => { value: number; formatted: string; }): import("react").ReactNode | import("../types/chat").BaseMessageContent;
  orderConfirmation: (firstName: string, city: string) => string;
  askCity: (firstName: string) => string;
  askAddress: (city: string) => string;
  askPhone: string;
  askPayment: string;
}

interface PriceConverter {
  convertPrice: (price: number) => {
    value: number;
    formatted: string;
  };
}

interface ProductMessagesGenerator {
  welcome: string;
  description: string;
  features: string;
  howToPlay: string;
  testimonials: string;
  pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => string;
  sampleQuestions: string;
}

// Choix génériques pour tous les produits
const GENERIC_CHOICES = {
  initial: [
    "Je veux en savoir plus",
    "Je veux l'acheter maintenant",
    "Je veux voir les témoignages",
    "Comment y jouer ?"
  ] as const,
  afterDescription: [
    "Voir des exemples de questions",
    "Voir les témoignages",
    "Je veux l'acheter maintenant"
  ] as const,
  afterTestimonials: [
    "Voir les packs disponibles",
    "Je veux l'acheter maintenant",
    "Voir des exemples de questions"
  ] as const,
  afterPricing: [
    "Commander 1 jeu",
    "Commander plusieurs jeux",
    "Voir des exemples de questions"
  ] as const,
  multipleGames: [
    "2 exemplaires",
    "3 exemplaires",
    "4 exemplaires ou plus"
  ] as const,
  paymentMethods: [
    "Payer avec le téléphone",
    "Payer par carte bancaire",
    "Payer à la livraison"
  ] as const
} as const;

// Types pour les choix
type GenericChoicesKey = keyof typeof GENERIC_CHOICES;
type GenericChoiceValues = typeof GENERIC_CHOICES[GenericChoicesKey][number];

// Messages génériques
const GENERIC_MESSAGES: GenericMessages = {
  orderConfirmation: (firstName, city) => `
    Merci ${firstName} ! Votre commande a bien été enregistrée.
    ⏱️ Délais de livraison :
    ${city.toLowerCase() === 'dakar' ? '• Dakar : 24h maximum' : '• Autres villes : 72h maximum'}
    Notre livreur vous contactera dans les plus brefs délais.`,

  askCity: (firstName) => `Merci ${firstName} 🙂 Dans quelle ville habitez-vous ?`,

  askAddress: (city) => `Parfait ! Quelle est votre adresse exacte à ${city} ?`,

  askPhone: "Super ! Quel est votre numéro de téléphone 📱 pour la livraison ?",

  askPayment: "Par quel moyen souhaitez-vous payer ?",
  howToPlay: undefined,
  testimonials: undefined,
  pricing: function (convertPrice: (price: number) => { value: number; formatted: string; }): import('react').ReactNode | import('../types/chat').BaseMessageContent {
    throw new Error('Function not implemented.');
  }
};

export {
  GENERIC_CHOICES,
  GENERIC_MESSAGES,
  type GenericChoicesKey,
  type GenericChoiceValues, type ProductId
};

export function generateInitialMessages(
  convertPrice: (price: number) => { value: number; formatted: string }
): MessagesType {
  return {
    couples: {
    welcome: "Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre jeu pour les couples non mariés. C'est un excellent choix ! Comment puis-je vous aider ?",
    description: `VIENS ON S'CONNAÎT - En Couple est un jeu de 150 questions qui vous permet de mieux connaître votre partenaire et de renforcer votre relation afin de pouvoir mieux vous projeter en tant que couple. Les questions sont réparties en 3 thèmes importants pour les couples non mariés :

💝 Connexion Émotionnelle : Pour mieux comprendre les sentiments et les besoins de chacun
💫 Projets & Rêves : Pour parler de vos envies et construire votre avenir ensemble
💑 Intimité & Complicité : Pour créer des moments de partage et renforcer votre lien

Plus de 3000 couples utilisent déjà ce jeu pour avoir des conversations importantes de manière simple et naturelle. Chaque carte ouvre la porte à des discussions enrichissantes qui vous rapprochent.`,
    features: `Ce jeu est fait pour vous car :

- Les questions sont simples mais touchent à des sujets importants pour votre couple
- Vous pouvez parler de tout naturellement : argent, famille, projets, vie quotidienne
- Les cartes sont belles et agréables à manipuler
- Vous pouvez jouer n'importe quand, sans règles compliquées
- Le jeu s'adapte à tous les couples, peu importe depuis combien de temps vous êtes ensemble
- La boîte est jolie et facile à ranger`,
    howToPlay: `Le principe est simple et fun ! 🎮

1️⃣ Installez-vous confortablement avec votre partenaire
2️⃣ Tirez une carte à tour de rôle
3️⃣ Répondez chacun honnêtement à la question
4️⃣ Échangez sur vos réponses

Pas de règles compliquées, pas de gagnant ni de perdant - juste des moments authentiques de connexion ! 💑`,
    testimonials: `Voici ce que disent les couples qui utilisent le jeu :

⭐️ Aïssatou (Dakar) : "On joue depuis deux semaines et chaque partie est une nouvelle aventure. Ce jeu nous a vraiment aidés à ouvrir le dialogue sur des sujets qu'on évitait."

⭐️ Fadel (Abidjan) : "Nous sommes ensemble depuis 10 ans, et ce jeu nous a fait découvrir des choses que nous ignorions encore l'un de l'autre. Incroyable !"

⭐️ Oulimata (Nantes) : "J'ai hésité avant d'acheter, mais aucune déception. Ce jeu vaut largement son prix, pour les bons moments qu'il nous permet de passer."`,
pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => { 
    const soloPrice = convertPrice(14000).formatted;
    const duoPrice = convertPrice(25200).formatted;
    const trioPrice = convertPrice(35700).formatted;
    const deliveryCost = convertPrice(3000).formatted;
    
    return `Nous avons plusieurs offres adaptées à vos besoins :

🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost}.`;
  },
    sampleQuestions: `Voici quelques exemples de questions que vous découvrirez dans le jeu :

👉🏼 "Comment imagines-tu notre relation dans 5 ans ?"
👉🏼 "Qu'est-ce qui t'a fait tomber amoureux(se) de moi au début ?"
👉🏼 "Quelle est selon toi notre plus belle réussite en tant que couple ?"
👉🏼 "Quel est le prochain projet important que tu aimerais qu'on réalise ensemble ?"`
  },
  maries: {
    welcome: "Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre jeu pour les couples mariés. C'est un excellent choix ! Comment puis-je vous aider ?",
    description: `"VIENS ON S'CONNAÎT - Entre Mariés" est un jeu de 150 questions créé spécialement pour les couples mariés. Il vous aide à :

💑 Garder votre amour vivant : Retrouvez les petites attentions et moments complices du début
💝 Mieux communiquer : Parlez des sujets importants sans tension ni jugement
💫 Renforcer votre mariage : Construisez une relation plus forte jour après jour

Ce jeu vous permet d'avoir des conversations enrichissantes sur votre vie de couple, vos défis quotidiens et vos projets communs. C'est un moment privilégié pour vous retrouver et prendre soin de votre relation.`,
      features: `Ce jeu est parfait pour votre couple car :

- Les questions sont adaptées à la vie de couple mariée
- Vous pouvez parler de sujets parfois difficiles à aborder naturellement
- Le jeu s'adapte à votre rythme et à votre emploi du temps
- Les cartes sont de très belle qualité
- Le guide inclus vous aide à tirer le meilleur du jeu
- La présentation est élégante et discrète`,
    howToPlay: `Voici comment jouer :

1️⃣ Choisissez un moment calme et confortable
2️⃣ Piochez une carte à tour de rôle
3️⃣ Lisez la question à voix haute
4️⃣ Répondez honnêtement et écoutez votre conjoint(e)
5️⃣ Discutez de vos réponses

L'objectif est de créer des moments de partage authentiques ! 💑`,
    testimonials: `Témoignages de couples mariés qui utilisent le jeu :

⭐️ Moustapha et Adja : "Après 15 ans de mariage, ce jeu nous a permis de redécouvrir des aspects de notre relation qu'on avait oubliés."

⭐️ Sarah et Omar : "Un excellent moyen de maintenir la communication vivante dans notre mariage. On joue une fois par semaine !"

⭐️ Marie et Jean : "Les questions sont vraiment pertinentes et nous aident à aborder des sujets importants de manière naturelle."`,
pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => { 
    const soloPrice = convertPrice(14000).formatted;
    const duoPrice = convertPrice(25200).formatted;
    const trioPrice = convertPrice(35700).formatted;
    const deliveryCost = convertPrice(3000).formatted;
    
    return `Nous avons plusieurs offres adaptées à vos besoins :

🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost}.`;
  },
sampleQuestions: `Voici quelques exemples de questions que vous découvrirez dans le jeu :

👉🏼 "Comment notre mariage a-t-il changé notre relation selon toi ?"
👉🏼 "Quel moment de notre vie conjugale t'a le plus marqué(e) ?"
👉🏼 "Comment pouvons-nous garder notre complicité au fil des années ?"
👉🏼 "Quelle tradition familiale aimerais-tu qu'on crée ensemble ?"`
  },
  famille: {
    welcome: "Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre jeu pour la famille. C'est un excellent choix ! Comment puis-je vous aider ?",
    description: `"VIENS ON S'CONNAÎT - En Famille" est un jeu de 150 cartes qui aide parents et enfants (16+) à mieux se comprendre et à créer des liens plus forts :

👨‍👩‍👧‍👦 Parlez facilement : Abordez tous les sujets importants sans tension
💝 Créez des liens : Apprenez à mieux vous connaître et à vous comprendre
💫 Grandissez ensemble : Partagez vos expériences et vos points de vue
🤗 Restez proches : Gardez une communication ouverte et bienveillante

Ce jeu crée des moments de partage précieux où chacun peut s'exprimer librement et être vraiment écouté.`,
      features: `Ce jeu est idéal pour votre famille car :

- Les questions conviennent aux adolescents (16+) et aux parents
- Chaque sujet est abordé avec respect et bienveillance
- Le jeu s'adapte à toutes les familles et situations
- Les cartes sont solides et durables
- Le guide inclus vous aide à faciliter les discussions
- La boîte est pratique et facile à ranger`,
    howToPlay: `Comment jouer en famille :

1️⃣ Rassemblez la famille dans un endroit confortable
2️⃣ Mélangez les cartes et placez-les au centre
3️⃣ À tour de rôle, piochez une carte
4️⃣ Chacun répond à la question
5️⃣ Échangez librement sur vos réponses

Créez des moments de partage authentiques ! 👨‍👩‍👧‍👦`,
    testimonials: `Ce que disent les familles qui utilisent le jeu :

⭐️ Famille Diop : "Nos ados s'ouvrent plus facilement grâce au jeu. C'est devenu notre rituel du dimanche soir !"

⭐️ Famille Sall : "Un excellent moyen de créer des conversations significatives avec nos enfants."

⭐️ Famille Ndiaye : "Le jeu nous a aidés à mieux nous comprendre et à créer des souvenirs précieux."`,
pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => { 
    const soloPrice = convertPrice(14000).formatted;
    const duoPrice = convertPrice(25200).formatted;
    const trioPrice = convertPrice(35700).formatted;
    const deliveryCost = convertPrice(3000).formatted;
    
    return `Nous avons plusieurs offres adaptées à vos besoins :

🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost}.`;
  },
    sampleQuestions: `Voici quelques exemples de questions que vous découvrirez dans le jeu :

👉🏼 "Quelle est notre plus belle tradition familiale ?"
👉🏼 "Quel est le meilleur conseil qu'un membre de la famille t'a donné ?"
👉🏼 "Comment notre famille gère-t-elle les désaccords selon toi ?"
👉🏼 "Quel moment en famille t'a le plus marqué et pourquoi ?"`
  },
  amis: {
    welcome: "Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre jeu pour les amis. C'est un excellent choix ! Comment puis-je vous aider ?",
    description: `"VIENS ON S'CONNAÎT - Entre Amis" contient 150 cartes pour rendre vos moments entre amis plus enrichissants. Les questions sont réparties en 5 thèmes :

🌟 Vie personnelle : Partagez vos expériences et vos rêves
💝 Relations : Échangez sur vos amitiés et histoires de cœur
💼 Travail : Discutez de vos ambitions et réussites
🤔 Valeurs : Découvrez ce qui compte vraiment pour chacun
🎭 Loisirs : Partagez vos passions et centres d'intérêt

Ce jeu rend chaque moment entre amis plus intéressant en créant des discussions passionnantes et des souvenirs mémorables.`,
      features: `Ce jeu est parfait pour vos soirées car :

- Les questions créent naturellement des discussions passionnantes
- Vous découvrez toujours quelque chose de nouveau sur vos amis
- Le jeu s'adapte à tous types de rencontres
- Les cartes sont belles et faciles à utiliser
- Plusieurs façons de jouer sont proposées
- La boîte est facile à emporter partout`,
    howToPlay: `Le principe est simple :

1️⃣ Rassemblez vos amis dans une ambiance détendue
2️⃣ Mélangez les cartes
3️⃣ Piochez une carte à tour de rôle
4️⃣ Chacun répond à la question
5️⃣ Discutez librement des réponses

Créez des moments mémorables entre amis ! 🤝`,
    testimonials: `Ce que disent les amis qui utilisent le jeu :

⭐️ Groupe de Fatou : "On joue à chaque soirée maintenant. C'est devenu notre activité préférée !"

⭐️ Bande d'Oumar : "Parfait pour briser la glace et créer des liens plus profonds."

⭐️ Les amis de Aminata : "Des fous rires garantis et des discussions passionnantes !"`,
pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => { 
    const soloPrice = convertPrice(14000).formatted;
    const duoPrice = convertPrice(25200).formatted;
    const trioPrice = convertPrice(35700).formatted;
    const deliveryCost = convertPrice(3000).formatted;
    
    return `Nous avons plusieurs offres adaptées à vos besoins :

🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost}.`;
  },
    sampleQuestions: `Voici quelques exemples de questions que vous découvrirez dans le jeu :

👉🏼 "Quelle est la qualité que tu apprécies le plus chez tes amis ?"
👉🏼 "Quel est ton souvenir le plus mémorable entre amis ?"
👉🏼 "Comment définis-tu une véritable amitié ?"
👉🏼 "Quelle aventure aimerais-vous vivre avec tes amis ?"`
  },
  collegues: {
    welcome: "Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre jeu pour les collègues. C'est un excellent choix ! Comment puis-je vous aider ?",
    description: `"VIENS ON S'CONNAÎT - Entre Collègues" est un jeu de 150 cartes qui permet de :

💼 Créer une meilleure ambiance au travail : Apprenez à vraiment connaître vos collègues
🤝 Renforcer l'esprit d'équipe : Développez des liens plus authentiques
💫 Améliorer la communication : Échangez plus facilement au quotidien
🌟 Rendre le travail plus agréable : Créez un environnement où chacun se sent bien

Ce jeu aide à construire des relations professionnelles plus sincères et une meilleure ambiance d'équipe.`,
      features: `Ce jeu est idéal pour votre entreprise car :

- Les questions respectent le cadre professionnel
- Le jeu s'adapte à différents moments (réunions, pauses, team building)
- Les sujets favorisent la cohésion d'équipe
- Les cartes sont de qualité professionnelle
- Le guide inclut des conseils d'utilisation variés
- La présentation est sobre et professionnelle`,
    howToPlay: `Comment utiliser le jeu :
  
  1️⃣ Choisissez un moment propice (pause déjeuner, afterwork...)
  2️⃣ Installez-vous dans un endroit calme
  3️⃣ Piochez une carte à tour de rôle
  4️⃣ Partagez vos réponses et expériences
  5️⃣ Échangez de manière constructive`,
    testimonials: `Ce que disent les équipes qui utilisent le jeu :
  
  ⭐️ Équipe Marketing de Wave : "Excellent outil pour nos team buildings !"
  ⭐️ Service RH d'Orange : "A permis d'améliorer l'ambiance au bureau."
  ⭐️ Équipe de Free : "Parfait pour mieux connaître nos collègues."`,
  pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => { 
    const soloPrice = convertPrice(14000).formatted;
    const duoPrice = convertPrice(25200).formatted;
    const trioPrice = convertPrice(35700).formatted;
    const deliveryCost = convertPrice(3000).formatted;
    
    return `Nous avons plusieurs offres adaptées à vos besoins :

🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost}.`;
  },
    sampleQuestions: `Voici quelques exemples de questions que vous découvrirez dans le jeu :

👉🏼 "Quel est ton plus grand accomplissement professionnel ?"
👉🏼 "Comment définis-tu un environnement de travail idéal ?"
👉🏼 "Quel est le meilleur conseil professionnel que tu aies reçu ?"
👉🏼 "Comment gères-tu l'équilibre entre vie professionnelle et personnelle ?"`
  },
  stvalentin: {
    welcome: "Bonjour 👋 Je suis Rose, votre Assistante d'Achat. Je vois que vous vous intéressez à notre édition spéciale St-Valentin. C'est un excellent choix ! Comment puis-je vous aider ?",
    description: `Notre édition spéciale Saint-Valentin est un cadeau unique qui contient :

💝 130 questions pour mieux vous connaître et parler de votre amour
💫 20 activités romantiques à faire ensemble
💑 Des défis amusants pour pimenter votre relation

Chaque élément est pensé pour créer des moments spéciaux et renforcer votre complicité. C'est un cadeau original qui vous fera vivre une Saint-Valentin mémorable.`,
      features: `Ce jeu est le cadeau idéal car :

- Il mélange parfaitement questions profondes et moments ludiques
- La présentation est très soignée et romantique
- C'est une édition limitée unique
- Les cartes sont de très belle qualité
- Le guide vous aide à créer des moments magiques
- Il est déjà emballé pour offrir, avec un joli ruban`,
    howToPlay: `Comment utiliser le jeu :
  
  1️⃣ Créez une ambiance romantique
  2️⃣ Choisissez entre les cartes questions ou activités
  3️⃣ Suivez les instructions de chaque carte
  4️⃣ Profitez de chaque moment ensemble
  
  Parfait pour une St-Valentin mémorable ! 💑`,
    testimonials: `Ce que disent les couples qui ont testé l'édition St-Valentin :
  
  ⭐️ Mariam et Seydou : "Notre meilleure St-Valentin jusqu'à présent !"
  ⭐️ Aminata et Babacar : "Les activités sont super originales."
  ⭐️ Sophie et Pierre : "Un cadeau qui change des fleurs et chocolats !"`,
  pricing: (convertPrice: (price: number) => { value: number; formatted: string }) => { 
    const soloPrice = convertPrice(14000).formatted;
    const duoPrice = convertPrice(25200).formatted;
    const trioPrice = convertPrice(35700).formatted;
    const deliveryCost = convertPrice(3000).formatted;
    
    return `Voici nos offres spéciales St-Valentin :

🎁 Pack Solo (1 jeu) : ${soloPrice}
🎁 Pack Duo (-10%) : ${duoPrice}
🎁 Pack Trio (-15%) : ${trioPrice}
🎁 Pack Comité (-20%) : à partir de 4 jeux

La livraison est gratuite à Dakar. Pour les autres villes du Sénégal 🇸🇳 et Abidjan 🇨🇮, elle est à ${deliveryCost}.`;
  },
    sampleQuestions: `Voici quelques exemples de questions que vous découvrirez dans le jeu :

👉🏼 "Quel est ton souvenir le plus romantique de notre relation ?"
👉🏼 "Comment aimerais-tu qu'on célèbre nos prochaines St-Valentin ?"
👉🏼 "Quelle a été ta plus belle surprise dans notre relation ?"
👉🏼 "Quel moment de notre histoire d'amour t'a fait le plus sourire ?"`
  }
} as MessagesType;
}