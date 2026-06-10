"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Flex, HStack, Image, Text, type BoxProps } from "@chakra-ui/react";
import { FaTwitch } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuCalendar } from "react-icons/lu";
import { useStats, type MarketQuote } from "@/lib/chat/StatsProvider";
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

function PolyCard({ m }: { m: { question: string; yes: number; no: number; endDate: string } }) {
  const c = useColors();
  const yesPct = Math.round(m.yes * 100);
  const noPct = Math.round(m.no * 100);
  const end = fmtEndDate(m.endDate);
  return (
    <Box
      bg={c.surfaceLight}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.card}
      p="12px"
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

      <Box mt="11px">
        <Box h="6px" borderRadius="full" bg={c.overlay.soft} overflow="hidden" mb="5px">
          <Box w={`${yesPct}%`} h="100%" bg={c.brand.green} />
        </Box>
        <Box h="6px" borderRadius="full" bg={c.overlay.soft} overflow="hidden">
          <Box w={`${noPct}%`} h="100%" bg={c.brand.red} />
        </Box>
      </Box>

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
const AUD_NUM = "2.25em";
const AUD_PAD = "1.125em";
const AUD_MT = "1em";
const AUD_PT = "0.875em";
const AUD_GAP = "0.625em";
const AUD_HEAD_MB = "1em";
const AUD_LABEL = "0.6875em";
const AUD_ROW = "0.8125em";
const AUD_VAL = "0.875em";

function FitScale({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);

  useEffect(() => {
    const recompute = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const avail = outer.clientHeight - 4;
      if (avail <= 0) return;
      const natural = inner.offsetHeight / scaleRef.current;
      if (natural <= 0) return;
      const next = Math.max(0.45, Math.min(1, avail / natural));
      if (Math.abs(next - scaleRef.current) > 0.004) {
        scaleRef.current = next;
        setScale(next);
      }
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <Box
      ref={outerRef}
      h="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      <Box ref={innerRef} w="100%" style={{ fontSize: `${AUD_BASE * scale}px` }}>
        {children}
      </Box>
    </Box>
  );
}

function RollingDigit({ digit }: { digit: number }) {
  return (
    <Box as="span" display="inline-block" overflow="hidden" h="1em" lineHeight="1">
      <Box
        as="span"
        display="block"
        transition="transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)"
        transform={`translateY(-${digit}em)`}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Box as="span" key={n} display="block" h="1em" lineHeight="1">
            {n}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function RollingNumber({
  value,
  fontSize,
  fontWeight = 600,
  fontFamily = "body",
  color,
}: {
  value: number;
  fontSize: string;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
}) {
  const chars = Math.round(value).toLocaleString().split("");
  return (
    <Flex
      as="span"
      display="inline-flex"
      align="flex-end"
      overflow="hidden"
      lineHeight="1"
      fontSize={fontSize}
      fontWeight={fontWeight}
      fontFamily={fontFamily}
      color={color}
    >
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <RollingDigit key={i} digit={Number(ch)} />
        ) : (
          <Box as="span" key={i} display="inline-block" h="1em" lineHeight="1">
            {ch}
          </Box>
        )
      )}
    </Flex>
  );
}

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
  const c = useColors();
  return (
    <Flex
      direction="column"
      flex="1"
      minW={0}
      maxW={{ md: "340px" }}
      bg={c.surfaceLight}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.card}
      p={AUD_PAD}
    >
      {children}
    </Flex>
  );
}

function BigNumber({ value, fallback }: { value: number | null; fallback: string }) {
  const c = useColors();
  if (value == null) {
    return (
      <Text fontFamily="body" fontWeight={600} fontSize={AUD_NUM} lineHeight="1" color={c.text.subtle}>
        {fallback}
      </Text>
    );
  }
  return <RollingNumber value={value} fontSize={AUD_NUM} color={c.text.primary} />;
}

function PlatformTile({
  icon,
  name,
  total,
  color,
  rows,
}: {
  icon: React.ReactNode;
  name: string;
  total: number | null;
  color: string;
  rows: { name: string; value: number | null; color: string; img: string }[];
}) {
  const c = useColors();
  return (
    <TileShell>
      <HStack spacing="0.5625em" mb={AUD_HEAD_MB}>
        <Box display="flex" color={color} fontSize="1em">
          {icon}
        </Box>
        <Text fontFamily="mono" fontSize={AUD_LABEL} letterSpacing="0.1em" color={c.text.muted}>
          {name.toUpperCase()}
        </Text>
      </HStack>

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
      <Text fontFamily="mono" fontSize={AUD_LABEL} letterSpacing="0.1em" color={c.text.muted} mb={AUD_HEAD_MB}>
        LIVE TOTAL
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

export function AudienceBox() {
  const c = useColors();
  const stats = useStats();
  const v = stats?.viewers;
  const streamers = v?.streamers ?? [];
  const accent = (id: string) => (id === "banks" ? c.streamer.banks : c.streamer.ansem);

  return (
    <Card title="AUDIENCE">
      <FitScale>
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={{ base: "14px", md: "16px" }}
          w="100%"
          justify="center"
          align="stretch"
        >
          <PlatformTile
            icon={<FaTwitch size="1em" />}
            name="Twitch"
            total={v?.twitch ?? null}
            color={c.platform.twitch}
            rows={streamers.map((s) => ({
              name: s.name,
              value: s.twitch,
              color: accent(s.id),
              img: STREAMER_IMG[s.id] || "",
            }))}
          />
          <PlatformTile
            icon={<SiKick size="1em" />}
            name="Kick"
            total={v?.kick ?? null}
            color={c.platform.kick}
            rows={streamers.map((s) => ({
              name: s.name,
              value: s.kick,
              color: accent(s.id),
              img: STREAMER_IMG[s.id] || "",
            }))}
          />
          <TotalTile total={v?.total ?? null} site={v?.site ?? null} peak={v?.peak ?? null} />
        </Flex>
      </FitScale>
    </Card>
  );
}
