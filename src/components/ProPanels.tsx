"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Flex, HStack, Image, Text, VStack, type BoxProps } from "@chakra-ui/react";
import { FaTwitch, FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuCalendar, LuX, LuExternalLink, LuEye } from "react-icons/lu";
import { useStats, type MarketQuote, type MediaClip, type MediaVideo } from "@/lib/chat/StatsProvider";
import type { ChatMessage } from "@/lib/chat/types";
import { useSettings } from "@/lib/settings";
import { usePersistentState } from "@/lib/usePersistentState";
import { RollingNumber } from "./RollingNumber";
import { Skel } from "./Skeleton";
import { PoppedOut } from "./PoppedOut";
import { usePopoutHost, usePopoutClient } from "@/lib/usePopout";
import { useAvatar } from "@/lib/avatars";
import { scrollbarSx } from "@/theme/scrollbar";
import { useColors } from "@/theme/useColors";

const AUDIENCE_POPOUT_URL = "/popout/marketbubble/audience?popout=";
const AUDIENCE_POPOUT_NAME = "mb-audience";
const AUDIENCE_POPOUT_FEATURES = "popup=yes,width=560,height=820";

function fmtNum(p: number) {
  if (p >= 1000) return Math.round(p).toLocaleString();
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}
function fmtChange(c: number) {
  return `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`;
}

function Card({ title, children, ...rest }: { title: string; children: React.ReactNode } & BoxProps) {
  const c = useColors();
  return (
    <Box
      bg={c.surface}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.panel}
      boxShadow={c.shadow.soft}
      p="16px"
      h="100%"
      minH={0}
      display="flex"
      flexDirection="column"
      {...rest}
    >
      <Text
        fontFamily="mono"
        fontSize="2xs"
        letterSpacing="0.1em"
        color={c.text.subtle}
        mb="12px"
        flexShrink={0}
      >
        {title}
      </Text>
      <Box flex="1" minH={0} overflowY="auto" sx={scrollbarSx(c)}>
        {children}
      </Box>
    </Box>
  );
}

function Empty() {
  const c = useColors();
  return (
    <Text fontFamily="mono" fontSize="xs" color={c.text.subtle}>
      —
    </Text>
  );
}

function MarketRowSkeleton() {
  return (
    <Flex align="center" gap="12px" py="5px">
      <Skel w="52px" h="14px" />
      <Box flex="1" minW={0}>
        <Skel w="100%" h="16px" rounded="4px" />
      </Box>
      <Box textAlign="right" flexShrink={0} minW="62px">
        <Skel w="44px" h="11px" ml="auto" />
        <Skel w="30px" h="9px" mt="5px" ml="auto" />
      </Box>
    </Flex>
  );
}

function PolyCardSkeleton() {
  const c = useColors();
  return (
    <Box
      bg={c.surfaceLight}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.card}
      p="12px"
    >
      <Skel w="90%" h="13px" />
      <Skel w="55%" h="13px" mt="6px" />
      <Skel w="40%" h="9px" mt="10px" />
      <Skel w="100%" h="6px" mt="11px" rounded="full" />
      <HStack spacing="8px" mt="11px">
        <Skel w="100%" h="29px" rounded="10px" />
        <Skel w="100%" h="29px" rounded="10px" />
      </HStack>
    </Box>
  );
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <Box h="22px" />;
  const w = 100;
  const h = 22;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * (h - 2) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "22px", display: "block" }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MarketRow({ m }: { m: MarketQuote }) {
  const c = useColors();
  const up = m.change >= 0;
  const col = up ? c.brand.green : c.brand.red;
  return (
    <Flex align="center" gap="12px" py="5px">
      <Text fontSize="sm" fontWeight={600} color={c.text.primary} w="68px" flexShrink={0} noOfLines={1}>
        {m.symbol}
      </Text>
      <Box flex="1" minW={0}>
        <MiniSpark data={m.spark} color={col} />
      </Box>
      <Box textAlign="right" flexShrink={0} minW="62px">
        <Text fontFamily="mono" fontSize="xs" color={c.text.primary} lineHeight="1.25">
          {fmtNum(m.price)}
        </Text>
        <Text fontFamily="mono" fontSize="2xs" fontWeight={600} color={col} lineHeight="1.25">
          {fmtChange(m.change)}
        </Text>
      </Box>
    </Flex>
  );
}

function MarketGroup({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: MarketQuote[];
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <Box>
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em" color={c.text.subtle} mb="6px">
        {title}
      </Text>
      {loading && rows.length === 0 ? (
        <Flex direction="column" gap="1px">
          {[0, 1, 2, 3].map((i) => (
            <MarketRowSkeleton key={i} />
          ))}
        </Flex>
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <Flex direction="column" gap="1px">
          {rows.map((m) => (
            <MarketRow key={m.symbol} m={m} />
          ))}
        </Flex>
      )}
    </Box>
  );
}

function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function exampleSpark(seed: string, base: number, change: number): number[] {
  const rng = seededRng(seed);
  const start = base / (1 + change / 100);
  const drift = (base - start) / 23;
  const out: number[] = [];
  let n = 0;
  for (let i = 0; i < 24; i++) {
    n = n * 0.55 + (rng() - 0.5) * base * 0.022;
    out.push(start + drift * i + n);
  }
  return out;
}

function ex(symbol: string, price: number, change: number): MarketQuote {
  return { symbol, price, change, spark: exampleSpark(symbol, price, change) };
}

const EXAMPLE_STOCKS: MarketQuote[] = [
  ex("S&P 500", 6943, 0.42),
  ex("Nasdaq", 25410, 0.73),
  ex("Dow", 50330, -0.18),
  ex("Russell 2K", 2861, 1.12),
];

const EXAMPLE_COMMODITIES: MarketQuote[] = [
  ex("Gold", 4152, -0.31),
  ex("Silver", 65.2, 0.94),
  ex("Crude Oil", 90.9, -1.21),
  ex("Nat Gas", 3.22, 2.4),
];

function MarketsList() {
  const stats = useStats();
  return (
    <Flex direction="column" gap="16px">
      <MarketGroup title="CRYPTO" rows={(stats?.markets.crypto ?? []).slice(0, 4)} loading={!stats} />
      <MarketGroup title="INDICES" rows={EXAMPLE_STOCKS} />
      <MarketGroup title="COMMODITIES" rows={EXAMPLE_COMMODITIES} />
    </Flex>
  );
}

function fmtEndDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function OutcomeBadge({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <Flex
      flex="1"
      align="center"
      justify="space-between"
      px="10px"
      py="6px"
      borderRadius="10px"
      bg={`${color}1a`}
      border="1px solid"
      borderColor={`${color}33`}
    >
      <Text fontSize="xs" fontWeight={600} color={color}>
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xs" fontWeight={600} color={color}>
        {pct}%
      </Text>
    </Flex>
  );
}

function PolyCard({
  m,
}: {
  m: { question: string; yes: number; no: number; endDate: string; url?: string };
}) {
  const c = useColors();
  const yesPct = Math.round(m.yes * 100);
  const noPct = Math.round(m.no * 100);
  const end = fmtEndDate(m.endDate);
  return (
    <Box
      as="a"
      href={m.url || "https://polymarket.com"}
      target="_blank"
      rel="noopener noreferrer"
      display="block"
      bg={c.surfaceLight}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.card}
      p="12px"
      _hover={{ bg: c.surfaceRaised }}
      transition="background-color 0.15s"
    >
      <Text fontSize="sm" fontWeight={600} color={c.text.primary} lineHeight={1.3} noOfLines={2}>
        {m.question}
      </Text>

      {end && (
        <HStack spacing="5px" mt="6px" color={c.text.subtle}>
          <LuCalendar size={11} />
          <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.04em">
            Ends {end}
          </Text>
        </HStack>
      )}

      <Flex mt="11px" h="6px" borderRadius="full" overflow="hidden">
        <Box w={`${yesPct}%`} bg={c.brand.green} />
        <Box flex="1" bg={c.brand.red} />
      </Flex>

      <HStack spacing="8px" mt="11px">
        <OutcomeBadge label="Yes" pct={yesPct} color={c.brand.green} />
        <OutcomeBadge label="No" pct={noPct} color={c.brand.red} />
      </HStack>
    </Box>
  );
}

function PolymarketList() {
  const stats = useStats();
  if (!stats) {
    return (
      <Flex direction="column" gap="10px">
        {[0, 1, 2, 3].map((i) => (
          <PolyCardSkeleton key={i} />
        ))}
      </Flex>
    );
  }
  const markets = stats.markets.polymarket ?? [];
  if (markets.length === 0) return <Empty />;
  return (
    <Flex direction="column" gap="10px">
      {markets.map((m, i) => (
        <PolyCard key={i} m={m} />
      ))}
    </Flex>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <Box
      as="button"
      onClick={onClick}
      px="12px"
      py="6px"
      borderRadius="9px"
      bg={active ? c.surfaceRaised : "transparent"}
      color={active ? c.text.primary : c.text.muted}
      fontFamily="mono"
      fontSize="2xs"
      letterSpacing="0.1em"
      _hover={{ color: c.text.primary }}
      transition="all 0.15s"
    >
      {children}
    </Box>
  );
}

export function MarketsPanel() {
  const c = useColors();
  const { marketsTab, setMarketsTab } = useSettings();
  return (
    <Box
      bg={c.surface}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.panel}
      boxShadow={c.shadow.soft}
      p="16px"
      h="100%"
      minH={0}
      display="flex"
      flexDirection="column"
    >
      <HStack
        spacing="2px"
        bg={c.overlay.soft}
        borderRadius={c.radius.control}
        p="3px"
        mb="14px"
        flexShrink={0}
        alignSelf="center"
      >
        <TabButton active={marketsTab === "polymarket"} onClick={() => setMarketsTab("polymarket")}>
          POLYMARKET
        </TabButton>
        <TabButton active={marketsTab === "markets"} onClick={() => setMarketsTab("markets")}>
          MARKETS
        </TabButton>
      </HStack>
      <Box flex="1" minH={0} overflowY="auto" sx={scrollbarSx(c)}>
        {marketsTab === "polymarket" ? <PolymarketList /> : <MarketsList />}
      </Box>
    </Box>
  );
}

const STREAMER_IMG: Record<string, string> = { banks: "/banks.jpg", ansem: "/ansem.jpg" };

const AUD_BASE = 16;
const AUD_NUM = "2.125em";
const AUD_MT = "0.75em";
const AUD_PT = "0.7em";
const AUD_GAP = "0.5em";
const AUD_HEAD_MB = "0.75em";
const AUD_LABEL = "0.6875em";
const AUD_ROW = "0.8125em";
const AUD_VAL = "0.875em";

function StreamerLine({
  name,
  value,
  color,
  img,
}: {
  name: string;
  value: number | null;
  color: string;
  img: string;
}) {
  const c = useColors();
  const src = useAvatar(img);
  return (
    <Flex justify="space-between" align="center">
      <HStack spacing="0.5625em">
        <Box
          w="1.375em"
          h="1.375em"
          borderRadius="full"
          overflow="hidden"
          flexShrink={0}
          border="1.5px solid"
          borderColor={color}
        >
          <Image src={src} alt={name} w="100%" h="100%" objectFit="cover" />
        </Box>
        <Text fontSize={AUD_ROW} color={c.text.secondary}>
          {name}
        </Text>
      </HStack>
      {value == null ? (
        <Text fontFamily="mono" fontSize={AUD_VAL} fontWeight={600} color={c.text.subtle}>
          —
        </Text>
      ) : (
        <RollingNumber value={value} fontSize={AUD_VAL} fontFamily="mono" color={c.text.primary} />
      )}
    </Flex>
  );
}

function TotalRow({ label, value, color }: { label: string; value: number | null; color?: string }) {
  const c = useColors();
  return (
    <Flex justify="space-between" align="center" minH="1.375em">
      <HStack spacing="0.5625em">
        <Box w="0.5em" h="0.5em" borderRadius="full" bg={color || c.text.muted} flexShrink={0} />
        <Text fontSize={AUD_ROW} color={c.text.secondary}>
          {label}
        </Text>
      </HStack>
      {value == null ? (
        <Text fontFamily="mono" fontSize={AUD_VAL} fontWeight={600} color={c.text.subtle}>
          —
        </Text>
      ) : (
        <RollingNumber value={value} fontSize={AUD_VAL} fontFamily="mono" color={color || c.text.primary} />
      )}
    </Flex>
  );
}

function TileShell({ children }: { children: React.ReactNode }) {
  return (
    <Flex direction="column" flex="1" minW={0} maxW={{ md: "340px" }}>
      {children}
    </Flex>
  );
}

function StreamerLineSkeleton() {
  return (
    <Flex justify="space-between" align="center">
      <HStack spacing="0.5625em">
        <Skel w="1.375em" h="1.375em" rounded="full" />
        <Skel w="4em" h="0.85em" />
      </HStack>
      <Skel w="2.2em" h="0.85em" />
    </Flex>
  );
}

function TotalRowSkeleton({ label, color }: { label: string; color?: string }) {
  const c = useColors();
  return (
    <Flex justify="space-between" align="center" minH="1.375em">
      <HStack spacing="0.5625em">
        <Box w="0.5em" h="0.5em" borderRadius="full" bg={color || c.text.muted} flexShrink={0} />
        <Text fontSize={AUD_ROW} color={c.text.secondary}>
          {label}
        </Text>
      </HStack>
      <Skel w="2.2em" h="0.85em" />
    </Flex>
  );
}

function BigNumber({ value, fallback, loading }: { value: number | null; fallback: string; loading?: boolean }) {
  const c = useColors();
  if (loading) return <Skel w="62%" h={AUD_NUM} rounded="8px" />;
  if (value == null) {
    return (
      <Text fontFamily="body" fontWeight={500} fontSize={AUD_NUM} lineHeight="1" color={c.text.subtle}>
        {fallback}
      </Text>
    );
  }
  return <RollingNumber value={value} fontSize={AUD_NUM} fontWeight={500} color={c.text.primary} />;
}

function PlatformTile({
  name,
  total,
  rows,
  loading,
}: {
  name: string;
  total: number | null;
  rows: { name: string; value: number | null; color: string; img: string }[];
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <TileShell>
      <Text
        fontFamily="mono"
        fontSize={AUD_LABEL}
        letterSpacing="0.1em"
        color={c.text.muted}
        mb={AUD_HEAD_MB}
      >
        {name.toUpperCase()}
      </Text>

      <BigNumber value={total} fallback="offline" loading={loading} />

      <Flex
        direction="column"
        gap={AUD_GAP}
        mt={AUD_MT}
        pt={AUD_PT}
        borderTop="1px solid"
        borderColor={c.border.subtle}
      >
        {loading
          ? [0, 1].map((i) => <StreamerLineSkeleton key={i} />)
          : rows.map((r) => (
              <StreamerLine key={r.name} name={r.name} value={r.value} color={r.color} img={r.img} />
            ))}
      </Flex>
    </TileShell>
  );
}

function TotalTile({
  total,
  site,
  peak,
  loading,
}: {
  total: number | null;
  site: number | null;
  peak: number | null;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <TileShell>
      <Text
        fontFamily="mono"
        fontSize={AUD_LABEL}
        letterSpacing="0.1em"
        color={c.text.muted}
        mb={AUD_HEAD_MB}
      >
        TOTAL
      </Text>

      <BigNumber value={total} fallback="—" loading={loading} />

      <Flex
        direction="column"
        gap={AUD_GAP}
        mt={AUD_MT}
        pt={AUD_PT}
        borderTop="1px solid"
        borderColor={c.border.subtle}
      >
        {loading ? (
          <>
            <TotalRowSkeleton label="On Market Bubble" color={c.brand.red} />
            <TotalRowSkeleton label="Peak" />
          </>
        ) : (
          <>
            <TotalRow label="On Market Bubble" value={site} color={c.brand.red} />
            <TotalRow label="Peak" value={peak} />
          </>
        )}
      </Flex>
    </TileShell>
  );
}

const STREAMER_NAME: Record<string, string> = { banks: "Banks", ansem: "Ansem" };


function streamerAccent(c: ReturnType<typeof useColors>, id: string) {
  return id === "banks" ? c.streamer.banks : c.streamer.ansem;
}

function useHost() {
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.hostname), []);
  return host;
}

function ago(iso: string): string {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  if (d < 3600000) return `${Math.max(1, Math.round(d / 60000))}m ago`;
  if (d < day) return `${Math.round(d / 3600000)}h ago`;
  if (d < day * 30) return `${Math.round(d / day)}d ago`;
  return `${Math.round(d / (day * 30))}mo ago`;
}

function fmtViews(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

type ActiveMedia = { kind: "clip" | "video"; id: string; title: string; url: string };

function AudienceTab({ admin = false, messages = [] }: { admin?: boolean; messages?: ChatMessage[] }) {
  const c = useColors();
  const stats = useStats();
  const loading = !stats;
  const v = stats?.viewers;
  const streamers = v?.streamers ?? [];
  return (
    <Box w="100%" style={{ fontSize: `${AUD_BASE}px` }}>
      <Flex
        direction={{ base: "column", md: "row" }}
        gap={{ base: "20px", md: "36px" }}
        w="100%"
        justify="center"
        align="stretch"
      >
        <PlatformTile
          name="Twitch"
          loading={loading}
          total={v?.twitch ?? null}
          rows={streamers.map((s) => ({
            name: s.name,
            value: s.twitch,
            color: streamerAccent(c, s.id),
            img: STREAMER_IMG[s.id] || "",
          }))}
        />
        <PlatformTile
          name="Kick"
          loading={loading}
          total={v?.kick ?? null}
          rows={streamers.map((s) => ({
            name: s.name,
            value: s.kick,
            color: streamerAccent(c, s.id),
            img: STREAMER_IMG[s.id] || "",
          }))}
        />
        <TotalTile loading={loading} total={v?.total ?? null} site={v?.site ?? null} peak={v?.peak ?? null} />
      </Flex>

      {admin && <AdminAudienceExtras messages={messages} startedAt={v?.twitchStartedAt ?? null} />}
    </Box>
  );
}

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function fmtUptime(startedAt: string | null, now: number): string {
  if (!startedAt) return "offline";
  const d = now - new Date(startedAt).getTime();
  if (d < 0) return "offline";
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  const s = Math.floor((d % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const PLATFORM_KEYS: { key: ChatMessage["platform"]; label: string }[] = [
  { key: "twitch", label: "Twitch" },
  { key: "kick", label: "Kick" },
  { key: "x", label: "X" },
];

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  const c = useColors();
  return (
    <Box flex="1" minW={0}>
      <Text fontFamily="mono" fontSize={AUD_LABEL} letterSpacing="0.1em" color={c.text.muted}>
        {label}
      </Text>
      <Text
        fontFamily="mono"
        fontSize="1.5em"
        fontWeight={600}
        lineHeight="1.1"
        color={accent || c.text.primary}
        mt="0.2em"
        sx={{ fontVariantNumeric: "tabular-nums" }}
        noOfLines={1}
      >
        {value}
      </Text>
    </Box>
  );
}

function AdminAudienceExtras({
  messages,
  startedAt,
}: {
  messages: ChatMessage[];
  startedAt: string | null;
}) {
  const c = useColors();
  const now = useTick(1000);

  const m = useMemo(() => {
    const minAgo = now - 60000;
    const fiveAgo = now - 300000;
    let perMin = 0;
    const chatters = new Set<string>();
    const split: Record<string, number> = { twitch: 0, kick: 0, x: 0 };
    for (const msg of messages) {
      if (msg.timestamp >= minAgo) perMin += 1;
      if (msg.timestamp >= fiveAgo) {
        chatters.add(msg.author.name.toLowerCase());
        if (msg.platform in split) split[msg.platform] += 1;
      }
    }
    const splitTotal = split.twitch + split.kick + split.x;
    return { perMin, chatters: chatters.size, split, splitTotal };
  }, [messages, now]);

  const pct = (n: number) => (m.splitTotal ? Math.round((n / m.splitTotal) * 100) : 0);
  const splitColor: Record<string, string> = {
    twitch: c.platform.twitch,
    kick: c.platform.kick,
    x: c.text.muted,
  };

  return (
    <Box mt="1.5em" pt="1.1em" borderTop="1px solid" borderColor={c.border.subtle}>
      <HStack spacing="1.5em" align="flex-start">
        <MiniStat label="UPTIME" value={fmtUptime(startedAt, now)} />
        <MiniStat label="MSGS / MIN" value={m.perMin} />
        <MiniStat label="ACTIVE · 5M" value={m.chatters} />
      </HStack>

      <Box mt="1.1em">
        <Flex justify="space-between" align="center" mb="0.5em">
          <Text fontFamily="mono" fontSize={AUD_LABEL} letterSpacing="0.1em" color={c.text.muted}>
            CHAT SPLIT · 5M
          </Text>
          <HStack spacing="0.9em">
            {PLATFORM_KEYS.map((p) => (
              <HStack key={p.key} spacing="0.35em">
                <Box w="0.5em" h="0.5em" borderRadius="full" bg={splitColor[p.key]} />
                <Text fontFamily="mono" fontSize={AUD_LABEL} color={c.text.secondary}>
                  {pct(m.split[p.key])}%
                </Text>
              </HStack>
            ))}
          </HStack>
        </Flex>
        <Flex h="0.6em" gap="6px" w="100%">
          {m.splitTotal === 0 ? (
            <Box flex="1" borderRadius="full" bg={c.surfaceLight} />
          ) : (
            PLATFORM_KEYS.filter((p) => m.split[p.key] > 0).map((p) => (
              <Box
                key={p.key}
                flexGrow={m.split[p.key]}
                flexBasis={0}
                minW="0.6em"
                borderRadius="full"
                bg={splitColor[p.key]}
              />
            ))
          )}
        </Flex>
      </Box>
    </Box>
  );
}

function HealthDot({ color, size = 8 }: { color: string; size?: number }) {
  return <Box w={`${size}px`} h={`${size}px`} borderRadius="full" bg={color} flexShrink={0} />;
}

const SPARK_BAR = 3;
const SPARK_GAP = 3;
const SPARK_WIN = 60000;

function Sparkline({ times, now, color }: { times: number[]; now: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const count = Math.max(6, Math.floor((width + SPARK_GAP) / (SPARK_BAR + SPARK_GAP)));

  const buckets = useMemo(() => {
    const arr = new Array(count).fill(0);
    const size = SPARK_WIN / count;
    for (const t of times) {
      const d = now - t;
      if (d < 0 || d >= SPARK_WIN) continue;
      const idx = count - 1 - Math.floor(d / size);
      if (idx >= 0 && idx < count) arr[idx] += 1;
    }
    return arr;
  }, [times, now, count]);

  const max = Math.max(1, ...buckets);

  return (
    <Flex
      ref={ref}
      flex="1"
      minW="60px"
      h="24px"
      align="flex-end"
      justify="space-between"
      overflow="hidden"
    >
      {buckets.map((v, i) => (
        <Box
          key={i}
          w={`${SPARK_BAR}px`}
          flexShrink={0}
          h={`${Math.max(10, (v / max) * 100)}%`}
          borderRadius="1px"
          bg={color}
          opacity={v ? 0.35 + 0.65 * (v / max) : 0.13}
        />
      ))}
    </Flex>
  );
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <Box bg={`${color}1f`} px="10px" py="4px" borderRadius="full" flexShrink={0}>
      <Text fontFamily="mono" fontSize="2xs" fontWeight={600} letterSpacing="0.05em" color={color}>
        {label}
      </Text>
    </Box>
  );
}

const FEED_ICON: Record<string, ReactNode> = {
  twitch: <FaTwitch size={16} />,
  kick: <SiKick size={16} />,
  x: <FaXTwitter size={15} />,
};

function feedHealth(
  c: ReturnType<typeof useColors>,
  ageMs: number | null,
  thresholds: [number, number]
) {
  if (ageMs == null) return { rank: 3, color: c.text.subtle, label: "No data" };
  if (ageMs < thresholds[0]) return { rank: 0, color: c.brand.green, label: "Active" };
  if (ageMs < thresholds[1]) return { rank: 1, color: c.brand.gold, label: "Slow" };
  return { rank: 2, color: c.brand.red, label: "Idle" };
}

function ageStr(ageMs: number | null): string {
  if (ageMs == null) return "no messages yet";
  const s = Math.floor(ageMs / 1000);
  if (s < 60) return `${s}s ago`;
  const min = Math.floor(s / 60);
  return min < 60 ? `${min}m ago` : `${Math.floor(min / 60)}h ago`;
}

function FeedHealthTab({ messages }: { messages: ChatMessage[] }) {
  const c = useColors();
  const now = useTick(1000);
  const stats = useStats();
  const [lastStatsAt, setLastStatsAt] = useState<number | null>(null);
  useEffect(() => {
    if (stats) setLastStatsAt(Date.now());
  }, [stats]);

  const feedData = useMemo(() => {
    const per: Record<string, { last: number; rate: number; times: number[] }> = {};
    for (const key of ["twitch", "kick", "x"]) {
      per[key] = { last: 0, rate: 0, times: [] };
    }
    for (const msg of messages) {
      const p = per[msg.platform];
      if (!p) continue;
      if (msg.timestamp > p.last) p.last = msg.timestamp;
      const d = now - msg.timestamp;
      if (d >= 0 && d < SPARK_WIN) {
        p.rate += 1;
        p.times.push(msg.timestamp);
      }
    }
    return per;
  }, [messages, now]);

  const v = stats?.viewers;
  const accents: Record<string, string> = {
    twitch: c.platform.twitch,
    kick: c.platform.kick,
    x: c.platform.x,
  };
  const viewersByKey: Record<string, number | null> = {
    twitch: v?.twitch ?? null,
    kick: v?.kick ?? null,
    x: null,
  };

  const feeds = PLATFORM_KEYS.map((p) => {
    const d = feedData[p.key];
    const age = d.last ? now - d.last : null;
    const viewers = viewersByKey[p.key];
    const expected = d.last > 0 || viewers != null;
    return {
      ...p,
      age,
      viewers,
      rate: d.rate,
      times: d.times,
      expected,
      h: feedHealth(c, age, [30000, 120000]),
    };
  });

  const expectedFeeds = feeds.filter((f) => f.expected);
  const n = expectedFeeds.length;
  const activeCount = expectedFeeds.filter((f) => f.h.rank === 0).length;
  const anySlow = expectedFeeds.some((f) => f.h.rank === 1);
  const totalRate = feeds.reduce((a, f) => a + f.rate, 0);
  const sub = `${activeCount}/${n} sources active`;
  const overall =
    n === 0
      ? { color: c.text.subtle, label: "STANDBY", sub: "waiting for stream" }
      : activeCount === n
        ? { color: c.brand.green, label: "ALL FEEDS LIVE", sub }
        : activeCount > 0
          ? { color: c.brand.gold, label: "PARTIAL ACTIVITY", sub }
          : anySlow
            ? { color: c.brand.gold, label: "FEEDS SLOWING", sub }
            : { color: c.brand.red, label: "FEEDS IDLE", sub };

  const statsAge = lastStatsAt == null ? null : now - lastStatsAt;
  const statsH = feedHealth(c, statsAge, [30000, 120000]);

  return (
    <VStack align="stretch" spacing="10px" w="100%">
      <Flex
        align="center"
        justify="space-between"
        px="16px"
        py="14px"
        borderRadius={c.radius.card}
        bg={`${overall.color}14`}
        border="1px solid"
        borderColor={`${overall.color}33`}
      >
        <HStack spacing="13px" minW={0}>
          <HealthDot color={overall.color} size={11} />
          <Box minW={0}>
            <Text fontFamily="mono" fontSize="sm" fontWeight={700} letterSpacing="0.08em" color={overall.color}>
              {overall.label}
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color={c.text.muted} mt="2px">
              {overall.sub}
            </Text>
          </Box>
        </HStack>
        <Box textAlign="right" flexShrink={0}>
          <Text
            fontFamily="mono"
            fontSize="xl"
            fontWeight={700}
            lineHeight="1"
            color={c.text.primary}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {totalRate}
          </Text>
          <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle} mt="3px">
            MSGS / MIN
          </Text>
        </Box>
      </Flex>

      {feeds.map((f) => (
        <Flex
          key={f.key}
          align="center"
          gap="13px"
          px="14px"
          py="12px"
          borderRadius={c.radius.card}
          bg={c.surfaceLight}
          border="1px solid"
          borderColor={c.border.subtle}
        >
          <Flex
            w="36px"
            h="36px"
            flexShrink={0}
            align="center"
            justify="center"
            borderRadius="11px"
            bg={`${accents[f.key]}1f`}
            color={accents[f.key]}
          >
            {FEED_ICON[f.key]}
          </Flex>

          <Box flex="1" minW={0}>
            <Text fontSize="sm" fontWeight={600} color={c.text.primary} lineHeight="1.2">
              {f.label}
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color={c.text.subtle} mt="2px" noOfLines={1}>
              {f.viewers != null ? `${f.viewers.toLocaleString()} watching · ` : ""}
              {f.rate > 0 ? `${f.rate}/min · ` : ""}
              {ageStr(f.age)}
            </Text>
          </Box>

          <Sparkline times={f.times} now={now} color={accents[f.key]} />
          <StatusPill color={f.h.color} label={f.h.label} />
        </Flex>
      ))}

      <Flex
        align="center"
        justify="space-between"
        px="14px"
        py="11px"
        borderRadius={c.radius.card}
        bg={c.overlay.soft}
        border="1px solid"
        borderColor={c.border.subtle}
      >
        <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.06em" color={c.text.secondary}>
          DATA LINK · worker
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color={statsH.color}>
          {statsH.label.toLowerCase()} · {ageStr(statsAge)}
        </Text>
      </Flex>
    </VStack>
  );
}

const ABOUT_HOSTS = [
  { id: "banks", name: "Banks", handle: "@banks", x: "banks" },
  { id: "ansem", name: "Ansem", handle: "@blknoiz06", x: "blknoiz06" },
];

function HostRow({ host }: { host: (typeof ABOUT_HOSTS)[number] }) {
  const c = useColors();
  const src = useAvatar(STREAMER_IMG[host.id] || "");
  const accent = streamerAccent(c, host.id);
  return (
    <HStack
      as="a"
      href={`https://x.com/${host.x}`}
      target="_blank"
      rel="noopener noreferrer"
      flex="1"
      minW={0}
      spacing="10px"
      p="9px"
      borderRadius={c.radius.card}
      bg={c.surfaceLight}
      border="1px solid"
      borderColor={c.border.subtle}
      _hover={{ bg: c.surfaceRaised }}
      transition="background-color 0.15s"
    >
      <Box
        w="34px"
        h="34px"
        borderRadius="full"
        overflow="hidden"
        flexShrink={0}
        border="1.5px solid"
        borderColor={accent}
      >
        <Image src={src} alt={host.name} w="100%" h="100%" objectFit="cover" />
      </Box>
      <Box flex="1">
        <Text fontSize="sm" fontWeight={600} color={c.text.primary}>
          {host.name}
        </Text>
        <Text fontFamily="mono" fontSize="2xs" color={c.text.subtle}>
          {host.handle}
        </Text>
      </Box>
      <FaXTwitter size={14} color={c.text.subtle} />
    </HStack>
  );
}

function AboutTab() {
  const c = useColors();
  return (
    <Box maxW="640px" w="100%" mx="auto">
      <Text fontSize="sm" lineHeight={1.65} color={c.text.secondary} textAlign="center">
        Market Bubble is a live markets show where Banks and Ansem break down crypto, trade ideas, and
        the week&apos;s biggest moves — unfiltered. Make money, command attention, leverage AI.
      </Text>
      <HStack mt="14px" spacing="8px" align="stretch">
        {ABOUT_HOSTS.map((h) => (
          <HostRow key={h.id} host={h} />
        ))}
      </HStack>
      <HStack mt="14px" spacing="7px" justify="center">
        {[
          { label: "Twitch", icon: <FaTwitch size={15} /> },
          { label: "Kick", icon: <SiKick size={13} /> },
          { label: "X", icon: <FaXTwitter size={14} /> },
        ].map((s) => (
          <Flex
            key={s.label}
            as="button"
            align="center"
            justify="center"
            w="34px"
            h="34px"
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
  );
}

function ThumbBadge({ children, ...pos }: { children: React.ReactNode } & BoxProps) {
  return (
    <Box
      position="absolute"
      bg="rgba(0,0,0,0.82)"
      color="#fff"
      fontFamily="mono"
      fontSize="12px"
      lineHeight="1"
      px="7px"
      py="4px"
      borderRadius="5px"
      display="flex"
      alignItems="center"
      gap="4px"
      pointerEvents="none"
      {...pos}
    >
      {children}
    </Box>
  );
}

function MediaThumb({
  title,
  thumbnail,
  views,
  createdAt,
  duration,
  onClick,
}: {
  title: string;
  thumbnail: string;
  views: number;
  createdAt: string;
  duration: string;
  onClick: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      title={title}
      display="block"
      position="relative"
      w="100%"
      borderRadius="8px"
      overflow="hidden"
      bg="#000"
      sx={{ aspectRatio: "16 / 9" }}
      _hover={{ opacity: 0.85 }}
      transition="opacity 0.15s"
    >
      {thumbnail ? <Image src={thumbnail} alt={title} w="100%" h="100%" objectFit="cover" /> : null}
      {duration ? (
        <ThumbBadge top="5px" left="5px">
          {duration}
        </ThumbBadge>
      ) : null}
      <ThumbBadge bottom="5px" left="5px">
        <LuEye size={12} />
        {fmtViews(views)}
      </ThumbBadge>
      {createdAt ? (
        <ThumbBadge bottom="5px" right="5px">
          {ago(createdAt)}
        </ThumbBadge>
      ) : null}
    </Box>
  );
}

function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const c = useColors();
  return (
    <HStack spacing="6px" mb="12px" flexShrink={0}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Box
            as="button"
            key={o.id}
            onClick={() => onChange(o.id)}
            px="11px"
            py="4px"
            borderRadius="full"
            fontFamily="mono"
            fontSize="2xs"
            letterSpacing="0.08em"
            bg={on ? c.overlay.strong : c.overlay.soft}
            color={on ? c.text.primary : c.text.muted}
            _hover={{ color: c.text.primary }}
            transition="color 0.15s"
          >
            {o.label}
          </Box>
        );
      })}
    </HStack>
  );
}

function clipDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtVodDuration(s: string): string {
  if (!s) return "";
  const h = Number(/(\d+)h/.exec(s)?.[1] || 0);
  const m = Number(/(\d+)m/.exec(s)?.[1] || 0);
  const sec = Number(/(\d+)s/.exec(s)?.[1] || 0);
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type MediaItem = {
  id: string;
  streamer: string;
  title: string;
  thumbnail: string;
  views: number;
  createdAt: string;
  duration: string;
  media: ActiveMedia;
};

function MediaThumbSkeleton() {
  return (
    <Box>
      <Box position="relative" w="100%" sx={{ aspectRatio: "16 / 9" }}>
        <Skel position="absolute" inset="0" w="100%" h="100%" rounded="12px" />
      </Box>
      <Skel w="85%" h="12px" mt="9px" />
      <Skel w="48%" h="9px" mt="7px" />
    </Box>
  );
}

function MediaList({
  kind,
  onOpen,
}: {
  kind: "clips" | "broadcasts";
  onOpen: (m: ActiveMedia) => void;
}) {
  const c = useColors();
  const stats = useStats();
  const [filter, setFilter] = useState("all");

  if (!stats) {
    return (
      <Box
        display="grid"
        gap="10px"
        sx={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <MediaThumbSkeleton key={i} />
        ))}
      </Box>
    );
  }

  const items: MediaItem[] =
    kind === "clips"
      ? (stats?.media?.clips ?? []).map((cl: MediaClip) => ({
          id: cl.id,
          streamer: cl.streamer,
          title: cl.title,
          thumbnail: cl.thumbnail,
          views: cl.views,
          createdAt: cl.createdAt,
          duration: clipDuration(cl.duration),
          media: { kind: "clip", id: cl.id, title: cl.title, url: cl.url },
        }))
      : (stats?.media?.broadcasts ?? []).map((v: MediaVideo) => ({
          id: v.id,
          streamer: v.streamer,
          title: v.title,
          thumbnail: v.thumbnail,
          views: v.views,
          createdAt: v.createdAt,
          duration: fmtVodDuration(v.duration),
          media: { kind: "video", id: v.id, title: v.title, url: v.url },
        }));

  const streamerIds = Array.from(new Set(items.map((i) => i.streamer)));
  const shown = filter === "all" ? items : items.filter((i) => i.streamer === filter);

  return (
    <Box w="100%">
      {streamerIds.length > 1 ? (
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "ALL" },
            ...streamerIds.map((id) => ({ id, label: (STREAMER_NAME[id] || id).toUpperCase() })),
          ]}
        />
      ) : null}
      {shown.length === 0 ? (
        <Text fontFamily="mono" fontSize="xs" color={c.text.subtle}>
          {kind === "clips" ? "No clips yet." : "No recent broadcasts available."}
        </Text>
      ) : (
        <Box
          display="grid"
          gap="10px"
          sx={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
        >
          {shown.map((it) => (
            <MediaThumb
              key={it.id}
              title={it.title}
              thumbnail={it.thumbnail}
              views={it.views}
              createdAt={it.createdAt}
              duration={it.duration}
              onClick={() => onOpen(it.media)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

function MediaPlayer({ media, onClose }: { media: ActiveMedia; onClose: () => void }) {
  const c = useColors();
  const host = useHost();
  const src =
    media.kind === "clip"
      ? `https://clips.twitch.tv/embed?clip=${media.id}&parent=${host}&autoplay=true`
      : `https://player.twitch.tv/?video=${media.id}&parent=${host}&autoplay=true`;
  return (
    <Flex
      position="fixed"
      inset={0}
      zIndex={3000}
      bg="rgba(0,0,0,0.82)"
      align="center"
      justify="center"
      p="20px"
      onClick={onClose}
    >
      <Box w="min(920px, 94vw)" onClick={(e) => e.stopPropagation()}>
        <Flex justify="space-between" align="center" mb="10px" gap="12px">
          <Text fontSize="sm" fontWeight={600} color="#fff" noOfLines={1}>
            {media.title}
          </Text>
          <HStack spacing="10px" flexShrink={0}>
            <HStack
              as="a"
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              spacing="4px"
              fontSize="2xs"
              fontFamily="mono"
              color="rgba(255,255,255,0.7)"
              _hover={{ color: "#fff" }}
            >
              <LuExternalLink size={12} />
              <Text>TWITCH</Text>
            </HStack>
            <Box
              as="button"
              onClick={onClose}
              color="rgba(255,255,255,0.7)"
              _hover={{ color: "#fff" }}
              aria-label="Close"
            >
              <LuX size={20} />
            </Box>
          </HStack>
        </Flex>
        <Box
          position="relative"
          w="100%"
          borderRadius={c.radius.card}
          overflow="hidden"
          bg="#000"
          sx={{ aspectRatio: "16 / 9" }}
        >
          {host ? (
            <iframe
              src={src}
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          ) : null}
        </Box>
      </Box>
    </Flex>
  );
}

type AudienceTabKey = "audience" | "about" | "health" | "history" | "clips";

export function AudienceBox({
  admin = false,
  messages = [],
  popout = false,
}: {
  admin?: boolean;
  messages?: ChatMessage[];
  popout?: boolean;
}) {
  const c = useColors();
  usePopoutClient("audience", popout);
  const poppedOut = usePopoutHost("audience", admin && !popout);
  const [tab, setTab] = usePersistentState<AudienceTabKey>(
    admin ? "mb-admin-audience-tab" : "mb-audience-tab",
    admin ? "audience" : "about"
  );
  const [active, setActive] = useState<ActiveMedia | null>(null);

  const validTabs: AudienceTabKey[] = admin
    ? ["audience", "health"]
    : ["audience", "about", "history", "clips"];
  const current = validTabs.includes(tab) ? tab : "audience";

  if (admin && !popout && poppedOut) {
    return (
      <Box
        bg={c.surface}
        border="1px solid"
        borderColor={c.border.subtle}
        borderRadius={c.radius.panel}
        boxShadow={c.shadow.soft}
        flex="1"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        <PoppedOut
          label="Audience"
          url={AUDIENCE_POPOUT_URL}
          winName={AUDIENCE_POPOUT_NAME}
          features={AUDIENCE_POPOUT_FEATURES}
          popoutKey="audience"
        />
      </Box>
    );
  }

  return (
    <Box
      bg={c.surface}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.panel}
      boxShadow={c.shadow.soft}
      px="24px"
      py="16px"
      flex="1"
      minH={0}
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" mb="14px" flexShrink={0} position="relative">
        <HStack
          spacing="2px"
          bg={c.overlay.soft}
          borderRadius={c.radius.control}
          p="3px"
          mx="auto"
        >
          <TabButton active={current === "audience"} onClick={() => setTab("audience")}>
            AUDIENCE
          </TabButton>
          {admin ? (
            <TabButton active={current === "health"} onClick={() => setTab("health")}>
              FEED HEALTH
            </TabButton>
          ) : (
            <>
              <TabButton active={current === "about"} onClick={() => setTab("about")}>
                ABOUT
              </TabButton>
              <TabButton active={current === "history"} onClick={() => setTab("history")}>
                HISTORY
              </TabButton>
              <TabButton active={current === "clips"} onClick={() => setTab("clips")}>
                CLIPS
              </TabButton>
            </>
          )}
        </HStack>
        {admin && !popout && (
          <Box
            as="button"
            onClick={() =>
              window.open(AUDIENCE_POPOUT_URL, AUDIENCE_POPOUT_NAME, AUDIENCE_POPOUT_FEATURES)
            }
            position="absolute"
            right="0"
            top="50%"
            transform="translateY(-50%)"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            w="30px"
            h="30px"
            borderRadius={c.radius.control}
            color={c.text.muted}
            _hover={{ color: c.text.primary, bg: c.overlay.soft }}
            transition="all 0.15s"
            aria-label="Pop out audience"
          >
            <LuExternalLink size={16} />
          </Box>
        )}
      </Flex>
      <Box
        flex={admin ? "1" : undefined}
        minH={admin ? 0 : undefined}
        overflowY={admin ? "auto" : "visible"}
        sx={admin ? scrollbarSx(c) : undefined}
      >
        {current === "audience" && <AudienceTab admin={admin} messages={messages} />}
        {current === "about" && !admin && <AboutTab />}
        {current === "health" && admin && <FeedHealthTab messages={messages} />}
        {current === "history" && <MediaList kind="broadcasts" onOpen={setActive} />}
        {current === "clips" && <MediaList kind="clips" onOpen={setActive} />}
      </Box>
      {active ? <MediaPlayer media={active} onClose={() => setActive(null)} /> : null}
    </Box>
  );
}
