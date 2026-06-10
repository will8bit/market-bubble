"use client";

import { useEffect, useState } from "react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "@/theme";
import { ProModeProvider } from "@/lib/proMode";
import { StatsProvider } from "@/lib/chat/StatsProvider";
import { AuthProvider } from "@/lib/auth";
import { preloadAvatars } from "@/lib/avatars";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    preloadAvatars(["/banks.jpg", "/ansem.jpg"]);
  }, []);

  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {mounted ? (
        <ChakraProvider theme={theme}>
          <AuthProvider>
            <ProModeProvider>
              <StatsProvider>{children}</StatsProvider>
            </ProModeProvider>
          </AuthProvider>
        </ChakraProvider>
      ) : null}
    </>
  );
}
