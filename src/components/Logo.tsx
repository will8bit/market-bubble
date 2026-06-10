import { Box, HStack, Text } from "@chakra-ui/react";

export function MarketBubbleMark({ size = 24 }: { size?: number }) {
  return (
    <Box as="span" display="inline-flex" lineHeight={0}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 8 H54 V44 H26 L18 54 V44 H10 Z"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M16 38 L26 28 L32 33 L44 19"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M38 19 H46 V27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </Box>
  );
}

export function Logo() {
  return (
    <HStack spacing="11px" align="center">
      <MarketBubbleMark size={23} />
      <Text
        fontFamily="heading"
        fontWeight={400}
        fontSize="3xl"
        letterSpacing="0.01em"
        lineHeight={1}
      >
        Market Bubble
      </Text>
    </HStack>
  );
}
