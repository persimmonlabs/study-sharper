'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ProcessingFile {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface ProcessingContextType {
  processingFiles: ProcessingFile[];
  addProcessingFile: (file: ProcessingFile) => void;
  updateProcessingFile: (id: string, updates: Partial<ProcessingFile>) => void;
  removeProcessingFile: (id: string) => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);

  const addProcessingFile = useCallback((file: ProcessingFile) => {
    setProcessingFiles((prev) => [...prev, file]);
  }, []);

  const updateProcessingFile = useCallback((id: string, updates: Partial<ProcessingFile>) => {
    setProcessingFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...updates } : file))
    );
  }, []);

  const removeProcessingFile = useCallback((id: string) => {
    setProcessingFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  return (
    <ProcessingContext.Provider
      value={{
        processingFiles,
        addProcessingFile,
        updateProcessingFile,
        removeProcessingFile,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  );
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within ProcessingProvider');
  }
  return context;
}
