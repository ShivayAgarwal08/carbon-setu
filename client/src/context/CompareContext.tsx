import React, { createContext, useContext, useState } from 'react';
import { GovernmentRecord } from '../types';

interface CompareContextType {
  selectedRecords: GovernmentRecord[];
  addRecord: (record: GovernmentRecord) => void;
  removeRecord: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedRecords, setSelectedRecords] = useState<GovernmentRecord[]>([]);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const addRecord = (record: GovernmentRecord) => {
    setSelectedRecords(prev => {
      if (prev.some(r => r.id === record.id)) return prev;
      if (prev.length >= 3) {
        // limit to 3 schemes
        return [...prev.slice(1), record];
      }
      return [...prev, record];
    });
    setDrawerOpen(true);
  };

  const removeRecord = (id: string) => {
    setSelectedRecords(prev => prev.filter(r => r.id !== id));
  };

  const clearCompare = () => {
    setSelectedRecords([]);
    setDrawerOpen(false);
  };

  const isInCompare = (id: string) => {
    return selectedRecords.some(r => r.id === id);
  };

  return (
    <CompareContext.Provider
      value={{
        selectedRecords,
        addRecord,
        removeRecord,
        clearCompare,
        isInCompare,
        isDrawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};
