"use client";

import { Box, Flex, Text, Spinner } from "@chakra-ui/react";
import { TopBar } from "@/components/TopBar";
import { VideoStage } from "@/components/VideoStage";
import { AudienceBox } from "@/components/ProPanels";
import { ChatPanel } from "@/components/ChatPanel";
import { AdminTools } from "@/components/AdminTools";
import { useAuth } from "@/lib/auth";
import { useChatFeed } from "@/lib/chat/useChatFeed";
import { useColors } from "@/theme/useColors";

export default function AdminPage() {
  const c = useColors();
  const { admin, ready } = useAuth();
  const { messages } = useChatFeed(false);

  // TEMP: open the admin dashboard to everyone (no login) so the competition
  // judges can view it. Set this back to false to re-lock it to admins only.
  const PUBLIC_ADMIN = true;
  const canView = PUBLIC_ADMIN || admin;

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

      {!canView && !ready ? (
        <Flex flex="1" align="center" justify="center">
          <Spinner
            size="lg"
            thickness="3px"
            speed="0.7s"
            color={c.text.secondary}
            emptyColor={c.overlay.soft}
          />
        </Flex>
      ) : !canView ? (
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
            <AdminTools messages={messages} />
          </Box>

          <Box
            flex="1"
            minW={0}
            minH={0}
            display={{ base: "block", lg: "flex" }}
            flexDirection={{ lg: "column" }}
            gap={{ base: "8px", md: "14px" }}
            overflow={{ base: "visible", lg: "hidden" }}
          >
            <Box
              bg={c.surface}
              border="1px solid"
              borderColor={c.border.subtle}
              borderRadius={c.radius.panel}
              boxShadow={c.shadow.soft}
              p={{ base: "12px", md: "18px" }}
              mb={{ base: "8px", lg: 0 }}
              flex={{ lg: "1" }}
              minH={{ lg: 0 }}
              overflow="hidden"
              display={{ lg: "flex" }}
              flexDirection={{ lg: "column" }}
            >
              <VideoStage hideViewerCount fitHeight />
            </Box>
            <Box
              flex={{ lg: "1" }}
              minH={{ lg: 0 }}
              overflow="hidden"
              display={{ lg: "flex" }}
              flexDirection={{ lg: "column" }}
            >
              <AudienceBox admin messages={messages} />
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
            <ChatPanel searchBar />
          </Box>
        </Flex>
      )}
    </Flex>
  );
}
