// features/blog/services/blogService.ts
import type { Article } from '../../../types/blog';

// Articles mockés pour le développement
const articles: Article[] = [
  {
    id: 1,
    slug: "5-conversations-essentielles-couples",
    title: "5 conversations essentielles pour les couples avant le mariage",
    excerpt: "Découvrez les sujets cruciaux à aborder avec votre partenaire pour construire une base solide avant le grand jour.",
    content: `
      <h2>Introduction</h2>
      <p>Le mariage est une étape importante qui mérite une préparation approfondie, non seulement sur le plan logistique, mais surtout sur le plan relationnel. Voici les conversations essentielles à avoir avant de franchir ce grand pas.</p>

      <h2>1. Les attentes et les valeurs</h2>
      <p>Chaque personne aborde le mariage avec ses propres attentes et valeurs. Il est crucial de les partager ouvertement pour s'assurer que vous êtes sur la même longueur d'onde. Discutez de vos visions du mariage, de vos valeurs familiales et de vos attentes mutuelles.</p>

      <h2>2. La gestion financière</h2>
      <p>L'argent est l'une des principales sources de conflit dans les couples. Abordez ouvertement vos habitudes financières, vos dettes éventuelles, et comment vous envisagez de gérer vos finances une fois mariés. Parlez de vos objectifs financiers et de votre vision de l'épargne.</p>

      <h2>3. Les projets de vie</h2>
      <p>Avoir une vision claire de vos projets de vie communs est essentiel. Discutez de vos aspirations professionnelles, de vos désirs d'enfants, de l'endroit où vous souhaitez vivre et de comment vous voyez votre vie dans 5, 10 ou 20 ans.</p>

      <h2>4. La communication et la résolution des conflits</h2>
      <p>Comprendre vos styles de communication respectifs et établir des stratégies saines pour gérer les désaccords est crucial. Parlez de vos expériences passées et de comment vous souhaitez gérer les conflits dans votre mariage.</p>

      <h2>5. La place des familles</h2>
      <p>Le mariage unit deux familles. Discutez de la place que vous souhaitez accorder à vos familles respectives, des traditions que vous voulez maintenir et de comment gérer les potentielles influences familiales.</p>

      <h2>Conclusion</h2>
      <p>Ces conversations peuvent sembler intimidantes, mais elles sont essentielles pour construire une base solide pour votre mariage. Prenez le temps de les avoir dans un esprit d'ouverture et d'honnêteté. Plus vous serez transparents l'un envers l'autre, plus vous renforcerez votre relation.</p>
    `,
    featured: true,
    image: "/images/blog/marriage-preparation.jpg",
    category: "couples",
    readTime: "8 min",
    date: "2024-01-15",
    tags: ["couple", "mariage", "communication"],
    author: {
      id: 1,
      name: "Sarah Ndiaye",
      role: "Conseillère conjugale",
      image: "/images/team/sarah.jpg"
    }
  },
  {
    id: 2,
    slug: "renforcer-liens-familiaux",
    title: "Comment renforcer les liens familiaux à l'ère du numérique",
    excerpt: "Dans un monde hyperconnecté, voici comment maintenir des relations familiales authentiques et significatives.",
    content: `
      <h2>Introduction</h2>
      <p>À l'ère du numérique, maintenir des liens familiaux forts peut sembler un défi. Voici des stratégies concrètes pour renforcer vos relations familiales.</p>

      <h2>1. Créer des moments dédiés</h2>
      <p>Instaurez des rituels familiaux réguliers où les écrans sont bannis. Que ce soit un dîner hebdomadaire ou une activité mensuelle, ces moments sont précieux pour créer des souvenirs durables.</p>

      <h2>2. Utiliser la technologie à bon escient</h2>
      <p>La technologie peut aussi être un allié pour maintenir le contact avec la famille éloignée. Organisez des appels vidéo réguliers et partagez des moments importants de manière créative.</p>

      <h2>3. Cultiver l'écoute active</h2>
      <p>Prenez le temps d'écouter vraiment chaque membre de la famille. Montrez de l'intérêt pour leurs activités, leurs passions et leurs préoccupations.</p>

      <h2>4. Créer des traditions familiales</h2>
      <p>Les traditions renforcent le sentiment d'appartenance. Créez des rituels uniquement vôtres qui deviendront des souvenirs précieux.</p>

      <h2>Conclusion</h2>
      <p>Dans notre monde moderne, il est plus important que jamais de cultiver activement nos liens familiaux. Avec de l'intention et de la régularité, vous pouvez créer des connexions profondes et durables.</p>
    `,
    featured: true,
    image: "/images/blog/article2.jpg",
    category: "family",
    readTime: "6 min",
    date: "2024-01-10",
    tags: ["famille", "communication", "traditions"],
    author: {
      id: 2,
      name: "Aminata Diallo",
      role: "Psychologue familiale",
      image: "/images/team/aminata.jpg"
    }
  },
  {
    id: 3,
    slug: "art-ecoute-active",
    title: "L'art de l'écoute active dans les relations",
    excerpt: "Apprenez les techniques pour devenir un meilleur auditeur et approfondir vos relations.",
    content: `
      <h2>Introduction</h2>
      <p>L'écoute active est une compétence fondamentale pour construire des relations profondes et significatives. Découvrez comment la maîtriser.</p>

      <h2>1. Qu'est-ce que l'écoute active ?</h2>
      <p>L'écoute active va au-delà du simple fait d'entendre. C'est un engagement total dans la conversation, en portant attention non seulement aux mots, mais aussi au langage corporel et aux émotions non exprimées.</p>

      <h2>2. Les techniques d'écoute active</h2>
      <p>
        - Maintenir un contact visuel approprié
        - Utiliser des expressions faciales engageantes
        - Poser des questions pertinentes
        - Reformuler pour vérifier la compréhension
      </p>

      <h2>3. Les obstacles à éviter</h2>
      <p>Évitez les interruptions, les jugements hâtifs et la préparation mentale de votre réponse pendant que l'autre parle.</p>

      <h2>Conclusion</h2>
      <p>L'écoute active demande de la pratique, mais c'est un investissement qui transformera profondément vos relations.</p>
    `,
    featured: true,
    image: "/images/blog/article3.jpg",
    category: "Communication",
    readTime: "5 min",
    date: "2024-01-05",
    tags: ["communication", "relations", "développement personnel"],
    author: {
      id: 3,
      name: "Omar Sy",
      role: "Coach relationnel",
      image: "/images/team/omar.jpg"
    }
  }
];

export const blogService = {
    getAllArticles: () => {
      console.log("getAllArticles appelé, nombre d'articles:", articles.length);
      return articles;
    },
  
    getArticleBySlug: (slug: string) => {
      console.log("getArticleBySlug appelé avec le slug:", slug);
      console.log("Slugs disponibles:", articles.map(a => a.slug));
      const article = articles.find(article => article.slug === slug);
      console.log("Article trouvé:", article ? "oui" : "non");
      return article;
    },
  
    getRecommendedArticles: (currentArticleId: number, limit: number = 3) => {
      return articles
        .filter(article => article.id !== currentArticleId)
        .slice(0, limit);
    }
  };