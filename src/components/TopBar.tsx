"use client";

import { HStack, Text, Flex, Box } from "@chakra-ui/react";
import { LuLayoutDashboard } from "react-icons/lu";
import { Logo } from "./Logo";
import { TickerBar } from "./TickerBar";
import { ProfileMenu } from "./ProfileMenu";
import { useProMode } from "@/lib/proMode";
import { useColors } from "@/theme/useColors";

function ProToggle() {
  const c = useColors();
  const { pro, setPro } = useProMode();
  return (
    <HStack
      as="button"
      onClick={() => setPro(!pro)}
      display={{ base: "none", lg: "flex" }}
      spacing="7px"
      px="11px"
      py="7px"
      borderRadius={c.radius.pill}
      bg={pro ? c.overlay.strong : c.overlay.soft}
      border="1px solid"
      borderColor={pro ? c.border.strong : "transparent"}
      color={pro ? c.text.primary : c.text.muted}
      _hover={{ color: c.text.primary, bg: c.overlay.hover }}
      transition="all 0.15s"
      aria-label="Toggle pro mode"
    >
      <LuLayoutDashboard size={15} />
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em">
        PRO
      </Text>
    </HStack>
  );
}

export function TopBar() {
  const c = useColors();
  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      px={{ base: "16px", md: "22px" }}
      h="60px"
      flexShrink={0}
      bg={c.surface}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.panel}
      boxShadow={c.shadow.soft}
    >
      <Box flexShrink={0}>
        <Logo />
      </Box>

      <TickerBar />

      <HStack spacing={{ base: "8px", md: "10px" }} flexShrink={0}>
        <ProToggle />
        <ProfileMenu />
      </HStack>
    </Flex>
  );
}
