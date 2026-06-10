"use client";

import { Box, HStack, Text, Flex, Image, SimpleGrid } from "@chakra-ui/react";
import { FaTwitch, FaXTwitter, FaSpotify, FaTiktok } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuChevronDown } from "react-icons/lu";
import { useAvatar } from "@/lib/avatars";
import { useColors } from "@/theme/useColors";

type Host = { name: string; role: string; handle: string; key: "banks" | "ansem"; img: string };

const HOSTS: Host[] = [
  { name: "Banks", role: "Co-host", handle: "@banks", key: "banks", img: "/banks.jpg" },
  { name: "Ansem", role: "Co-host", handle: "@blknoiz06", key: "ansem", img: "/ansem.jpg" },
];

const SOCIALS = [
  { label: "Twitch", icon: <FaTwitch size={16} /> },
  { label: "Kick", icon: <SiKick size={14} /> },
  { label: "X", icon: <FaXTwitter size={15} /> },
  { label: "Spotify", icon: <FaSpotify size={16} /> },
  { label: "TikTok", icon: <FaTiktok size={15} /> },
];

function HostCard({ host }: { host: Host }) {
  const c = useColors();
  const accent = host.key === "banks" ? c.streamer.banks : c.streamer.ansem;
  const src = useAvatar(host.img);
  return (
    <HStack
      as="a"
      href={`https://x.com/${host.handle.replace("@", "")}`}
      target="_blank"
      rel="noopener noreferrer"
      spacing="13px"
      p="14px"
      borderRadius={c.radius.card}
      bg={c.surfaceLight}
      border="1px solid"
      borderColor={c.border.subtle}
      _hover={{ textDecoration: "none" }}
    >
      <Box
        w="46px"
        h="46px"
        borderRadius="full"
        overflow="hidden"
        flexShrink={0}
        border="1.5px solid"
        borderColor={accent}
      >
        <Image src={src} alt={host.name} w="100%" h="100%" objectFit="cover" />
      </Box>
      <Box>
        <Text fontSize="md" fontWeight={600} color={c.text.primary}>
          {host.name}
        </Text>
        <Text fontSize="xs" color={c.text.muted}>
          {host.role}
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color={c.text.subtle} mt="3px">
          {host.handle}
        </Text>
      </Box>
    </HStack>
  );
}

export function ShowInfo({ open = true, onToggle }: { open?: boolean; onToggle?: () => void }) {
  const c = useColors();
  return (
    <Box mt="22px" px="8px">
      <Box borderTop="1px solid" borderColor={c.border.subtle} pt="22px">
        <Flex
          as="button"
          onClick={onToggle}
          align="center"
          justify="space-between"
          w="100%"
          mb={{ base: open ? "10px" : "0", lg: "10px" }}
          cursor={{ base: "pointer", lg: "default" }}
          aria-label="Toggle show details"
        >
          <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em" color={c.text.subtle}>
            ABOUT THE SHOW
          </Text>
          <Box
            display={{ base: "flex", lg: "none" }}
            color={c.text.subtle}
            transform={open ? "rotate(180deg)" : "none"}
            transition="transform 0.2s"
          >
            <LuChevronDown size={16} />
          </Box>
        </Flex>

        <Box display={{ base: open ? "block" : "none", lg: "block" }}>
        <Text fontSize="md" lineHeight={1.7} color={c.text.secondary} maxW="640px">
          Market Bubble is a live markets show where Banks and Ansem break down crypto, trade ideas,
          and the week&apos;s biggest moves — unfiltered. Make money, command attention, leverage AI.
        </Text>

        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="12px" mt="20px" maxW="640px">
          {HOSTS.map((h) => (
            <HostCard key={h.key} host={h} />
          ))}
        </SimpleGrid>

        <HStack spacing="8px" mt="20px">
          {SOCIALS.map((s) => (
            <Flex
              key={s.label}
              as="button"
              align="center"
              justify="center"
              w="38px"
              h="38px"
              borderRadius={c.radius.control}
              bg={c.overlay.soft}
              border="1px solid"
              borderColor={c.border.subtle}
              color={c.text.secondary}
              _hover={{ color: c.text.primary, bg: c.overlay.hover }}
              transition="all 0.15s"
              aria-label={s.label}
            >
              {s.icon}
            </Flex>
          ))}
        </HStack>
        </Box>
      </Box>
    </Box>
  );
}
