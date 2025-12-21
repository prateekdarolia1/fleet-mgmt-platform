/**
 * Hook for managing import session state
 *
 * Maintains session state across wizard steps
 */

import { useState } from 'react';
import type { ImportSession, EntityType } from '@/types/import';

/**
 * Generates a unique session ID
 */
function generateSessionId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates initial import session
 */
function createInitialSession(): ImportSession {
  return {
    sessionId: generateSessionId(),
    entityType: 'vehicles',
    uploadedFile: null,
    uploadTimestamp: new Date(),
    parsedData: [],
    headerMapping: {},
    currentStep: 0,
    templateDownloaded: false,
  };
}

/**
 * Hook for managing import session state
 */
export function useImportSession() {
  const [session, setSession] = useState<ImportSession>(createInitialSession());

  const updateSession = (updates: Partial<ImportSession>) => {
    setSession(prev => ({ ...prev, ...updates }));
  };

  const resetSession = () => {
    setSession(createInitialSession());
  };

  return {
    session,
    updateSession,
    resetSession,
  };
}
