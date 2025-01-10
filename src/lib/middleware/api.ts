// src/lib/middleware/api.ts
import { NextResponse } from 'next/server';

export function withTimeout(handler: (req: Request) => Promise<Response>, timeoutMs = 15000) {
  return async (req: Request) => {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      });

      const responsePromise = handler(req);
      const response = await Promise.race([responsePromise, timeoutPromise]);
      
      return response;
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof Error && error.message === 'Request timeout') {
        return NextResponse.json({
          content: "Je suis désolée, la réponse prend plus de temps que prévu. Pourriez-vous reformuler votre question ?",
          type: "assistant",
          choices: ["Réessayer", "Parler à un humain"]
        }, { status: 408 });
      }

      return NextResponse.json({
        content: "Je suis désolée, je rencontre un problème technique. Voulez-vous réessayer ?",
        type: "assistant",
        choices: ["Réessayer", "Parler à un humain"]
      }, { status: 500 });
    }
  };
}