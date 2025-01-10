import { NextResponse } from 'next/server';

export class APIErrorHandler {
  static handle(error: unknown) {
    console.error('API Error:', error);

    // Si c'est une erreur OpenAI
    if (error && typeof error === 'object' && 'status' in error) {
      return NextResponse.json(
        {
          content: "Je suis désolée, je rencontre un problème technique. Puis-je vous rediriger vers notre service client ?",
          type: "assistant",
          choices: ["Réessayer", "Parler à un humain"],
          error: `OPENAI_ERROR_${error.status}`
        },
        { status: error.status as number }
      );
    }

    // Pour toute autre erreur
    return NextResponse.json(
      {
        content: "Je suis désolée, je rencontre un problème technique. Voulez-vous réessayer ou parler à un conseiller ?",
        type: "assistant",
        choices: ["Réessayer", "Parler à un humain"],
        error: "INTERNAL_SERVER_ERROR"
      },
      { status: 500 }
    );
  }
}