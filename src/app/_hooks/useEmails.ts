import { useState } from 'react';
import useSWR from 'swr';

// Definir tipos
export interface Email {
  id: string;
  emailId: string;
  from: string;
  to: string;
  subject: string;
  receivedDate: string;
  status: "necesitaAtencion" | "informativo" | "respondido";
  lastResponseBy: string | null;
  preview: string;
  fullContent?: string;
}

interface EmailResponse {
  emails: Email[];
  stats: {
    necesitaAtencion: number;
    informativo: number;
    respondido: number;
  };
}

interface UseEmailsOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

export const useEmails = (options: UseEmailsOptions = {}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Función para obtener emails
  const fetcher = async (url: string): Promise<EmailResponse> => {
    const response = await fetch('/api/correos');
    if (!response.ok) {
      throw new Error(`Error al obtener correos: ${response.status}`);
    }
    const data = await response.json();
    return data;
  };
  
  // Usar SWR para obtener y cachear los datos
  const { data, error, mutate } = useSWR<EmailResponse>(
    'emails', 
    fetcher, 
    {
      refreshInterval: options.refreshInterval,
      revalidateOnFocus: options.revalidateOnFocus,
      dedupingInterval: 5000, // Evitar múltiples solicitudes en 5 segundos
      onErrorRetry: (error: any, key: any, config: any, revalidate: any, { retryCount }: { retryCount: number }) => {
        // No reintentar después de cierto número de intentos
        if (retryCount >= 3) return;
        
        // Reintentar después de 5 segundos
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );
  
  // Forzar actualización de forma manual
  const refreshEmails = async () => {
    try {
      setIsRefreshing(true);
      
      // Simplemente revalidar los datos con SWR
      await mutate();
      
      return true;
    } catch (error) {
      console.error('Error al refrescar correos:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Función para actualizar el estado de un correo
  const updateEmail = async (documentId: string, updates: Partial<Email>) => {
    try {
      console.log(`🔄 Actualizando email con documentId: ${documentId}, nuevo estado: ${updates.status}`);
      
      // Actualizar de forma optimista la UI
      mutate(
        (currentData: EmailResponse | undefined) => {
          if (!currentData || !currentData.emails) return currentData;
          
          const updatedEmails = currentData.emails.map((email: Email) =>
            email.id === documentId ? { ...email, ...updates } : email
          );
          
          return {
            ...currentData,
            emails: updatedEmails,
            stats: {
              ...currentData.stats,
              necesitaAtencion: updatedEmails.filter((e: Email) => e.status === 'necesitaAtencion').length,
              informativo: updatedEmails.filter((e: Email) => e.status === 'informativo').length,
              respondido: updatedEmails.filter((e: Email) => e.status === 'respondido').length
            }
          };
        },
        false // No revalidar inmediatamente
      );
      
      // Si es una actualización de estado, enviarla al API
      if (updates.status) {
        console.log(`📤 Enviando actualización a API para documentId: ${documentId}`);
        
        const response = await fetch(`/api/correos/update-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            emailId: documentId, // Enviar el documentId como emailId
            status: updates.status,
            lastResponseBy: updates.lastResponseBy || null
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response:', errorData);
          throw new Error(`Error al actualizar estado: ${response.status} - ${errorData.error || response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Actualización exitosa:', result);
      }
      
      // Revalidar después de un tiempo para asegurar la consistencia
      setTimeout(() => mutate(), 2000);
      
      return true;
    } catch (error) {
      console.error('Error al actualizar correo:', error);
      // Revalidar para asegurar que los datos son correctos
      mutate();
      return false;
    }
  };
  
  // Extraer estadísticas y emails
  const emails = data?.emails || [];
  const stats = data?.stats || {
    necesitaAtencion: 0,
    informativo: 0,
    respondido: 0
  };
  
  return {
    emails,
    stats,
    isLoading: !error && !data,
    isRefreshing,
    error,
    refreshEmails,
    updateEmail
  };
}; 