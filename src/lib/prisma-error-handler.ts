// src/lib/prisma-error-handler.ts
import { 
    PrismaClientKnownRequestError,
    PrismaClientValidationError
  } from '@prisma/client/runtime/library';
  
  export class PrismaErrorHandler {
    static handle(error: unknown) {
      if (error instanceof PrismaClientKnownRequestError) {
        // Erreurs connues de Prisma
        switch (error.code) {
          case 'P2002':
            return {
              message: 'Une entrée unique existe déjà avec ces données.',
              code: 'UNIQUE_CONSTRAINT'
            };
          case 'P2014':
            return {
              message: 'La relation spécifiée est invalide.',
              code: 'INVALID_RELATION'
            };
          case 'P2003':
            return {
              message: 'Contrainte de clé étrangère non respectée.',
              code: 'FOREIGN_KEY_CONSTRAINT'
            };
          default:
            return {
              message: 'Une erreur de base de données est survenue.',
              code: 'DATABASE_ERROR'
            };
        }
      }
  
      if (error instanceof PrismaClientValidationError) {
        return {
          message: 'Les données fournies sont invalides.',
          code: 'VALIDATION_ERROR'
        };
      }
  
      return {
        message: 'Une erreur inattendue est survenue.',
        code: 'UNKNOWN_ERROR'
      };
    }
  }