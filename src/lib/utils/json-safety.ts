// src/lib/utils/json-safety.ts - PROTECTION CONTRE LES ERREURS JSON
/**
 * Utilitaires pour la gestion sécurisée du JSON
 * Protection contre les erreurs d'extensions navigateur
 */

// ✅ Parse JSON sécurisé
export function safeJsonParse<T = any>(jsonString: string | null | undefined, defaultValue?: T): T | null {
  if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
    return defaultValue || null;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.warn('⚠️ JSON parse error, using default value:', {
      input: jsonString?.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return defaultValue || null;
  }
}

// ✅ Stringify JSON sécurisé
export function safeJsonStringify(obj: any, defaultValue: string = '{}'): string {
  if (obj === undefined || obj === null) {
    return defaultValue;
  }

  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('⚠️ JSON stringify error, using default value:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return defaultValue;
  }
}

// ✅ Vérifier si une chaîne est un JSON valide
export function isValidJson(str: string): boolean {
  if (!str || str === 'undefined' || str === 'null') {
    return false;
  }

  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// ✅ Parse avec validation de type
export function parseWithTypeCheck<T>(
  jsonString: string | null | undefined,
  validator: (obj: any) => obj is T,
  defaultValue: T
): T {
  const parsed = safeJsonParse(jsonString);
  
  if (parsed && validator(parsed)) {
    return parsed;
  }
  
  return defaultValue;
}

// ✅ Protection contre les extensions de navigateur
export function protectedLocalStorageGet(key: string, defaultValue: any = null): any {
  try {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    const item = window.localStorage.getItem(key);
    return safeJsonParse(item, defaultValue);
  } catch (error) {
    console.warn(`⚠️ LocalStorage access error for key "${key}":`, error);
    return defaultValue;
  }
}

// ✅ Protection pour sessionStorage
export function protectedSessionStorageGet(key: string, defaultValue: any = null): any {
  try {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    const item = window.sessionStorage.getItem(key);
    return safeJsonParse(item, defaultValue);
  } catch (error) {
    console.warn(`⚠️ SessionStorage access error for key "${key}":`, error);
    return defaultValue;
  }
}

// ✅ Wrapper sécurisé pour localStorage.setItem
export function protectedLocalStorageSet(key: string, value: any): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const stringValue = safeJsonStringify(value);
    window.localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.warn(`⚠️ LocalStorage set error for key "${key}":`, error);
    return false;
  }
}

// ✅ Nettoyage des données corrompues
export function cleanupCorruptedStorage(): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    // Nettoyer localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (!isValidJson(value || '')) {
          console.warn(`🧹 Removing corrupted localStorage item: ${key}`);
          localStorage.removeItem(key);
        }
      }
    }

    // Nettoyer sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (!isValidJson(value || '')) {
          console.warn(`🧹 Removing corrupted sessionStorage item: ${key}`);
          sessionStorage.removeItem(key);
        }
      }
    }

    console.log('✅ Storage cleanup completed');
  } catch (error) {
    console.warn('⚠️ Storage cleanup failed:', error);
  }
}