import { Box, HStack, Text } from "@chakra-ui/react";

export function MarketBubbleMark({ size = 24 }: { size?: number }) {
  return (
    <Box as="span" display="inline-flex" lineHeight={0}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 612 612"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M606 51 L596 52 L515 83 L515 86 L537 101 L498 146 L489 154 L488 34 L484 29 L429 28 L10 30 L7 33 L6 43 L6 478 L10 480 L151 481 L153 483 L151 581 L153 584 L157 583 L227 509 L257 480 L484 479 L487 476 L488 471 L488 201 L559 122 L563 124 L577 145 L583 151 L587 150 L606 61ZM469 225 L470 454 L467 459 L251 460 L248 461 L173 540 L171 517 L172 467 L170 463 L149 461 L35 461 L30 459 L33 454 L155 321 L211 378 L213 378 L223 369 L324 258 L327 259 L379 312 L384 313 L387 312 L464 227 L467 224ZM27 416 L29 54 L31 52 L462 52 L468 56 L469 178 L380 278 L378 278 L324 223 L319 223 L211 341 L209 341 L155 286 L152 286 L29 418Z" fill="currentColor" stroke="currentColor" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" fillRule="evenodd" clipRule="evenodd" />
      </svg>
    </Box>
  );
}

export function Logo() {
  return (
    <HStack spacing="11px" align="center">
      <MarketBubbleMark size={23} />
      <Text fontFamily="heading" fontWeight={400} fontSize="3xl" letterSpacing="0.01em" lineHeight={1}>
        Market Bubble
      </Text>
    </HStack>
  );
}
