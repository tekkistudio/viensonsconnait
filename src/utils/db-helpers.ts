// src/utils/db-helpers.ts

import { supabase } from '@/lib/supabase';

/**
 * Fonction utilitaire pour incrémenter un compteur dans metadata
 */
export async function incrementMetadataCounter(
  table: string,
  id: string,
  counterName: string
): Promise<number> {
  try {
    // D'abord, obtenir le compte actuel
    const { data } = await supabase
      .from(table)
      .select(`metadata->>${counterName}`)
      .eq('id', id)
      .single();
      
    // Utiliser une assertion de type plus sûre
    const counterValue = data ? 
      data[`metadata->>${counterName}` as keyof typeof data] as string | null : null;
    
    // Extraire la valeur actuelle avec gestion d'erreurs
    const currentValue = counterValue ? parseInt(counterValue) : 0;
    const newValue = isNaN(currentValue) ? 1 : currentValue + 1;
    
    // Créer un objet pour la mise à jour
    const updateObj: Record<string, any> = {};
    const metadataObj: Record<string, any> = {};
    metadataObj[counterName] = newValue;
    updateObj.metadata = metadataObj;
    
    // Mettre à jour avec le nouveau compte
    await supabase
      .from(table)
      .update(updateObj)
      .eq('id', id);
      
    return newValue;
  } catch (error) {
    console.error(`Error incrementing counter ${counterName} in ${table}:`, error);
    return 0;
  }
}

/**
 * Fonction spécifique pour incrémenter le compteur de messages
 */
export async function incrementMessageCount(sessionId: string): Promise<number> {
  try {
    if (!sessionId) {
      console.warn('Cannot increment message count: sessionId is empty');
      return 0;
    }

    // D'abord, obtenir le compte actuel
    const { data, error } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('id', sessionId)
      .single();
      
    if (error) {
      console.warn('Error fetching conversation metadata:', error);
      
      // Si la conversation n'existe pas, créer une métadonnée par défaut
      const defaultMetadata = {
        messageCount: 1,
        lastMessageAt: new Date().toISOString()
      };
      
      try {
        // Tenter de créer une nouvelle conversation avec des métadonnées initiales
        await supabase
          .from('conversations')
          .insert({
            id: sessionId,
            metadata: defaultMetadata,
            created_at: new Date().toISOString(),
            status: 'active'
          });
        
        return 1; // Premier message
      } catch (insertError) {
        console.error('Error creating new conversation:', insertError);
        return 0;
      }
    }
    
    // Vérifier si data existe et a une propriété metadata
    let metadata = data?.metadata || {};
    
    // S'assurer que metadata est un objet
    if (typeof metadata !== 'object' || metadata === null) {
      metadata = {};
    }
    
    // Récupérer le compteur actuel avec gestion d'erreur
    let currentCount = 0;
    try {
      currentCount = typeof metadata.messageCount === 'number' 
        ? metadata.messageCount 
        : parseInt(String(metadata.messageCount || '0'));
      
      // Si le parsing échoue, fallback à 0
      if (isNaN(currentCount)) currentCount = 0;
    } catch (parseError) {
      console.warn('Error parsing message count:', parseError);
      currentCount = 0;
    }
    
    const newCount = currentCount + 1;
    
    // Créer un objet pour la mise à jour
    const updateData = {
      metadata: {
        ...metadata,
        messageCount: newCount,
        lastMessageAt: new Date().toISOString()
      }
    };
    
    // Mettre à jour avec le nouveau compte
    try {
      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', sessionId);
    } catch (updateError) {
      console.error('Error updating message count:', updateError);
      // Continuer malgré l'erreur
    }
      
    return newCount;
  } catch (error) {
    console.error('Error incrementing message count:', error);
    return 0;
  }
}

// Fonction pour exécuter une requête SQL RPC si disponible
export async function executeIncrementRPC(
  tableName: string,
  idFieldName: string,
  idValue: string,
  counterName: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('increment_counter', {
      table_name: tableName,
      id_field: idFieldName,
      id_value: idValue,
      column_name: counterName
    });
    
    if (error) {
      throw error;
    }
    
    return data as number;
  } catch (error) {
    console.error('Error executing increment RPC:', error);
    // Fallback à la méthode standard
    return incrementMetadataCounter(tableName, idValue, counterName);
  }
}