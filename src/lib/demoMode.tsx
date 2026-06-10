"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface DemoModeContext {
  demo: boolean;
  setDemo: (value: boolean) => void;
}

const Context = createContext<DemoModeContext>({ demo: true, setDemo: () => {} });

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemoState] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mb-demo");
      if (saved !== null) setDemoState(saved === "true");
    } catch {}
  }, []);

  const setDemo = (value: boolean) => {
    setDemoState(value);
    try {
      localStorage.setItem("mb-demo", String(value));
    } catch {}
  };

  return <Context.Provider value={{ demo, setDemo }}>{children}</Context.Provider>;
}

export function useDemoMode() {
  return useContext(Context);
}
