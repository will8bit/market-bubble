"use client";

import { Box, Flex } from "@chakra-ui/react";

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

export function RollingNumber({
  value,
  fontSize,
  fontWeight = 600,
  fontFamily = "body",
  color,
}: {
  value: number | string;
  fontSize: string;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
}) {
  const text = typeof value === "number" ? Math.round(value).toLocaleString() : value;
  const chars = text.split("");
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
      sx={{ fontVariantNumeric: "tabular-nums" }}
    >
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <RollingDigit key={i} digit={Number(ch)} />
        ) : (
          <Box as="span" key={i} display="inline-block" h="1em" lineHeight="1" whiteSpace="pre">
            {ch}
          </Box>
        )
      )}
    </Flex>
  );
}
