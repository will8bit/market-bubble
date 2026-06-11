"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { TopBar } from "@/components/TopBar";
import { VideoStage } from "@/components/VideoStage";
import { AudienceBox } from "@/components/ProPanels";
import { ChatPanel } from "@/components/ChatPanel";
import { AdminTools } from "@/components/AdminTools";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/theme/useColors";

export default function AdminPage() {
  const c = useColors();
  const { admin, ready } = useAuth();

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

      {!ready ? (
        <Flex flex="1" align="center" justify="center">
          <Text fontFamily="mono" fontSize="sm" color={c.text.muted}>
            Loading…
          </Text>
        </Flex>
      ) : !admin ? (
        <Flex flex="1" direction="column" align="center" justify="center" gap="12px" textAlign="center" px="20px">
          <Text fontFamily="heading" fontWeight={400} fontSize="3xl" color={c.text.primary}>
            Not authorized
          </Text>
          <Text fontSize="sm" color={c.text.muted}>
            The admin dashboard is restricted to Market Bubble admins.
          </Text>
          <Box
            as="a"
            href="/"
            mt="4px"
            px="16px"
            py="9px"
            borderRadius={c.radius.control}
            bg={c.overlay.soft}
            color={c.text.primary}
            fontWeight={600}
            fontSize="sm"
            _hover={{ bg: c.overlay.hover }}
          >
            Back to stream
          </Box>
        </Flex>
      ) : (
        <Flex
          direction={{ base: "column", lg: "row" }}
          flex="1"
          minH={0}
          gap={{ base: "8px", md: "14px" }}
          overflowY={{ base: "auto", lg: "visible" }}
        >
          <Box w={{ base: "100%", lg: "320px" }} flexShrink={0} minH={{ base: "440px", lg: 0 }}>
            <AdminTools />
          </Box>

          <Box
            flex="1"
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
              <VideoStage hideViewerCount />
            </Box>
            <Box flex={{ lg: "1 0 auto" }} display={{ lg: "flex" }} flexDirection={{ lg: "column" }}>
              <AudienceBox />
            </Box>
          </Box>

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
      )}
    </Flex>
  );
}
