"use client";

import { useEffect, useState } from "react";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "@/theme";
import { ProModeProvider } from "@/lib/proMode";
import { StatsProvider } from "@/lib/chat/StatsProvider";
import { ShowProvider } from "@/lib/showConfig";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider } from "@/lib/auth";
import { GoLiveNotifier } from "@/components/GoLiveNotifier";
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
            <SettingsProvider>
              <ProModeProvider>
                <StatsProvider>
                  <ShowProvider>
                    <GoLiveNotifier />
                    {children}
                  </ShowProvider>
                </StatsProvider>
              </ProModeProvider>
            </SettingsProvider>
          </AuthProvider>
        </ChakraProvider>
      ) : null}
    </>
  );
}
