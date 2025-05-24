// src/components/admin/AuthDebug.tsx
'use client';

import { useAuth } from './AuthProvider';
import { useState } from 'react';

export function AuthDebug() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm z-50">
      <button onClick={() => setExpanded(!expanded)} className="text-sm text-blue-600">
        {expanded ? 'Masquer' : 'Afficher'} l'état de l'authentification
      </button>
      
      {expanded && (
        <div className="mt-2 text-xs">
          <pre className="overflow-auto">
            {JSON.stringify(
              {
                isAuthenticated,
                isLoading,
                user
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}