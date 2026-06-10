"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Flex, HStack, Input, SimpleGrid, Text } from "@chakra-ui/react";
import { FaTwitch } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuChevronUp, LuCheck, LuGlobe, LuSmile } from "react-icons/lu";
import { Platform, StreamerId, STREAMERS } from "@/lib/chat/types";
import { useAuth, type Provider } from "@/lib/auth";
import { useColors } from "@/theme/useColors";

const PLATS: Provider[] = ["twitch", "kick"];

const EMOJIS = [
  "😂", "🔥", "💀", "😭", "🚀", "📈", "📉", "💎",
  "🙌", "👀", "❤️", "😎", "🤔", "👏", "🎉", "🐂",
  "🐻", "💰", "✅", "❌", "😅", "🤝", "⚡", "💯",
  "🥳", "😤", "🧠", "👑", "🤡", "😮", "🙏", "💪",
];

function PlatIcon({ p }: { p: Provider }) {
  if (p === "twitch") return <FaTwitch size={12} />;
  return <SiKick size={11} />;
}

export function ChatComposer({
  platforms,
  streamers,
}: {
  platforms: Set<Platform>;
  streamers: Set<StreamerId>;
}) {
  const c = useColors();
  const { twitch, kick, login, send } = useAuth();

  const linked = useMemo<Provider[]>(() => {
    const out: Provider[] = [];
    if (twitch) out.push("twitch");
    if (kick) out.push("kick");
    return out;
  }, [twitch, kick]);

  const defaultStreamer = useMemo<StreamerId>(() => {
    const sel = STREAMERS.filter((s) => streamers.has(s.id));
    return (sel.length === 1 ? sel[0].id : STREAMERS[0]?.id) as StreamerId;
  }, [streamers]);

  const defaultPlatform = useMemo<Provider | null>(() => {
    const inFilter = linked.filter((p) => platforms.has(p));
    if (inFilter.length >= 1) return inFilter[0];
    return linked[0] ?? null;
  }, [platforms, linked]);

  const [streamer, setStreamer] = useState<StreamerId>(defaultStreamer);
  const [platform, setPlatform] = useState<Provider | null>(defaultPlatform);
  useEffect(() => setStreamer(defaultStreamer), [defaultStreamer]);
  useEffect(() => setPlatform(defaultPlatform), [defaultPlatform]);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [global, setGlobal] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const streamerName = STREAMERS.find((s) => s.id === streamer)?.displayName || streamer;

  if (linked.length === 0) {
    return (
      <Flex
        align="center"
        justify="space-between"
        gap="10px"
        h="52px"
        px="14px"
        flexShrink={0}
        borderTop="1px solid"
        borderColor={c.border.subtle}
      >
        <Text fontSize="xs" color={c.text.muted}>
          Sign in to chat
        </Text>
        <HStack spacing="8px">
          <HStack
            as="button"
            onClick={() => login("twitch")}
            spacing="6px"
            px="10px"
            h="30px"
            borderRadius={c.radius.pill}
            bg={c.overlay.soft}
            color={c.text.secondary}
            _hover={{ color: c.text.primary, bg: c.overlay.hover }}
          >
            <Box color={c.platform.twitch} display="flex">
              <FaTwitch size={12} />
            </Box>
            <Text fontSize="xs">Twitch</Text>
          </HStack>
          <HStack
            as="button"
            onClick={() => login("kick")}
            spacing="6px"
            px="10px"
            h="30px"
            borderRadius={c.radius.pill}
            bg={c.overlay.soft}
            color={c.text.secondary}
            _hover={{ color: c.text.primary, bg: c.overlay.hover }}
          >
            <Box color={c.platform.kick} display="flex">
              <SiKick size={11} />
            </Box>
            <Text fontSize="xs">Kick</Text>
          </HStack>
        </HStack>
      </Flex>
    );
  }

  async function submit() {
    const msg = text.trim();
    if (!msg || sending || (!global && !platform)) return;
    setSending(true);
    setError(null);

    if (global) {
      const targets = linked.flatMap((p) =>
        STREAMERS.map((s) => ({ p, id: s.id, name: s.displayName }))
      );
      const results = await Promise.all(targets.map((t) => send(t.p, t.id, msg)));
      const okCount = results.filter((r) => r.ok).length;
      setSending(false);
      if (okCount > 0) {
        setText("");
        const failed = targets.filter((_, i) => !results[i].ok).map((t) => t.name);
        if (failed.length) setError(`Sent to ${okCount}/${targets.length} — failed: ${failed.join(", ")}`);
      } else {
        setError(results[0]?.error || "Failed to send");
      }
      return;
    }

    const r = await send(platform!, streamer, msg);
    setSending(false);
    if (r.ok) setText("");
    else setError(r.error || "Failed to send");
  }

  const canSend = Boolean(text.trim()) && (global || Boolean(platform)) && !sending;

  return (
    <Box
      flexShrink={0}
      borderTop="1px solid"
      borderColor={c.border.subtle}
      px="12px"
      py="10px"
      position="relative"
    >
      {error && (
        <Text fontSize="2xs" color={c.brand.red} mb="6px" noOfLines={1}>
          {error}
        </Text>
      )}
      <Box position="relative">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={global ? "Message all channels…" : `Message ${streamerName}…`}
          h="40px"
          w="100%"
          pr="40px"
          fontSize="sm"
          bg={c.overlay.soft}
          border="1px solid"
          borderColor={c.border.subtle}
          color={c.text.primary}
          _placeholder={{ color: c.text.placeholder }}
          _hover={{ borderColor: c.border.default }}
          _focusVisible={{ borderColor: c.border.strong, boxShadow: "none" }}
          maxLength={480}
        />
        <Box
          as="button"
          onClick={() => setEmojiOpen((o) => !o)}
          position="absolute"
          right="8px"
          top="50%"
          transform="translateY(-50%)"
          color={emojiOpen ? c.text.primary : c.text.muted}
          _hover={{ color: c.text.primary }}
          display="flex"
          aria-label="Emoji"
        >
          <LuSmile size={18} />
        </Box>
        {emojiOpen && (
          <>
            <Box position="fixed" inset="0" zIndex={20} onClick={() => setEmojiOpen(false)} />
            <Box
              position="absolute"
              bottom="48px"
              right="0"
              zIndex={21}
              w="252px"
              bg={c.surfaceLight}
              border="1px solid"
              borderColor={c.border.subtle}
              borderRadius={c.radius.control}
              boxShadow={c.shadow.panel}
              p="6px"
            >
              <SimpleGrid columns={8} spacing="2px">
                {EMOJIS.map((e) => (
                  <Box
                    as="button"
                    key={e}
                    onClick={() => {
                      setText((t) => (t + e).slice(0, 480));
                      setEmojiOpen(false);
                    }}
                    fontSize="lg"
                    lineHeight="1"
                    p="4px"
                    borderRadius="8px"
                    _hover={{ bg: c.overlay.hover }}
                  >
                    {e}
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          </>
        )}
      </Box>

      <Flex align="center" justify="space-between" mt="8px" gap="8px">
        <Box position="relative" flexShrink={0}>
          <HStack
            as="button"
            onClick={() => setMenuOpen((o) => !o)}
            spacing="6px"
            px="9px"
            h="34px"
            borderRadius={c.radius.control}
            bg={c.overlay.soft}
            border="1px solid"
            borderColor={c.border.subtle}
            _hover={{ bg: c.overlay.hover }}
            transition="all 0.12s"
          >
            {global ? (
              <Box color={c.brand.gold} display="flex">
                <LuGlobe size={13} />
              </Box>
            ) : platform ? (
              <Box color={platform === "twitch" ? c.platform.twitch : c.platform.kick} display="flex">
                <PlatIcon p={platform} />
              </Box>
            ) : null}
            <Text fontSize="xs" color={c.text.secondary} noOfLines={1} maxW="110px">
              {global ? "Global" : streamerName}
            </Text>
            <Box color={c.text.subtle} display="flex">
              <LuChevronUp size={12} />
            </Box>
          </HStack>

          {menuOpen && (
            <>
              <Box position="fixed" inset="0" zIndex={20} onClick={() => setMenuOpen(false)} />
              <Box
                position="absolute"
                bottom="44px"
                left="0"
                zIndex={21}
                w="186px"
                bg={c.surfaceLight}
                border="1px solid"
                borderColor={c.border.subtle}
                borderRadius={c.radius.control}
                boxShadow={c.shadow.panel}
                p="4px"
              >
                <HStack
                  as="button"
                  onClick={() => {
                    setGlobal(true);
                    setMenuOpen(false);
                    setError(null);
                  }}
                  w="100%"
                  justify="space-between"
                  px="9px"
                  py="7px"
                  borderRadius={c.radius.control}
                  bg={global ? c.overlay.strong : "transparent"}
                  _hover={{ bg: c.overlay.hover }}
                >
                  <HStack spacing="8px">
                    <Box color={c.brand.gold} display="flex">
                      <LuGlobe size={13} />
                    </Box>
                    <Text fontSize="sm" color={c.text.primary}>
                      Global
                    </Text>
                  </HStack>
                  {global && (
                    <Box color={c.brand.green} display="flex">
                      <LuCheck size={13} />
                    </Box>
                  )}
                </HStack>
                <Box h="1px" bg={c.border.subtle} my="4px" />
                {PLATS.map((p) => {
                  const isLinked = linked.includes(p);
                  return (
                    <Box key={p} pb="2px">
                      <HStack px="8px" pt="6px" pb="4px" spacing="6px" color={c.text.subtle}>
                        <Box color={p === "twitch" ? c.platform.twitch : c.platform.kick} display="flex">
                          <PlatIcon p={p} />
                        </Box>
                        <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em">
                          {p.toUpperCase()}
                        </Text>
                      </HStack>
                      {isLinked ? (
                        STREAMERS.map((s) => {
                          const active = platform === p && streamer === s.id;
                          return (
                            <HStack
                              as="button"
                              key={p + s.id}
                              onClick={() => {
                                setPlatform(p);
                                setStreamer(s.id);
                                setGlobal(false);
                                setMenuOpen(false);
                                setError(null);
                              }}
                              w="100%"
                              justify="space-between"
                              px="9px"
                              py="7px"
                              borderRadius={c.radius.control}
                              bg={!global && active ? c.overlay.strong : "transparent"}
                              _hover={{ bg: c.overlay.hover }}
                            >
                              <Text fontSize="sm" color={c.text.primary}>
                                {s.displayName}
                              </Text>
                              {!global && active && (
                                <Box color={c.brand.green} display="flex">
                                  <LuCheck size={13} />
                                </Box>
                              )}
                            </HStack>
                          );
                        })
                      ) : (
                        <Box
                          as="button"
                          onClick={() => login(p)}
                          w="100%"
                          textAlign="left"
                          px="9px"
                          py="7px"
                          borderRadius={c.radius.control}
                          _hover={{ bg: c.overlay.hover }}
                        >
                          <Text fontSize="xs" color={c.text.muted}>
                            Link {p === "twitch" ? "Twitch" : "Kick"} to post here
                          </Text>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </>
          )}
        </Box>

        <Box
          as="button"
          onClick={submit}
          px="22px"
          h="34px"
          flexShrink={0}
          borderRadius={c.radius.control}
          bg={canSend ? c.brand.green : c.overlay.soft}
          color={canSend ? "#04130c" : c.text.subtle}
          opacity={sending ? 0.7 : 1}
          _hover={canSend ? { opacity: 0.9 } : {}}
          transition="all 0.12s"
          fontWeight={600}
          fontSize="sm"
        >
          {sending ? "Sending…" : "Chat"}
        </Box>
      </Flex>
    </Box>
  );
}
