"use client";

import { useEffect, useState } from "react";
import { Box, Flex, HStack, Image, Text, VStack, type BoxProps } from "@chakra-ui/react";
import { FaTwitch, FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuCalendar, LuX, LuExternalLink, LuEye } from "react-icons/lu";
import { useStats, type MarketQuote, type MediaClip, type MediaVideo } from "@/lib/chat/StatsProvider";
import { RollingNumber } from "./RollingNumber";
import { useAvatar } from "@/lib/avatars";
import { useColors } from "@/theme/useColors";

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
      <Box flex="1" minH={0} overflowY="auto">
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

function MarketGroup({ title, rows }: { title: string; rows: MarketQuote[] }) {
  const c = useColors();
  return (
    <Box>
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em" color={c.text.subtle} mb="6px">
        {title}
      </Text>
      {rows.length === 0 ? (
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
      <MarketGroup title="CRYPTO" rows={stats?.markets.crypto ?? []} />
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
  const markets = stats?.markets.polymarket ?? [];
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
  const [tab, setTab] = useState<"polymarket" | "markets">("polymarket");
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
        alignSelf="flex-start"
      >
        <TabButton active={tab === "polymarket"} onClick={() => setTab("polymarket")}>
          POLYMARKET
        </TabButton>
        <TabButton active={tab === "markets"} onClick={() => setTab("markets")}>
          MARKETS
        </TabButton>
      </HStack>
      <Box flex="1" minH={0} overflowY="auto">
        {tab === "polymarket" ? <PolymarketList /> : <MarketsList />}
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

function BigNumber({ value, fallback }: { value: number | null; fallback: string }) {
  const c = useColors();
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
}: {
  name: string;
  total: number | null;
  rows: { name: string; value: number | null; color: string; img: string }[];
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

      <BigNumber value={total} fallback="offline" />

      <Flex
        direction="column"
        gap={AUD_GAP}
        mt={AUD_MT}
        pt={AUD_PT}
        borderTop="1px solid"
        borderColor={c.border.subtle}
      >
        {rows.map((r) => (
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
}: {
  total: number | null;
  site: number | null;
  peak: number | null;
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

      <BigNumber value={total} fallback="—" />

      <Flex
        direction="column"
        gap={AUD_GAP}
        mt={AUD_MT}
        pt={AUD_PT}
        borderTop="1px solid"
        borderColor={c.border.subtle}
      >
        <TotalRow label="On Market Bubble" value={site} color={c.brand.red} />
        <TotalRow label="Peak" value={peak} />
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

function AudienceTab() {
  const c = useColors();
  const stats = useStats();
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
          total={v?.kick ?? null}
          rows={streamers.map((s) => ({
            name: s.name,
            value: s.kick,
            color: streamerAccent(c, s.id),
            img: STREAMER_IMG[s.id] || "",
          }))}
        />
        <TotalTile total={v?.total ?? null} site={v?.site ?? null} peak={v?.peak ?? null} />
      </Flex>
    </Box>
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
    <Box maxW="640px" w="100%">
      <Text fontSize="sm" lineHeight={1.65} color={c.text.secondary}>
        Market Bubble is a live markets show where Banks and Ansem break down crypto, trade ideas, and
        the week&apos;s biggest moves — unfiltered. Make money, command attention, leverage AI.
      </Text>
      <HStack mt="14px" spacing="8px" align="stretch">
        {ABOUT_HOSTS.map((h) => (
          <HostRow key={h.id} host={h} />
        ))}
      </HStack>
      <HStack mt="14px" spacing="7px">
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

type AudienceTabKey = "audience" | "about" | "history" | "clips";

export function AudienceBox() {
  const c = useColors();
  const [tab, setTab] = useState<AudienceTabKey>("audience");
  const [active, setActive] = useState<ActiveMedia | null>(null);
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
        alignSelf="flex-start"
      >
        <TabButton active={tab === "audience"} onClick={() => setTab("audience")}>
          AUDIENCE
        </TabButton>
        <TabButton active={tab === "about"} onClick={() => setTab("about")}>
          ABOUT
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          HISTORY
        </TabButton>
        <TabButton active={tab === "clips"} onClick={() => setTab("clips")}>
          CLIPS
        </TabButton>
      </HStack>
      <Box overflowY="visible">
        {tab === "audience" && <AudienceTab />}
        {tab === "about" && <AboutTab />}
        {tab === "history" && <MediaList kind="broadcasts" onOpen={setActive} />}
        {tab === "clips" && <MediaList kind="clips" onOpen={setActive} />}
      </Box>
      {active ? <MediaPlayer media={active} onClose={() => setActive(null)} /> : null}
    </Box>
  );
}
