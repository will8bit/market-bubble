"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Box, Flex, HStack, Input, SimpleGrid, Text } from "@chakra-ui/react";
import { FaTwitch } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuChevronUp, LuCheck, LuGlobe, LuSmile, LuSettings } from "react-icons/lu";
import { Platform, StreamerId, STREAMERS } from "@/lib/chat/types";
import { useAuth, type Provider } from "@/lib/auth";
import { useColors } from "@/theme/useColors";

const SEND_PLATFORMS: Provider[] = ["twitch", "kick"];
const ALL_PLATFORMS: Platform[] = ["twitch", "kick", "x"];

const EMOJIS = [
  "😂", "🔥", "💀", "😭", "🚀", "📈", "📉", "💎",
  "🙌", "👀", "❤️", "😎", "🤔", "👏", "🎉", "🐂",
  "🐻", "💰", "✅", "❌", "😅", "🤝", "⚡", "💯",
  "🥳", "😤", "🧠", "👑", "🤡", "😮", "🙏", "💪",
];

function PlatIcon({ p, size = 12 }: { p: Provider; size?: number }) {
  if (p === "twitch") return <FaTwitch size={size} />;
  return <SiKick size={size - 1} />;
}
function plabel(p: Provider) {
  return p === "twitch" ? "Twitch" : "Kick";
}

export function ChatComposer({
  platforms,
  streamers,
  setPlatforms,
  setStreamers,
  settingsOpen = false,
  onSettings,
  echoSelf,
  removeLocal,
}: {
  platforms: Set<Platform>;
  streamers: Set<StreamerId>;
  setPlatforms: Dispatch<SetStateAction<Set<Platform>>>;
  setStreamers: Dispatch<SetStateAction<Set<StreamerId>>>;
  settingsOpen?: boolean;
  onSettings?: () => void;
  echoSelf: (p: {
    authorName: string;
    handles: { twitch?: string; kick?: string };
    text: string;
    channels: { streamer: StreamerId; platform: Platform }[];
    global: boolean;
  }) => string;
  removeLocal: (id: string) => void;
}) {
  const c = useColors();
  const { twitch, kick, login, send } = useAuth();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const isLinked = (p: Provider) => (p === "twitch" ? Boolean(twitch) : Boolean(kick));
  const anyLinked = Boolean(twitch || kick);

  const selStreamers = STREAMERS.filter((s) => streamers.has(s.id));
  const selPlatforms = SEND_PLATFORMS.filter((p) => platforms.has(p));
  const isGlobal =
    platforms.has("twitch") && platforms.has("kick") && streamers.size === STREAMERS.length;

  const chipLabel = isGlobal
    ? "Global"
    : `${selStreamers.map((s) => s.displayName).join(", ") || "None"} · ${
        selPlatforms.map(plabel).join(", ") || "None"
      }`;

  function togglePlatform(p: Provider) {
    setPlatforms((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
    setError(null);
  }
  function toggleStreamer(id: StreamerId) {
    setStreamers((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setError(null);
  }
  function selectGlobal() {
    setPlatforms(new Set(ALL_PLATFORMS));
    setStreamers(new Set(STREAMERS.map((s) => s.id)));
    setError(null);
  }

  async function submit() {
    const msg = text.trim();
    if (!msg || sending) return;
    if (selPlatforms.length === 0 || selStreamers.length === 0) {
      setError("Pick a channel to post to.");
      return;
    }
    const linkedP = selPlatforms.filter(isLinked);
    const unlinkedP = selPlatforms.filter((p) => !isLinked(p));
    if (linkedP.length === 0) {
      setError(`Sign in with ${unlinkedP.map(plabel).join(" & ")} to post there.`);
      return;
    }
    setSending(true);
    setError(null);
    const targets = linkedP.flatMap((p) => selStreamers.map((s) => ({ platform: p, streamer: s.id })));
    const echoId = echoSelf({
      authorName: twitch?.displayName || kick?.displayName || "you",
      handles: { twitch: twitch?.username, kick: kick?.username },
      text: msg,
      channels: targets.map((t) => ({ streamer: t.streamer, platform: t.platform })),
      global: isGlobal,
    });
    const res = await send(targets, msg);
    setSending(false);

    const okCount = res.results ? res.results.filter((r) => r.ok).length : res.ok ? targets.length : 0;
    const notes: string[] = [];
    if (unlinkedP.length) notes.push(`not sent on ${unlinkedP.map(plabel).join(" & ")} (sign in)`);
    const failNotes = (res.results || [])
      .filter((r) => !r.ok)
      .map((r) => {
        const name = STREAMERS.find((s) => s.id === r.streamer)?.displayName || r.streamer;
        return `${name} ${plabel(r.platform as Provider)}: ${r.error || "failed"}`;
      });
    notes.push(...failNotes);

    if (okCount > 0) {
      setText("");
      setError(notes.length ? notes.join(" · ") : null);
    } else {
      removeLocal(echoId);
      setError(res.error || notes.join(" · ") || "Couldn't send");
    }
  }

  const canSend = Boolean(text.trim()) && !sending;

  if (!anyLinked) {
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
        <Text fontSize="2xs" color={c.brand.red} mb="6px" noOfLines={2}>
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
          placeholder={isGlobal ? "Message all channels…" : "Message…"}
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
        <Box position="relative" flexShrink={1} minW={0}>
          <HStack
            as="button"
            onClick={() => setMenuOpen((o) => !o)}
            spacing="6px"
            px="9px"
            h="34px"
            maxW="100%"
            borderRadius={c.radius.control}
            bg={c.overlay.soft}
            border="1px solid"
            borderColor={c.border.subtle}
            _hover={{ bg: c.overlay.hover }}
            transition="all 0.12s"
          >
            {isGlobal && (
              <Box color={c.brand.gold} display="flex" flexShrink={0}>
                <LuGlobe size={13} />
              </Box>
            )}
            <Text fontSize="xs" color={c.text.secondary} noOfLines={1}>
              {chipLabel}
            </Text>
            <Box color={c.text.subtle} display="flex" flexShrink={0}>
              <LuChevronUp size={12} />
            </Box>
          </HStack>

          {menuOpen && (
            <>
              <Box position="fixed" inset="0" zIndex={20} onClick={() => setMenuOpen(false)} />
              <Box
                position="absolute"
                bottom="42px"
                left="0"
                zIndex={21}
                w="200px"
                bg={c.surfaceLight}
                border="1px solid"
                borderColor={c.border.subtle}
                borderRadius={c.radius.control}
                boxShadow={c.shadow.panel}
                p="4px"
              >
                <HStack
                  as="button"
                  onClick={selectGlobal}
                  w="100%"
                  justify="space-between"
                  px="9px"
                  py="7px"
                  borderRadius={c.radius.control}
                  bg={isGlobal ? c.overlay.strong : "transparent"}
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
                  {isGlobal && (
                    <Box color={c.brand.green} display="flex">
                      <LuCheck size={13} />
                    </Box>
                  )}
                </HStack>

                <Box h="1px" bg={c.border.subtle} my="4px" />
                <Text px="9px" pb="4px" fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
                  STREAMERS
                </Text>
                {STREAMERS.map((s) => {
                  const on = streamers.has(s.id);
                  return (
                    <HStack
                      as="button"
                      key={s.id}
                      onClick={() => toggleStreamer(s.id)}
                      w="100%"
                      justify="space-between"
                      px="9px"
                      py="7px"
                      borderRadius={c.radius.control}
                      bg={on && !isGlobal ? c.overlay.strong : "transparent"}
                      _hover={{ bg: c.overlay.hover }}
                    >
                      <Text fontSize="sm" color={c.text.primary}>
                        {s.displayName}
                      </Text>
                      {on && (
                        <Box color={c.brand.green} display="flex">
                          <LuCheck size={13} />
                        </Box>
                      )}
                    </HStack>
                  );
                })}

                <Box h="1px" bg={c.border.subtle} my="4px" />
                <Text px="9px" pb="4px" fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
                  PLATFORMS
                </Text>
                {SEND_PLATFORMS.map((p) => {
                  const on = platforms.has(p);
                  const linked = isLinked(p);
                  return (
                    <HStack
                      as="button"
                      key={p}
                      onClick={() => togglePlatform(p)}
                      w="100%"
                      justify="space-between"
                      px="9px"
                      py="7px"
                      borderRadius={c.radius.control}
                      bg={on && !isGlobal ? c.overlay.strong : "transparent"}
                      _hover={{ bg: c.overlay.hover }}
                    >
                      <HStack spacing="8px">
                        <Box color={p === "twitch" ? c.platform.twitch : c.platform.kick} display="flex">
                          <PlatIcon p={p} />
                        </Box>
                        <Text fontSize="sm" color={c.text.primary}>
                          {plabel(p)}
                        </Text>
                      </HStack>
                      {linked ? (
                        on && (
                          <Box color={c.brand.green} display="flex">
                            <LuCheck size={13} />
                          </Box>
                        )
                      ) : (
                        <Box
                          as="span"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            login(p);
                          }}
                          fontSize="2xs"
                          color={c.text.muted}
                          px="7px"
                          py="3px"
                          borderRadius={c.radius.pill}
                          bg={c.overlay.soft}
                          _hover={{ color: c.text.primary }}
                        >
                          Sign in
                        </Box>
                      )}
                    </HStack>
                  );
                })}
              </Box>
            </>
          )}
        </Box>

        <HStack spacing="8px" flexShrink={0}>
          <Flex
            as="button"
            onClick={onSettings}
            align="center"
            justify="center"
            w="34px"
            h="34px"
            borderRadius={c.radius.control}
            bg={settingsOpen ? c.overlay.strong : c.overlay.soft}
            color={settingsOpen ? c.text.primary : c.text.muted}
            _hover={{ color: c.text.primary, bg: c.overlay.hover }}
            transition="all 0.12s"
            aria-label="Chat settings"
          >
            <LuSettings size={16} />
          </Flex>
          <Box
            as="button"
            onClick={submit}
            px="22px"
            h="34px"
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
        </HStack>
      </Flex>
    </Box>
  );
}
