import { createContext } from 'react';
import type { NostrContextType } from './NostrContextTypes';

export const NostrContext = createContext<NostrContextType | undefined>(
  undefined
);
