// src/utils/arrayHelpers.ts

/**
 * Convertit un tableau en lecture seule en tableau modifiable
 * @param readonlyArray Le tableau en lecture seule à convertir
 * @returns Un nouveau tableau modifiable
 */
export function toMutableArray<T>(readonlyArray: readonly T[]): T[] {
    return Array.from(readonlyArray);
  }
  
  /**
   * Vérifie si un tableau est vide
   * @param array Le tableau à vérifier
   * @returns true si le tableau est vide ou undefined
   */
  export function isEmptyArray(array: any[] | undefined): boolean {
    return !array || array.length === 0;
  }