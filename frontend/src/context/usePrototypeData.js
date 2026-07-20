import { createContext, useContext } from "react";

export const PrototypeDataContext = createContext(null);

export function usePrototypeData() {
  const context = useContext(PrototypeDataContext);
  if (!context) {
    throw new Error("usePrototypeData must be used inside PrototypeDataProvider");
  }
  return context;
}
