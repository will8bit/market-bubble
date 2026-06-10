"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useBreakpointValue } from "@chakra-ui/react";

interface ProModeContext {
  pro: boolean;
  setPro: (value: boolean) => void;
}

const Context = createContext<ProModeContext>({ pro: false, setPro: () => {} });

export function ProModeProvider({ children }: { children: React.ReactNode }) {
  const [pro, setProState] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mb-pro");
      if (saved !== null) setProState(saved === "true");
    } catch {}
  }, []);

  const setPro = (value: boolean) => {
    setProState(value);
    try {
      localStorage.setItem("mb-pro", String(value));
    } catch {}
  };

  return <Context.Provider value={{ pro, setPro }}>{children}</Context.Provider>;
}

export function useProMode() {
  return useContext(Context);
}

export function useProAvailable() {
  return useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? false;
}

export function useProActive() {
  const { pro } = useProMode();
  const available = useProAvailable();
  return pro && available;
}
