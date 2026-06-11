"use client";

import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { LuExternalLink, LuCornerDownLeft } from "react-icons/lu";
import { requestClosePopout } from "@/lib/usePopout";
import { useColors } from "@/theme/useColors";

export function PoppedOut({
  label,
  url,
  winName,
  features,
  popoutKey,
}: {
  label: string;
  url: string;
  winName: string;
  features: string;
  popoutKey: string;
}) {
  const c = useColors();
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="100%"
      w="100%"
      gap="16px"
      p="24px"
      textAlign="center"
    >
      <Flex
        w="48px"
        h="48px"
        align="center"
        justify="center"
        borderRadius="14px"
        bg={c.overlay.soft}
        color={c.text.muted}
      >
        <LuExternalLink size={20} />
      </Flex>

      <Box>
        <Text fontFamily="heading" fontWeight={400} fontSize="2xl" color={c.text.primary} lineHeight={1.1}>
          {label} popped out
        </Text>
        <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.muted} mt="6px">
          OPEN IN A SEPARATE WINDOW
        </Text>
      </Box>

      <HStack spacing="8px">
        <Box
          as="button"
          onClick={() => window.open(url, winName, features)}
          px="14px"
          py="9px"
          borderRadius={c.radius.control}
          bg={c.overlay.soft}
          _hover={{ bg: c.overlay.hover }}
          color={c.text.primary}
          fontWeight={600}
          fontSize="sm"
        >
          Focus window
        </Box>
        <HStack
          as="button"
          onClick={() => requestClosePopout(popoutKey)}
          spacing="7px"
          px="14px"
          py="9px"
          borderRadius={c.radius.control}
          border="1px solid"
          borderColor={c.border.subtle}
          color={c.text.secondary}
          _hover={{ color: c.text.primary, bg: c.overlay.soft }}
        >
          <LuCornerDownLeft size={14} />
          <Text fontWeight={600} fontSize="sm">
            Bring back
          </Text>
        </HStack>
      </HStack>
    </Flex>
  );
}
