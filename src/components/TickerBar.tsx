"use client";

import { HStack, Text, Box } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { TICKERS, Ticker } from "@/lib/tickers";
import { useStats } from "@/lib/chat/StatsProvider";
import { useColors } from "@/theme/useColors";

function fmtTickerPrice(p: number): string {
  if (p >= 1000) return `$${Math.round(p).toLocaleString()}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

function TickerPill({ symbol, price, change }: Ticker) {
  const c = useColors();
  const up = change >= 0;
  return (
    <HStack spacing="9px" flexShrink={0}>
      <Text fontFamily="mono" fontSize="sm" fontWeight={600} color={c.text.primary}>
        {symbol}
      </Text>
      <Text fontFamily="mono" fontSize="sm" color={c.text.muted}>
        {price}
      </Text>
      <Text fontFamily="mono" fontSize="sm" fontWeight={600} color={up ? c.brand.green : c.brand.red}>
        {up ? "+" : ""}
        {change.toFixed(1)}%
      </Text>
      <Text px="11px" color={c.text.subtle} aria-hidden="true">
        ·
      </Text>
    </HStack>
  );
}

export function TickerBar() {
  const stats = useStats();
  const crypto = stats?.markets.crypto ?? [];
  const source: Ticker[] = crypto.length
    ? crypto.map((m) => ({ symbol: m.symbol, price: fmtTickerPrice(m.price), change: m.change }))
    : TICKERS;
  const base = [...source, ...source, ...source, ...source];
  const items = [...base, ...base];
  return (
    <Box
      position="relative"
      flex="1"
      minW={0}
      overflow="hidden"
      mx={{ base: "8px", md: "18px" }}
      display={{ base: "none", md: "block" }}
      sx={{
        maskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
      }}
    >
      <HStack
        spacing="0"
        w="max-content"
        animation={`${scroll} 170s linear infinite`}
        _hover={{ animationPlayState: "paused" }}
      >
        {items.map((t, i) => (
          <TickerPill key={i} {...t} />
        ))}
      </HStack>
    </Box>
  );
}
