"use client";

import { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { TopBar } from "@/components/TopBar";
import { VideoStage } from "@/components/VideoStage";
import { ShowInfo } from "@/components/ShowInfo";
import { ChatPanel } from "@/components/ChatPanel";
import { MarketsPanel, AudienceBox } from "@/components/ProPanels";
import { useProActive } from "@/lib/proMode";
import { useColors } from "@/theme/useColors";

export default function Page() {
  const c = useColors();
  const pro = useProActive();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <Flex
      direction="column"
      h={{ base: "100dvh", lg: "100vh" }}
      bg={c.bg}
      color={c.text.primary}
      overflow="hidden"
      p={{ base: "8px", md: "14px" }}
      gap={{ base: "8px", md: "14px" }}
    >
      <TopBar />

      <Flex
        direction={{ base: "column", lg: "row" }}
        flex="1"
        minH={0}
        gap={{ base: "8px", md: "14px" }}
        overflowY={{ base: "hidden", lg: "visible" }}
      >
        {pro && (
          <Box w={{ base: "100%", lg: "300px" }} flexShrink={0} minH={{ base: "360px", lg: 0 }}>
            <MarketsPanel />
          </Box>
        )}

        {pro ? (
          <Box
            flex="1"
            minW={0}
            minH={0}
            overflowY="auto"
            display="flex"
            flexDirection="column"
            sx={{ "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}
          >
            <Box
              bg={c.surface}
              border="1px solid"
              borderColor={c.border.subtle}
              borderRadius={c.radius.panel}
              boxShadow={c.shadow.soft}
              p={{ base: "12px", md: "18px" }}
              flexShrink={0}
              mb={{ base: "8px", md: "14px" }}
            >
              <VideoStage hideViewerCount />
            </Box>
            <Box flex="1 0 auto" display="flex" flexDirection="column">
              <AudienceBox />
            </Box>
          </Box>
        ) : (
          <Box
            flex={{ base: "0 0 auto", lg: "1 1 0%" }}
            minW={0}
            minH={0}
            overflowY={{ base: "visible", lg: "auto" }}
            display={{ lg: "flex" }}
            flexDirection={{ lg: "column" }}
            sx={{ "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}
          >
            <Box
              bg={c.surface}
              border="1px solid"
              borderColor={c.border.subtle}
              borderRadius={c.radius.panel}
              boxShadow={c.shadow.soft}
              p={{ base: "12px", md: "18px" }}
              flexShrink={0}
              mb={{ base: "8px", md: "14px" }}
            >
              <VideoStage />
            </Box>
            <Box
              bg={c.surface}
              border="1px solid"
              borderColor={c.border.subtle}
              borderRadius={c.radius.panel}
              boxShadow={c.shadow.soft}
              p={{ base: "12px", md: "18px" }}
              flex={{ lg: "1 0 auto" }}
            >
              <ShowInfo open={aboutOpen} onToggle={() => setAboutOpen((o) => !o)} />
            </Box>
          </Box>
        )}

        <Box
          w={{ base: "100%", lg: "392px" }}
          flex={{ base: "1 1 0", lg: "0 0 auto" }}
          minH={0}
          bg={c.surface}
          border="1px solid"
          borderColor={c.border.subtle}
          borderRadius={c.radius.panel}
          boxShadow={c.shadow.soft}
          overflow="hidden"
        >
          <ChatPanel />
        </Box>
      </Flex>
    </Flex>
  );
}
