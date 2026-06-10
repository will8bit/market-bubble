"use client";

import { useState, useEffect, useRef } from "react";
import { Box, HStack, VStack, Text, Flex, AspectRatio } from "@chakra-ui/react";
import { FaTwitch, FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuEye } from "react-icons/lu";
import { Platform } from "@/lib/chat/types";
import { useColors } from "@/theme/useColors";
import { useStats } from "@/lib/chat/StatsProvider";
import { MarketBubbleMark } from "./Logo";

const SOURCES: Platform[] = ["twitch", "kick", "x"];

function SourceIcon({ platform }: { platform: Platform }) {
  if (platform === "twitch") return <FaTwitch size={14} />;
  if (platform === "x") return <FaXTwitter size={14} />;
  return <SiKick size={13} />;
}

function Uptime() {
  const c = useColors();
  const stats = useStats();
  const startedAt = stats?.viewers.twitchStartedAt ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!startedAt) {
    return (
      <Text fontFamily="mono" fontSize="lg" fontWeight={600} color={c.text.subtle}>
        —
      </Text>
    );
  }

  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const pad = (n: number) => n.toString().padStart(2, "0");
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return (
    <Text fontFamily="mono" fontSize="lg" fontWeight={600} color={c.text.muted}>
      {label}
    </Text>
  );
}

function SourceTabs({
  source,
  setSource,
}: {
  source: Platform;
  setSource: (p: Platform) => void;
}) {
  const c = useColors();
  return (
    <HStack
      spacing="0"
      w="fit-content"
      bg={c.overlay.soft}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.control}
      overflow="hidden"
    >
      {SOURCES.map((s, i) => {
        const active = s === source;
        return (
          <Flex
            key={s}
            as="button"
            onClick={() => setSource(s)}
            align="center"
            justify="center"
            w="48px"
            h="36px"
            bg={active ? c.overlay.strong : "transparent"}
            color={active ? c.text.primary : c.text.muted}
            borderLeft={i > 0 ? "1px solid" : "none"}
            borderColor={c.border.subtle}
            _hover={{ color: c.text.primary, bg: c.overlay.hover }}
            transition="all 0.15s"
          >
            <SourceIcon platform={s} />
          </Flex>
        );
      })}
    </HStack>
  );
}

const TEST_CHANNELS = {
  twitch: process.env.NEXT_PUBLIC_VIDEO_TWITCH,
  kick: process.env.NEXT_PUBLIC_VIDEO_KICK,
};

function XFallback() {
  const c = useColors();
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="14px"
      w="100%"
      h="100%"
      bg="#000"
      px="20px"
      textAlign="center"
    >
      <Box color="#e7e9ea" transform="scale(1.7)">
        <FaXTwitter size={20} />
      </Box>
      <Text fontFamily="mono" fontSize="xs" color="rgba(255,255,255,0.55)" letterSpacing="0.05em">
        LIVE ON X CAN&apos;T BE EMBEDDED
      </Text>
      <Box
        as="a"
        href="https://x.com"
        target="_blank"
        rel="noopener noreferrer"
        px="14px"
        py="8px"
        borderRadius={c.radius.control}
        bg="rgba(255,255,255,0.1)"
        color="#fff"
        fontSize="sm"
        fontWeight={600}
        _hover={{ bg: "rgba(255,255,255,0.18)" }}
        transition="background 0.15s"
      >
        Watch on X ↗
      </Box>
    </Flex>
  );
}

function OfflineScreen() {
  return (
    <Flex
      position="absolute"
      inset="0"
      direction="column"
      align="center"
      justify="center"
      gap="14px"
      bg="#000"
      textAlign="center"
      px="20px"
    >
      <Box color="#fefefe">
        <MarketBubbleMark size={42} />
      </Box>
      <Text fontFamily="heading" fontWeight={400} fontSize="4xl" color="#fefefe" lineHeight={1.1}>
        We&apos;re offline
      </Text>
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.12em" color="rgba(255,255,255,0.55)">
        LIVE EVERY THURSDAY · 1PM PST
      </Text>
    </Flex>
  );
}

type TwitchPlayerInstance = { addEventListener(event: string, cb: () => void): void; destroy?(): void };
type TwitchSDK = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => TwitchPlayerInstance;
};

function TwitchPlayer({ channel, host }: { channel: string; host: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let player: TwitchPlayerInstance | null = null;

    function init() {
      const sdk = (window as unknown as { Twitch?: TwitchSDK }).Twitch;
      if (!sdk || !ref.current || cancelled) return;
      ref.current.innerHTML = "";
      player = new sdk.Player(ref.current, {
        channel,
        parent: [host],
        muted: true,
        autoplay: true,
        width: "100%",
        height: "100%",
      });
      player.addEventListener("online", () => setLive(true));
      player.addEventListener("offline", () => setLive(false));
    }

    const ID = "twitch-embed-script";
    const existing = document.getElementById(ID);
    if ((window as unknown as { Twitch?: TwitchSDK }).Twitch) {
      init();
    } else if (existing) {
      existing.addEventListener("load", init);
    } else {
      const s = document.createElement("script");
      s.id = ID;
      s.src = "https://embed.twitch.tv/embed/v1.js";
      s.async = true;
      s.addEventListener("load", init);
      document.body.appendChild(s);
    }

    return () => {
      cancelled = true;
      try {
        player?.destroy?.();
      } catch {}
      if (ref.current) ref.current.innerHTML = "";
    };
  }, [channel, host]);

  return (
    <Box position="relative" w="100%" h="100%">
      <Box ref={ref} w="100%" h="100%" />
      {!live && <OfflineScreen />}
    </Box>
  );
}

export function VideoStage({ hideViewerCount = false }: { hideViewerCount?: boolean }) {
  const c = useColors();
  const stats = useStats();
  const total = stats?.viewers.total ?? null;
  const [source, setSource] = useState<Platform>("twitch");
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  return (
    <Box>
      <Box
        bg="#000"
        borderRadius={c.radius.card}
        overflow="hidden"
        boxShadow={c.shadow.soft}
        display="flex"
        justifyContent="center"
      >
        <Box position="relative" w="100%" maxW="1280px">
          <AspectRatio ratio={16 / 9}>
            {source === "twitch" ? (
              host && TEST_CHANNELS.twitch ? (
                <TwitchPlayer channel={TEST_CHANNELS.twitch} host={host} />
              ) : (
                <Box bg="#000" />
              )
            ) : source === "kick" ? (
              TEST_CHANNELS.kick ? (
                <iframe
                  title="Kick player"
                  src={`https://player.kick.com/${TEST_CHANNELS.kick}?autoplay=true&muted=true`}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={{ border: 0, width: "100%", height: "100%" }}
                />
              ) : (
                <Box bg="#000" />
              )
            ) : (
              <XFallback />
            )}
          </AspectRatio>
        </Box>
      </Box>

      <Flex mt="18px" px="8px" align="flex-start" justify="space-between" gap="20px" flexWrap="wrap">
        <Box>
          <Text
            fontFamily="heading"
            fontWeight={400}
            fontSize={{ base: "4xl", md: "5xl" }}
            lineHeight={1.05}
            color={c.text.primary}
          >
            Make Money, Command Attention, Leverage AI
          </Text>
          <Box mt="12px">
            <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
              THURSDAY 1PM PST · PRESENTED BY POLYMARKET
            </Text>
          </Box>
        </Box>

        <VStack align="flex-end" spacing="12px" flexShrink={0}>
          <SourceTabs source={source} setSource={setSource} />
          <HStack spacing="14px">
            {!hideViewerCount && (
              <HStack spacing="8px" color={c.brand.red}>
                <LuEye size={18} />
                <Text fontFamily="mono" fontSize="lg" fontWeight={600}>
                  {total != null ? total.toLocaleString() : "—"}
                </Text>
              </HStack>
            )}
            <Uptime />
          </HStack>
        </VStack>
      </Flex>
    </Box>
  );
}
