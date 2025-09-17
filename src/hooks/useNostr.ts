import { useContext } from 'react';
import { NostrContext } from '../contexts/NostrContext';
import type { NostrContextType } from '../contexts/NostrProvider';

export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);
  if (context === undefined) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}
