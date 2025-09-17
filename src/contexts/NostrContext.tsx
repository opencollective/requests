import { createContext } from 'react';
import type { NostrContextType } from '../contexts/NostrProvider';

export const NostrContext = createContext<NostrContextType | undefined>(
  undefined
);
