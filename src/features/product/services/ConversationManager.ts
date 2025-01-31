// src/features/product/services/ConversationManager.ts

interface ConversationFlow {
    stages: {
      discovery: string[];
      consideration: string[];
      decision: string[];
      checkout: string[];
    };
    transitions: {
      [key: string]: {
        nextStage: keyof ConversationFlow['stages'];
        conditions: string[];
      };
    };
  }
  
  export class ConversationManager {
    private flow: ConversationFlow = {
      stages: {
        discovery: [
          "Qu'est-ce qui vous intéresse dans nos jeux ?",
          "Avez-vous déjà joué à des jeux similaires ?",
          "Pour quelle occasion cherchez-vous un jeu ?"
        ],
        consideration: [
          "Voulez-vous que je vous explique comment fonctionne le jeu ?",
          "Combien de personnes joueront ensemble ?",
          "Préférez-vous un jeu plus détendu ou plus profond ?"
        ],
        decision: [
          "Souhaitez-vous voir nos différentes offres ?",
          "Avez-vous une préférence pour le mode de livraison ?",
          "Quel mode de paiement vous conviendrait le mieux ?"
        ],
        checkout: [
          "Pour finaliser votre commande, j'aurais besoin de quelques informations",
          "Pouvez-vous me confirmer votre numéro de téléphone ?",
          "À quelle adresse souhaitez-vous être livré ?"
        ]
      },
      transitions: {
        discovery_to_consideration: {
          nextStage: 'consideration',
          conditions: ['product_interest_shown', 'questions_asked']
        },
        consideration_to_decision: {
          nextStage: 'decision',
          conditions: ['features_explained', 'price_discussed']
        },
        decision_to_checkout: {
          nextStage: 'checkout',
          conditions: ['payment_method_chosen', 'delivery_discussed']
        }
      }
    };
  
    public suggestNextQuestion(
      currentStage: keyof ConversationFlow['stages'],
      answeredQuestions: string[]
    ): string {
      const stageQuestions = this.flow.stages[currentStage];
      return stageQuestions.find(q => !answeredQuestions.includes(q)) || 
             this.getDefaultQuestion(currentStage);
    }
  
    public shouldTransition(
      currentStage: keyof ConversationFlow['stages'],
      conditions: string[]
    ): boolean {
      const transition = this.flow.transitions[`${currentStage}_to_${this.getNextStage(currentStage)}`];
      return transition.conditions.every(condition => conditions.includes(condition));
    }
  
    private getNextStage(currentStage: keyof ConversationFlow['stages']): string {
      const stages = Object.keys(this.flow.stages);
      const currentIndex = stages.indexOf(currentStage);
      return stages[currentIndex + 1] || stages[currentIndex];
    }
  
    private getDefaultQuestion(stage: keyof ConversationFlow['stages']): string {
      const defaults = {
        discovery: "Comment puis-je vous aider à trouver le jeu parfait ?",
        consideration: "Que souhaitez-vous savoir de plus sur nos jeux ?",
        decision: "Êtes-vous prêt à passer commande ?",
        checkout: "Pouvons-nous procéder au paiement ?"
      };
      return defaults[stage];
    }
  }