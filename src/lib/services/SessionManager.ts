// src/lib/services/SessionManager.ts
import { supabase } from '@/lib/supabase';

interface SessionData {
  sessionId: string;
  productId: string;
  storeId: string;
  isInitialized: boolean;
  createdAt: string;
  metadata?: any;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionData> = new Map();

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!this.instance) {
      this.instance = new SessionManager();
    }
    return this.instance;
  }

  // Créer ou récupérer une session
  async getOrCreateSession(productId: string, storeId: string): Promise<string> {
    // Générer un sessionId unique
    const sessionId = `${productId}_${storeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Vérifier si une session existe déjà pour ce produit
      const existingSessionId = this.findExistingSession(productId, storeId);
      if (existingSessionId) {
        console.log('📝 Using existing session:', existingSessionId);
        return existingSessionId;
      }

      // Créer une nouvelle session
      const sessionData: SessionData = {
        sessionId,
        productId,
        storeId,
        isInitialized: true,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder en mémoire
      this.sessions.set(sessionId, sessionData);

      // Sauvegarder en base de données
      await this.saveSessionToDatabase(sessionData);

      console.log('✅ New session created:', sessionId);
      return sessionId;

    } catch (error) {
      console.error('❌ Error creating session:', error);
      // Retourner un sessionId même en cas d'erreur
      return sessionId;
    }
  }

  // Vérifier qu'une session existe
  isValidSession(sessionId: string): boolean {
    return this.sessions.has(sessionId) || sessionId.length > 10;
  }

  // Initialiser une session avec des données de base
  async initializeSessionData(sessionId: string, productId: string, storeId: string): Promise<void> {
    if (!this.sessions.has(sessionId)) {
      const sessionData: SessionData = {
        sessionId,
        productId,
        storeId,
        isInitialized: true,
        createdAt: new Date().toISOString()
      };
      
      this.sessions.set(sessionId, sessionData);
      await this.saveSessionToDatabase(sessionData);
    }
  }

  // Trouver une session existante
  private findExistingSession(productId: string, storeId: string): string | null {
    for (const [sessionId, data] of this.sessions.entries()) {
      if (data.productId === productId && data.storeId === storeId) {
        // Vérifier que la session n'est pas trop ancienne (1 heure max)
        const sessionAge = Date.now() - new Date(data.createdAt).getTime();
        if (sessionAge < 60 * 60 * 1000) { // 1 heure
          return sessionId;
        }
      }
    }
    return null;
  }

  // Sauvegarder en base de données
  private async saveSessionToDatabase(sessionData: SessionData): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .upsert({
          id: sessionData.sessionId,
          product_id: sessionData.productId,
          store_id: sessionData.storeId,
          session_data: sessionData,
          created_at: sessionData.createdAt,
          updated_at: new Date().toISOString(),
          status: 'active'
        }, { onConflict: 'id' });

      if (error) {
        console.error('❌ Error saving session to database:', error);
      }
    } catch (error) {
      console.error('❌ Error in saveSessionToDatabase:', error);
    }
  }

  // Nettoyer les anciennes sessions
  cleanupOldSessions(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, data] of this.sessions.entries()) {
      if (new Date(data.createdAt).getTime() < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export default SessionManager;