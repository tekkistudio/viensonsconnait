import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorAlert({ 
  title = "Erreur", 
  message, 
  onRetry 
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="ml-4 bg-white dark:bg-gray-800"
          >
            Réessayer
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}