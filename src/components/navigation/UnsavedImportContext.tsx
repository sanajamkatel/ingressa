"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface UnsavedImportContextValue {
  pendingCount: number;
  setPendingCount: (count: number) => void;
}

const UnsavedImportContext = createContext<UnsavedImportContextValue>({
  pendingCount: 0,
  setPendingCount: () => {},
});

export function UnsavedImportProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <UnsavedImportContext.Provider value={{ pendingCount, setPendingCount }}>
      {children}
    </UnsavedImportContext.Provider>
  );
}

export function useUnsavedImport() {
  return useContext(UnsavedImportContext);
}
