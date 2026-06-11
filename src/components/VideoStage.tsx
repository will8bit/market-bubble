"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Box, HStack, VStack, Text, Flex } from "@chakra-ui/react";
import { FaTwitch, FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuEye } from "react-icons/lu";
import { useColors } from "@/theme/useColors";
import { useStats } from "@/lib/chat/StatsProvider";
import { useShow } from "@/lib/showConfig";
import { MarketBubbleLockup } from "./LogoLockup";
import { RollingNumber } from "./RollingNumber";

const VIDEO_TWITCH = process.env.NEXT_PUBLIC_VIDEO_TWITCH;
const VIDEO_KICK = process.env.NEXT_PUBLIC_VIDEO_KICK;
const VIDEO_X = process.env.NEXT_PUBLIC_VIDEO_X;

const EPISODE_TZ = "America/Los_Angeles";
const EPISODE_HOUR = 13;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function zonedWallToUtc(wallUTCms: number, timeZone: string): number {
  const date = new Date(wallUTCms);
  const tz = new Date(date.toLocaleString("en-US", { timeZone }));
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return wallUTCms - (tz.getTime() - utc.getTime());
}

function nextEpisodeInstant(now: number): number {
  for (let i = 0; i <= 8; i++) {
    const moment = new Date(now + i * 86400000);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: EPISODE_TZ,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(moment);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    if (get("weekday") !== "Thu") continue;
    const instant = zonedWallToUtc(
      Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), EPISODE_HOUR, 0, 0),
      EPISODE_TZ
    );
    if (instant > now) return instant;
  }
  return now;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function fmtUptime(now: number, startedAt: string): string {
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

function StreamTimer() {
  const c = useColors();
  const stats = useStats();
  const startedAt = stats?.viewers.twitchStartedAt ?? null;
  const now = useNow();

  if (startedAt) {
    return (
      <RollingNumber
        value={fmtUptime(now, startedAt)}
        fontSize="lg"
        fontFamily="mono"
        fontWeight={600}
        color={c.text.muted}
      />
    );
  }

  return (
    <HStack spacing="7px" align="baseline">
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em" color={c.text.subtle}>
        NEXT EP
      </Text>
      <RollingNumber
        value={fmtCountdown(nextEpisodeInstant(now) - now)}
        fontSize="lg"
        fontFamily="mono"
        fontWeight={600}
        color={c.text.muted}
      />
    </HStack>
  );
}

function WatchLinks() {
  const c = useColors();
  const links: { key: string; icon: ReactNode; url: string; color: string }[] = [];
  if (VIDEO_TWITCH)
    links.push({
      key: "Twitch",
      icon: <FaTwitch size={14} />,
      url: `https://www.twitch.tv/${VIDEO_TWITCH}`,
      color: c.platform.twitch,
    });
  if (VIDEO_KICK)
    links.push({
      key: "Kick",
      icon: <SiKick size={13} />,
      url: `https://kick.com/${VIDEO_KICK}`,
      color: c.platform.kick,
    });
  if (VIDEO_X)
    links.push({
      key: "X",
      icon: <FaXTwitter size={13} />,
      url: `https://x.com/${VIDEO_X}`,
      color: c.text.primary,
    });
  if (links.length === 0) return null;

  return (
    <HStack spacing="6px">
      {links.map((l) => (
        <Flex
          key={l.key}
          as="a"
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          align="center"
          justify="center"
          w="36px"
          h="36px"
          borderRadius={c.radius.control}
          bg={c.overlay.soft}
          border="1px solid"
          borderColor={c.border.subtle}
          color={c.text.muted}
          _hover={{ color: l.color, bg: c.overlay.hover }}
          transition="all 0.15s"
          aria-label={`Watch on ${l.key}`}
        >
          {l.icon}
        </Flex>
      ))}
    </HStack>
  );
}

function OfflineScreen() {
  const now = useNow();
  const target = nextEpisodeInstant(now);
  return (
    <Flex
      position="absolute"
      inset="0"
      direction="column"
      align="center"
      justify="center"
      gap="clamp(6px, 2cqw, 13px)"
      bg="#000"
      textAlign="center"
      p="clamp(24px, 8cqw, 72px)"
      sx={{ containerType: "inline-size" }}
    >
      <Box color="#fefefe">
        <MarketBubbleLockup width="clamp(120px, 34cqw, 250px)" />
      </Box>
      <Text
        fontFamily="heading"
        fontWeight={400}
        fontSize="clamp(14px, 4.2cqw, 28px)"
        color="#fefefe"
        lineHeight={1.1}
      >
        We&apos;re offline
      </Text>
      <VStack spacing="clamp(2px, 0.6cqw, 4px)">
        <Text
          fontFamily="mono"
          fontSize="clamp(7px, 1.3cqw, 10px)"
          letterSpacing="0.12em"
          color="rgba(255,255,255,0.5)"
        >
          NEXT EPISODE IN
        </Text>
        <RollingNumber
          value={fmtCountdown(target - now)}
          fontSize="clamp(12px, 3.2cqw, 22px)"
          fontFamily="mono"
          fontWeight={600}
          color="#fefefe"
        />
      </VStack>
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

function VideoFrame({ fitHeight = false }: { fitHeight?: boolean }) {
  const c = useColors();
  const [host, setHost] = useState("");

  useEffect(() => setHost(window.location.hostname), []);

  const inner =
    host && VIDEO_TWITCH ? (
      <TwitchPlayer channel={VIDEO_TWITCH} host={host} />
    ) : (
      <Box bg="#000" w="100%" h="100%" />
    );

  return (
    <Box
      bg="#000"
      borderRadius={c.radius.card}
      overflow="hidden"
      boxShadow={c.shadow.soft}
      display="flex"
      justifyContent="center"
      alignItems="center"
      flex={fitHeight ? { lg: "1" } : undefined}
      minH={fitHeight ? { lg: 0 } : undefined}
    >
      <Box
        position="relative"
        w={fitHeight ? { base: "100%", lg: "auto" } : "100%"}
        h={fitHeight ? { base: "auto", lg: "100%" } : "auto"}
        maxW={fitHeight ? "100%" : "1280px"}
        sx={{ aspectRatio: "16 / 9" }}
      >
        {inner}
      </Box>
    </Box>
  );
}

export function VideoStage({
  hideViewerCount = false,
  fitHeight = false,
}: {
  hideViewerCount?: boolean;
  fitHeight?: boolean;
}) {
  const c = useColors();
  const stats = useStats();
  const { title: showTitle, subtitle: showSubtitle } = useShow();
  const total = stats?.viewers.total ?? null;
  const live = Boolean(stats?.viewers.twitchStartedAt);

  return (
    <Box
      h={fitHeight ? { lg: "100%" } : undefined}
      display={fitHeight ? { lg: "flex" } : undefined}
      flexDirection={fitHeight ? { lg: "column" } : undefined}
      minH={fitHeight ? { lg: 0 } : undefined}
    >
      <VideoFrame fitHeight={fitHeight} />

      <Flex
        mt="18px"
        px="8px"
        align="flex-start"
        justify="space-between"
        gap="20px"
        flexWrap="wrap"
        flexShrink={0}
      >
        <Box>
          <Text
            fontFamily="heading"
            fontWeight={400}
            fontSize={{ base: "4xl", md: "5xl" }}
            lineHeight={1.05}
            color={c.text.primary}
          >
            {showTitle}
          </Text>
          <Box mt="12px">
            <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
              {showSubtitle}
            </Text>
          </Box>
        </Box>

        <VStack align="flex-end" spacing="12px" flexShrink={0}>
          <WatchLinks />
          <HStack spacing="14px">
            {!hideViewerCount && live && (
              <HStack spacing="8px" color={c.brand.red}>
                <LuEye size={18} />
                {total != null ? (
                  <RollingNumber value={total} fontSize="lg" fontFamily="mono" fontWeight={600} />
                ) : (
                  <Text fontFamily="mono" fontSize="lg" fontWeight={600}>
                    —
                  </Text>
                )}
              </HStack>
            )}
            <StreamTimer />
          </HStack>
        </VStack>
      </Flex>
    </Box>
  );
}
