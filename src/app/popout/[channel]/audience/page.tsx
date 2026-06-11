"use client";

import { Flex } from "@chakra-ui/react";
import { AudienceBox } from "@/components/ProPanels";
import { useChatFeed } from "@/lib/chat/useChatFeed";
import { useColors } from "@/theme/useColors";

export default function PopoutAudience() {
  const c = useColors();
  const { messages } = useChatFeed(false);
  return (
    <Flex
      direction="column"
      h="100vh"
      bg={c.bg}
      color={c.text.primary}
      overflow="hidden"
      p="14px"
    >
      <AudienceBox admin messages={messages} popout />
    </Flex>
  );
}
