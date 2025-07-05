// src/lib/services/SalesResponseGenerator.ts - GÉNÉRATION INTELLIGENTE DE RÉPONSES COMMERCIALES

import type { ChatMessage, ConversationStep } from '@/types/chat';
import type { PurchaseIntent } from './PurchaseIntentDetector';
import type { ConversationStrategy } from './ConversationOptimizer';

export interface SalesContext {
  productName: string;
  productPrice: number;
  customerSituation?: string;
  objections?: string[];
  interests?: string[];
  conversationPhase: 'discovery' | 'presentation' | 'objection' | 'closing';
  urgencyLevel: 'none' | 'soft' | 'medium' | 'high';
  personalityType?: 'analytical' | 'emotional' | 'practical' | 'social';
}

export interface SalesResponse {
  content: string;
  choices: string[];
  nextStep: ConversationStep;
  salesTechnique: string;
  emotionalTone: 'confident' | 'empathetic' | 'enthusiastic' | 'reassuring' | 'urgent';
  conversionOriented: boolean;
  flags: {
    shouldTriggerPurchase: boolean;
    createUrgency: boolean;
    addressObjection: boolean;
    buildRapport: boolean;
    provideProof: boolean;
  };
}

// ✅ TYPE POUR LES CLÉS DE TEMPLATES
type TemplateKey = 'high_intent' | 'medium_intent' | 'low_intent' | 'objection_price' | 'objection_efficacy' | 'objection_time' | 'objection_complex';

// ✅ INTERFACE POUR LES TEMPLATES
interface ResponseTemplate {
  content: string;
  choices: string[];
}

export class SalesResponseGenerator {
  private static instance: SalesResponseGenerator;

  // ✅ BIBLIOTHÈQUE DE TECHNIQUES DE VENTE
  private readonly salesTechniques = {
    // Techniques de fermeture (Closing)
    closing: {
      assumptive: 'Je vois que ce jeu correspond parfaitement à vos attentes. Souhaitez-vous que nous procédions à votre commande maintenant, ou préférez-vous commencer par un exemplaire ?',
      alternative: 'Excellent ! Préférez-vous recevoir votre jeu ${productName} dès demain à Dakar, ou dans 2-3 jours avec la livraison standard ?',
      urgency: 'Parfait ! Il nous reste quelques exemplaires du jeu ${productName} aujourd\'hui. Voulez-vous que je vous en réserve un maintenant ?',
      benefit: 'Imaginez-vous dès ce soir en train de découvrir de nouvelles facettes de votre relation avec le jeu ${productName}. Prêt(e) à vivre cette expérience ?'
    },

    // Gestion d'objections
    objections: {
      feel_felt_found: 'Je comprends parfaitement votre ${objection}. Beaucoup de nos clients ont ressenti la même chose au début. Ce qu\'ils ont découvert, c\'est que ${solution}. Qu\'est-ce qui vous rassurerait le plus ?',
      reframe: 'C\'est une excellente question ! En fait, ce que vous mentionnez est exactement pourquoi le jeu ${productName} est si efficace. Laissez-moi vous expliquer...',
      proof: 'Je comprends vos préoccupations. C\'est pour cela que nous avons ${preuve}. Nos clients nous disent que ${benefice}. Cela répond-il à votre question ?'
    },

    // Construction de rapport
    rapport: {
      validation: 'C\'est formidable que vous preniez le temps de vous renseigner sur ${productName}. Cela montre à quel point vos relations vous tiennent à cœur.',
      similarity: 'Beaucoup de nos clients étaient dans une situation similaire à la vôtre. Ils cherchaient exactement ce que vous recherchez...',
      compliment: 'J\'apprécie votre approche réfléchie. C\'est exactement le genre de personnes qui tirent le maximum de bénéfices du jeu ${productName}.'
    },

    // Création de valeur
    value: {
      benefit_stacking: 'Avec le jeu ${productName}, vous obtenez non seulement ${benefice1}, mais aussi ${benefice2}, et même ${benefice3}. Tout cela pour ${prix} seulement.',
      comparison: 'Pour le prix d\'un dîner au restaurant, vous investissez dans quelque chose qui va transformer vos relations de manière durable.',
      roi: 'Pensez-y : ${prix} FCFA pour des années de conversations enrichissantes. C\'est moins que ce que vous dépensez en communication téléphonique par mois.'
    },

    // Preuve sociale
    social_proof: {
      testimonial: 'Nos clients nous disent régulièrement : "${testimonial}". C\'est exactement le type d\'expérience que vous pouvez attendre.',
      stats: 'Plus de ${nombre} couples au Sénégal ont déjà transformé leur relation avec nos jeux. Ils ne peuvent plus s\'en passer !',
      authority: 'Ce jeu a été conçu par des experts en relations humaines et testé avec des centaines de couples avant d\'être lancé.'
    }
  };

  // ✅ TEMPLATES DE RÉPONSES PAR CONTEXTE - AVEC TYPE SÉCURISÉ
  private readonly responseTemplates: Record<TemplateKey, ResponseTemplate> = {
    high_intent: {
      content: 'Excellent ! Je sens que le jeu ${productName} vous a convaincu(e). C\'est le bon moment pour passer à l\'action. Souhaitez-vous que nous procédions à votre commande maintenant ?',
      choices: ['Je veux l\'acheter maintenant', 'Voir les options de livraison', 'Une dernière question']
    },
    
    medium_intent: {
      content: 'Je vois que le jeu ${productName} vous intéresse ! Nos clients dans votre situation nous disent souvent qu\'ils regrettent de ne pas l\'avoir acheté plus tôt. Qu\'est-ce qui vous ferait pencher définitivement ?',
      choices: ['Je veux l\'acheter maintenant', 'Voir les témoignages', 'Comment ça marche exactement ?', 'Combien ça coûte ?']
    },
    
    low_intent: {
      content: 'Je comprends que vous preniez le temps de bien vous renseigner sur le jeu ${productName}. C\'est une excellente approche ! Que puis-je vous expliquer pour vous aider dans votre réflexion ?',
      choices: ['Comment y jouer ?', 'C\'est pour qui exactement ?', 'Voir les témoignages', 'Quel est le prix ?']
    },
    
    objection_price: {
      content: 'Je comprends votre préoccupation concernant le prix. Nos clients nous disent souvent que c\'est le meilleur investissement qu\'ils aient fait pour leur relation. Pensez-y : ${prix} FCFA, c\'est moins que ce que vous dépensez pour sortir au restaurant, mais les bénéfices durent des années. Voulez-vous que je vous explique pourquoi ce jeu vaut chaque franc ?',
      choices: ['Expliquez-moi la valeur', 'Y a-t-il des facilités de paiement ?', 'Je veux quand même l\'acheter', 'J\'ai d\'autres questions']
    },
    
    objection_efficacy: {
      content: 'C\'est une question légitime ! Je comprends que vous vouliez être sûr(e) que ça marche vraiment. C\'est pour cela que nous avons une garantie satisfait ou remboursé. Et nos ${nombre} témoignages clients parlent d\'eux-mêmes. Voulez-vous voir ce que disent nos clients ?',
      choices: ['Voir les témoignages', 'En savoir plus sur la garantie', 'Comment ça marche ?', 'Je veux l\'essayer']
    },

    // ✅ NOUVELLES OBJECTIONS AJOUTÉES
    objection_time: {
      content: 'Je comprends que le temps soit précieux ! C\'est justement pour cela que le jeu ${productName} est si pratique. Une partie peut durer de 15 minutes à 2 heures selon votre disponibilité. Nos clients occupés nous disent que c\'est le meilleur investissement temps qu\'ils aient fait pour leurs relations. Voulez-vous que je vous montre comment l\'adapter à votre emploi du temps ?',
      choices: ['Montrez-moi les options de durée', 'Je veux l\'essayer quand même', 'Comment ça s\'adapte ?', 'Je veux l\'acheter']
    },

    objection_complex: {
      content: 'Je comprends vos préoccupations et c\'est tout à fait normal d\'avoir des questions. C\'est pour cela que je suis là ! Nos clients nous disent que leurs doutes se sont transformés en satisfaction après avoir essayé. Qu\'est-ce qui vous rassurerait le plus pour prendre votre décision ?',
      choices: ['Expliquez-moi en détail', 'Voir les témoignages', 'Comment ça marche ?', 'Je veux quand même l\'acheter']
    }
  };

  public static getInstance(): SalesResponseGenerator {
    if (!this.instance) {
      this.instance = new SalesResponseGenerator();
    }
    return this.instance;
  }

  /**
   * ✅ GÉNÈRE UNE RÉPONSE COMMERCIALE OPTIMISÉE
   */
  public async generateSalesResponse(
    customerMessage: string,
    context: SalesContext,
    intent: PurchaseIntent,
    strategy: ConversationStrategy
  ): Promise<SalesResponse> {
    
    console.log('💼 Generating sales response:', {
      message: customerMessage.substring(0, 50),
      phase: context.conversationPhase,
      intentScore: intent.score,
      urgency: context.urgencyLevel
    });

    // ✅ DÉTERMINER LA STRATÉGIE DE RÉPONSE
    const responseStrategy = this.determineResponseStrategy(intent, context, customerMessage);
    
    // ✅ SÉLECTIONNER LA TECHNIQUE DE VENTE APPROPRIÉE
    const salesTechnique = this.selectSalesTechnique(responseStrategy, context, intent);
    
    // ✅ GÉNÉRER LE CONTENU AVEC IA SI NÉCESSAIRE
    let responseContent: string;
    let responseChoices: string[];
    
    if (responseStrategy.useAI) {
      const aiResponse = await this.generateAIResponse(customerMessage, context, intent, salesTechnique);
      responseContent = aiResponse.content;
      responseChoices = aiResponse.choices;
    } else {
      const templateResponse = this.generateTemplateResponse(responseStrategy.template, context);
      responseContent = templateResponse.content;
      responseChoices = templateResponse.choices;
    }

    // ✅ OPTIMISER LES CHOIX POUR LA CONVERSION
    const optimizedChoices = this.optimizeChoicesForConversion(
      responseChoices, 
      intent, 
      context.conversationPhase
    );

    // ✅ DÉTERMINER L'ÉTAPE SUIVANTE
    const nextStep = this.determineNextStep(intent, context, responseStrategy);

    return {
      content: responseContent,
      choices: optimizedChoices,
      nextStep,
      salesTechnique: salesTechnique.name,
      emotionalTone: responseStrategy.tone,
      conversionOriented: true,
      flags: {
        shouldTriggerPurchase: intent.score >= 70,
        createUrgency: context.urgencyLevel !== 'none',
        addressObjection: this.detectsObjection(customerMessage),
        buildRapport: context.conversationPhase === 'discovery',
        provideProof: this.needsSocialProof(customerMessage, intent)
      }
    };
  }

  /**
   * ✅ DÉTERMINE LA STRATÉGIE DE RÉPONSE OPTIMALE
   */
  private determineResponseStrategy(
    intent: PurchaseIntent,
    context: SalesContext,
    message: string
  ): {
    approach: 'closing' | 'objection_handling' | 'value_building' | 'rapport_building';
    tone: 'confident' | 'empathetic' | 'enthusiastic' | 'reassuring' | 'urgent';
    template: TemplateKey; // ✅ TYPE SÉCURISÉ
    useAI: boolean;
  } {
    
    // ✅ INTENTION FORTE : FERMETURE
    if (intent.score >= 70) {
      return {
        approach: 'closing',
        tone: 'confident',
        template: 'high_intent',
        useAI: false
      };
    }

    // ✅ OBJECTION DÉTECTÉE : GESTION D'OBJECTION
    if (this.detectsObjection(message)) {
      const objectionType = this.identifyObjectionType(message);
      const templateKey = this.getObjectionTemplateKey(objectionType); // ✅ MÉTHODE SÉCURISÉE
      
      return {
        approach: 'objection_handling',
        tone: 'empathetic',
        template: templateKey,
        useAI: objectionType === 'complex' // IA pour objections complexes
      };
    }

    // ✅ INTENTION MOYENNE : CONSTRUCTION DE VALEUR
    if (intent.score >= 40) {
      return {
        approach: 'value_building',
        tone: 'enthusiastic',
        template: 'medium_intent',
        useAI: true // IA pour personnaliser la valeur
      };
    }

    // ✅ INTENTION FAIBLE : CONSTRUCTION DE RAPPORT
    return {
      approach: 'rapport_building',
      tone: 'reassuring',
      template: 'low_intent',
      useAI: true // IA pour personnaliser l'approche
    };
  }

  /**
   * ✅ MÉTHODE SÉCURISÉE POUR OBTENIR LA CLÉ DE TEMPLATE D'OBJECTION
   */
  private getObjectionTemplateKey(objectionType: string): TemplateKey {
    const objectionMap: Record<string, TemplateKey> = {
      'price': 'objection_price',
      'efficacy': 'objection_efficacy',
      'time': 'objection_time',
      'complex': 'objection_complex'
    };

    return objectionMap[objectionType] || 'objection_complex';
  }

  /**
   * ✅ SÉLECTIONNE LA TECHNIQUE DE VENTE APPROPRIÉE
   */
  private selectSalesTechnique(
    strategy: any,
    context: SalesContext,
    intent: PurchaseIntent
  ): { name: string; implementation: string } {
    
    switch (strategy.approach) {
      case 'closing':
        if (context.urgencyLevel === 'high') {
          return {
            name: 'Urgency Close',
            implementation: this.salesTechniques.closing.urgency
          };
        } else if (intent.score >= 85) {
          return {
            name: 'Assumptive Close',
            implementation: this.salesTechniques.closing.assumptive
          };
        } else {
          return {
            name: 'Alternative Close',
            implementation: this.salesTechniques.closing.alternative
          };
        }

      case 'objection_handling':
        return {
          name: 'Feel-Felt-Found',
          implementation: this.salesTechniques.objections.feel_felt_found
        };

      case 'value_building':
        return {
          name: 'Benefit Stacking',
          implementation: this.salesTechniques.value.benefit_stacking
        };

      case 'rapport_building':
      default:
        return {
          name: 'Validation & Similarity',
          implementation: this.salesTechniques.rapport.validation
        };
    }
  }

  /**
   * ✅ GÉNÈRE UNE RÉPONSE AVEC L'IA POUR PERSONNALISATION AVANCÉE
   */
  private async generateAIResponse(
    message: string,
    context: SalesContext,
    intent: PurchaseIntent,
    technique: { name: string; implementation: string }
  ): Promise<{ content: string; choices: string[] }> {
    
    try {
      console.log('🤖 Generating AI sales response with technique:', technique.name);
      
      // ✅ PROMPT COMMERCIAL SPÉCIALISÉ
      const salesPrompt = `Tu es Rose, l'assistante commerciale experte de VIENS ON S'CONNAÎT.

CONTEXTE CLIENT:
- Message: "${message}"
- Produit: le jeu ${context.productName}
- Prix: ${context.productPrice} FCFA
- Phase: ${context.conversationPhase}
- Intention d'achat: ${intent.score}/100 (${intent.confidence})
- Situation: ${context.customerSituation || 'Non spécifiée'}

TECHNIQUE DE VENTE À APPLIQUER: ${technique.name}
${technique.implementation}

CONTRAINTES IMPÉRATIVES:
1. VOUVOIEMENT EXCLUSIF - Toujours vouvoyer le client
2. ORIENTATION CONVERSION - Chaque réponse doit pousser vers l'achat
3. EMPATHIE COMMERCIALE - Comprendre les préoccupations et rassurer
4. PREUVE SOCIALE - Mentionner d'autres clients quand pertinent
5. URGENCE DOUCE - Créer un sentiment d'urgence naturel

STRUCTURE REQUISE:
- Valider l'émotion du client
- Appliquer la technique de vente choisie
- Terminer par une question qui pousse vers l'achat
- Maximum 4 phrases + question finale

EXEMPLES DE QUESTIONS FINALES ORIENTÉES VENTE:
- "Souhaitez-vous que nous procédions à votre commande maintenant ?"
- "Qu'est-ce qui vous ferait pencher définitivement pour ce jeu ?"
- "Êtes-vous prêt(e) à transformer vos relations dès aujourd'hui ?"

Réponds en JSON: {"content": "ta réponse commerciale", "choices": ["choix orienté achat", "choix informatif", "choix objection", "choix urgence"]}`;

      // ✅ APPEL API AVEC PROMPT COMMERCIAL
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: salesPrompt,
          productId: 'sales_generation',
          currentStep: 'sales_ai_generation',
          sessionId: Date.now().toString(),
          storeId: 'vosc_default',
          forceAI: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        try {
          // Essayer de parser comme JSON
          const parsed = JSON.parse(data.message);
          if (parsed.content && parsed.choices) {
            return {
              content: parsed.content,
              choices: Array.isArray(parsed.choices) ? parsed.choices : []
            };
          }
        } catch (parseError) {
          // Si ce n'est pas du JSON, utiliser la réponse directe
          return {
            content: data.message || 'Réponse générée par IA',
            choices: this.getDefaultChoicesForIntent(intent)
          };
        }
      }

      throw new Error('AI generation failed');

    } catch (error) {
      console.error('❌ AI sales response generation failed:', error);
      
      // ✅ FALLBACK AVEC TEMPLATE
      return this.generateTemplateResponse('medium_intent', context);
    }
  }

  /**
   * ✅ GÉNÈRE UNE RÉPONSE BASÉE SUR LES TEMPLATES - VERSION CORRIGÉE
   */
  private generateTemplateResponse(
    templateName: TemplateKey, // ✅ TYPE STRICT AU LIEU DE STRING
    context: SalesContext
  ): { content: string; choices: string[] } {
    
    // ✅ VÉRIFICATION TYPE-SAFE AVEC MÉTHODE HELPER
    const template = this.getTemplate(templateName);
    
    // ✅ REMPLACER LES VARIABLES DANS LE TEMPLATE
    const content = template.content
      .replace(/\$\{productName\}/g, context.productName)
      .replace(/\$\{prix\}/g, context.productPrice.toLocaleString())
      .replace(/\$\{nombre\}/g, '500+'); // Nombre de clients satisfaits

    return {
      content,
      choices: template.choices
    };
  }

  /**
   * ✅ MÉTHODE HELPER POUR ACCÈS SÉCURISÉ AUX TEMPLATES
   */
  private getTemplate(templateName: TemplateKey | string): ResponseTemplate {
    // ✅ VÉRIFICATION AVEC TYPE GUARD
    if (this.isValidTemplateKey(templateName)) {
      return this.responseTemplates[templateName];
    }
    
    // ✅ FALLBACK SÉCURISÉ
    console.warn(`Template '${templateName}' not found, using low_intent fallback`);
    return this.responseTemplates.low_intent;
  }

  /**
   * ✅ TYPE GUARD POUR VÉRIFIER LES CLÉS DE TEMPLATE
   */
  private isValidTemplateKey(key: string): key is TemplateKey {
    return key in this.responseTemplates;
  }

  /**
   * ✅ OPTIMISE LES CHOIX POUR MAXIMISER LA CONVERSION
   */
  private optimizeChoicesForConversion(
    originalChoices: string[],
    intent: PurchaseIntent,
    phase: string
  ): string[] {
    
    const optimizedChoices = [...originalChoices];
    
    // ✅ S'assurer qu'il y a toujours un bouton d'achat visible
    if (!optimizedChoices.some(choice => choice.includes('acheter'))) {
      optimizedChoices.unshift('Je veux l\'acheter maintenant');
    }

    // ✅ RÉORGANISER SELON L'INTENTION
    if (intent.score >= 60) {
      // Intention forte : mettre l'achat en premier
      const purchaseChoice = optimizedChoices.find(c => c.includes('acheter'));
      if (purchaseChoice) {
        optimizedChoices.splice(optimizedChoices.indexOf(purchaseChoice), 1);
        optimizedChoices.unshift(purchaseChoice);
      }
    }

    // ✅ LIMITER À 4 CHOIX MAXIMUM POUR L'UX
    return optimizedChoices.slice(0, 4);
  }

  /**
   * ✅ DÉTERMINE L'ÉTAPE SUIVANTE BASÉE SUR L'INTENTION
   */
  private determineNextStep(
    intent: PurchaseIntent,
    context: SalesContext,
    strategy: any
  ): ConversationStep {
    
    if (intent.score >= 70) {
      return 'express_quantity';
    }

    if (strategy.approach === 'objection_handling') {
      return 'objection_handled';
    }

    if (context.conversationPhase === 'closing') {
      return 'closing_attempt';
    }

    return 'sales_response_generated';
  }

  /**
   * ✅ MÉTHODES UTILITAIRES DE DÉTECTION
   */
  
  private detectsObjection(message: string): boolean {
    const objectionSignals = [
      'mais', 'cependant', 'toutefois', 'sauf que', 'problème', 
      'cher', 'prix', 'doute', 'sceptique', 'pas sûr', 'hésitation',
      'pas convaincu', 'efficace', 'marche vraiment', 'preuve'
    ];
    
    const lowerMessage = message.toLowerCase();
    return objectionSignals.some(signal => lowerMessage.includes(signal));
  }

  private identifyObjectionType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('cher') || lowerMessage.includes('prix') || lowerMessage.includes('coût')) {
      return 'price';
    }
    
    if (lowerMessage.includes('efficace') || lowerMessage.includes('marche') || lowerMessage.includes('résultat')) {
      return 'efficacy';
    }
    
    if (lowerMessage.includes('temps') || lowerMessage.includes('occupé')) {
      return 'time';
    }
    
    return 'complex';
  }

  private needsSocialProof(message: string, intent: PurchaseIntent): boolean {
    const socialProofTriggers = [
      'preuve', 'témoignage', 'avis', 'clients', 'efficace', 
      'marche vraiment', 'résultats', 'expérience'
    ];
    
    const lowerMessage = message.toLowerCase();
    const needsProof = socialProofTriggers.some(trigger => lowerMessage.includes(trigger));
    
    // Ou si l'intention est moyenne et qu'on a besoin de rassurer
    return needsProof || (intent.score >= 30 && intent.score <= 60);
  }

  private getDefaultChoicesForIntent(intent: PurchaseIntent): string[] {
    if (intent.score >= 70) {
      return [
        'Je veux l\'acheter maintenant',
        'Voir les options de livraison',
        'Une dernière question'
      ];
    } else if (intent.score >= 40) {
      return [
        'Je veux l\'acheter maintenant',
        'Voir les témoignages',
        'Comment ça marche exactement ?',
        'J\'ai d\'autres questions'
      ];
    } else {
      return [
        'Comment y jouer ?',
        'C\'est pour qui exactement ?',
        'Je veux l\'acheter maintenant',
        'Voir les témoignages'
      ];
    }
  }

  /**
   * ✅ GÉNÈRE DES MESSAGES D'URGENCE APPROPRIÉS
   */
  public generateUrgencyMessage(
    context: SalesContext,
    urgencyType: 'stock' | 'price' | 'time' | 'bonus'
  ): { content: string; choices: string[] } {
    
    const urgencyMessages = {
      stock: {
        content: `⚠️ **Attention !** Il ne nous reste que quelques exemplaires du jeu ${context.productName} en stock aujourd'hui. Ne manquez pas cette opportunité de transformer vos relations !

Voulez-vous que je vous en réserve un maintenant ?`,
        choices: [
          '✅ Oui, réservez-le moi',
          'Combien en reste-t-il ?',
          'Je réfléchis encore'
        ]
      },
      
      price: {
        content: `🎯 **Offre spéciale !** Profitez de notre prix de lancement pour le jeu ${context.productName}. Cette offre ne durera pas, nos prix augmenteront bientôt.

Souhaitez-vous profiter de cette opportunité maintenant ?`,
        choices: [
          'Je veux en profiter maintenant',
          'Jusqu\'à quand cette offre ?',
          'Quel sera le nouveau prix ?'
        ]
      },
      
      time: {
        content: `⏰ **Dernières heures !** Notre promotion sur le jeu ${context.productName} se termine ce soir à minuit. Après cela, retour au prix normal.

Ne laissez pas passer cette chance !`,
        choices: [
          'Je commande avant minuit',
          'C\'est vraiment le dernier jour ?',
          'Quel est l\'avantage ?'
        ]
      },
      
      bonus: {
        content: `🎁 **Bonus exclusif !** Commandez le jeu ${context.productName} maintenant et recevez GRATUITEMENT notre guide "10 Secrets pour des Conversations Profondes" (valeur 2,500 FCFA).

Cette offre est limitée aux 50 prochains clients !`,
        choices: [
          'Je veux ce bonus gratuit',
          'Que contient ce guide ?',
          'Combien de places restantes ?'
        ]
      }
    };

    return urgencyMessages[urgencyType] || urgencyMessages.stock;
  }

  /**
   * ✅ ADAPTE LE TON SELON LE TYPE DE PERSONNALITÉ DÉTECTÉ
   */
  public adaptResponseToPersonality(
    baseResponse: string,
    personalityType: SalesContext['personalityType']
  ): string {
    
    switch (personalityType) {
      case 'analytical':
        return baseResponse.replace(/émotions|sentiment/g, 'données et résultats')
                         .replace(/ressentir/g, 'constater')
                         .replace(/croire/g, 'vérifier');
        
      case 'emotional':
        return baseResponse.replace(/fonctionnalités/g, 'expériences émotionnelles')
                         .replace(/efficace/g, 'transformateur')
                         .replace(/résultats/g, 'moments magiques');
        
      case 'practical':
        return baseResponse.replace(/possibilités/g, 'solutions concrètes')
                         .replace(/imaginer/g, 'voir concrètement')
                         .replace(/potentiel/g, 'bénéfices directs');
        
      case 'social':
        return baseResponse.replace(/vous/g, 'vous et vos proches')
                         .replace(/votre expérience/g, 'l\'expérience de votre entourage')
                         .replace(/témoignage/g, 'histoire partagée');
        
      default:
        return baseResponse;
    }
  }
}