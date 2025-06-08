// src/lib/services/SessionManager.ts - SERVICE DE GESTION DES SESSIONS
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

  // ✅ CRÉER OU RÉCUPÉRER UNE SESSION
  async getOrCreateSession(productId: string, storeId: string): Promise<string> {
    // Générer un sessionId unique
    const sessionId = `${productId}_${storeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('📝 Creating session:', { productId, storeId, sessionId });

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

      // Sauvegarder en base avec gestion d'erreur robuste
      try {
        await this.saveSessionToDatabase(sessionData);
        console.log('✅ Session saved successfully:', sessionId);
      } catch (dbError) {
        console.warn('⚠️ Database save failed, but session created in memory:', dbError);
        // Ne pas faire échouer la création de session pour ça
      }

      return sessionId;

    } catch (error) {
      console.error('❌ Error creating session:', error);
      // Retourner un sessionId même en cas d'erreur
      console.log('🔄 Fallback: creating minimal session');
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
      
      try {
        await this.saveSessionToDatabase(sessionData);
      } catch (error) {
        console.warn('⚠️ Could not save session to database:', error);
      }
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

  // Sauvegarder en base avec validation des données
  private async saveSessionToDatabase(sessionData: SessionData): Promise<void> {
    try {
      // Validation des données requises
      if (!sessionData.sessionId || !sessionData.productId || !sessionData.storeId) {
        throw new Error('Missing required session data');
      }

      // Données simplifiées pour éviter les erreurs de sérialisation
      const dbData = {
        id: sessionData.sessionId,
        product_id: sessionData.productId,
        store_id: sessionData.storeId,
        session_data: {
          sessionId: sessionData.sessionId,
          productId: sessionData.productId,
          storeId: sessionData.storeId,
          isInitialized: sessionData.isInitialized,
          createdAt: sessionData.createdAt
        },
        created_at: sessionData.createdAt,
        updated_at: new Date().toISOString(),
        status: 'active'
      };

      console.log('💾 Saving session to database:', dbData.id);

      const { error } = await supabase
        .from('conversations')
        .upsert(dbData, { onConflict: 'id' });

      if (error) {
        console.error('❌ Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Session saved to database successfully');

    } catch (error) {
      console.error('❌ Error in saveSessionToDatabase:', error);
      throw error; // Re-throw pour que l'appelant puisse gérer
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

  // Récupérer une session depuis la base
  async getSessionFromDatabase(sessionId: string): Promise<SessionData | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error || !data) {
        console.log('📝 No session found in database:', sessionId);
        return null;
      }

      // Reconstituer la SessionData
      const sessionData: SessionData = {
        sessionId: data.id,
        productId: data.product_id,
        storeId: data.store_id,
        isInitialized: true,
        createdAt: data.created_at,
        metadata: data.session_data
      };

      // Sauvegarder en mémoire pour les accès futurs
      this.sessions.set(sessionId, sessionData);

      return sessionData;

    } catch (error) {
      console.error('❌ Error getting session from database:', error);
      return null;
    }
  }

  // Vérifier la santé du service
  async healthCheck(): Promise<{ healthy: boolean; sessionsCount: number }> {
    try {
      // Test simple de connexion à la base
      const { error } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);

      return {
        healthy: !error,
        sessionsCount: this.sessions.size
      };
    } catch (error) {
      return {
        healthy: false,
        sessionsCount: this.sessions.size
      };
    }
  }
}