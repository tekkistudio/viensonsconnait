// src/lib/error-handling.ts

import { PostgrestError } from '@supabase/supabase-js';

/**
 * Types d'erreurs spécifiques à l'application
 */
export interface AppError extends Error {
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Convertit différents types d'erreurs en message lisible
 */
export const handleError = (error: unknown): string => {
  // Gestion des erreurs Supabase
  if (isPostgrestError(error)) {
    return formatSupabaseError(error);
  }

  // Gestion des erreurs standard
  if (error instanceof Error) {
    return error.message;
  }

  // Gestion des erreurs sous forme de chaîne
  if (typeof error === 'string') {
    return error;
  }

  // Erreur par défaut
  return "Une erreur inattendue s'est produite";
};

/**
 * Vérifie si l'erreur est une erreur Supabase
 */
const isPostgrestError = (error: unknown): error is PostgrestError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'details' in error &&
    'hint' in error &&
    'message' in error
  );
};

/**
 * Formate les erreurs Supabase en messages lisibles
 */
const formatSupabaseError = (error: PostgrestError): string => {
  switch (error.code) {
    case '23502': // not_null_violation
      return "Un champ obligatoire n'a pas été renseigné";
    case '23505': // unique_violation
      return 'Cette entrée existe déjà';
    case '23503': // foreign_key_violation
      return 'Une référence invalide a été détectée';
    case '42P01': // undefined_table
      return 'Erreur de configuration de la base de données';
    default:
      return error.message || "Une erreur s'est produite lors de l'opération";
  }
};

/**
 * Crée une erreur typée pour l'application
 */
export const createAppError = (message: string, details?: Partial<AppError>): AppError => {
  const error = new Error(message) as AppError;
  if (details) {
    Object.assign(error, details);
  }
  return error;
};