import { useContext } from 'react';
import { NostrContext, type NostrContextType } from '../contexts/NostrContext';

export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);
  if (context === undefined) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}
