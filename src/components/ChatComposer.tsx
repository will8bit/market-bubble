"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Input,
  SimpleGrid,
  Text,
  Image,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { FaTwitch, FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { LuChevronUp, LuCheck, LuSmile, LuSettings } from "react-icons/lu";
import { Platform, StreamerId, STREAMERS, streamerPlatforms } from "@/lib/chat/types";
import { useAuth, type Provider } from "@/lib/auth";
import { useAvatar, getAvatar } from "@/lib/avatars";
import { MarketBubbleMark } from "./Logo";
import { useColors } from "@/theme/useColors";

const SEND_PLATFORMS: Provider[] = ["twitch", "kick"];

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

function StreamerOption({
  streamer,
  on,
  isGlobal,
  onClick,
}: {
  streamer: (typeof STREAMERS)[number];
  on: boolean;
  isGlobal: boolean;
  onClick: () => void;
}) {
  const c = useColors();
  const src = useAvatar(`/${streamer.id}.jpg`);
  const isMB = streamer.id === "marketbubble";
  return (
    <HStack
      as="button"
      onClick={onClick}
      w="100%"
      justify="space-between"
      px="9px"
      py="7px"
      borderRadius={c.radius.control}
      bg={on && !isGlobal ? c.overlay.soft : "transparent"}
      _hover={{ bg: c.overlay.hover }}
    >
      <HStack spacing="9px" minW={0}>
        <Box
          w="20px"
          h="20px"
          borderRadius="full"
          overflow="hidden"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg={isMB ? "#ffffff" : undefined}
          color={isMB ? "#000000" : c.text.primary}
        >
          {isMB ? (
            <MarketBubbleMark size={12} />
          ) : (
            <Image src={src} alt={streamer.displayName} w="100%" h="100%" objectFit="cover" />
          )}
        </Box>
        <Text fontSize="sm" color={c.text.primary} noOfLines={1}>
          {streamer.displayName}
        </Text>
      </HStack>
      {on && !isGlobal && (
        <Box color={c.brand.green} display="flex">
          <LuCheck size={13} />
        </Box>
      )}
    </HStack>
  );
}

export function ChatComposer({
  platforms,
  streamers,
  global,
  onTogglePlatform,
  onToggleStreamer,
  onSelectGlobal,
  settingsOpen = false,
  onSettings,
  echoSelf,
  removeLocal,
}: {
  platforms: Set<Platform>;
  streamers: Set<StreamerId>;
  global: boolean;
  onTogglePlatform: (p: Platform) => void;
  onToggleStreamer: (id: StreamerId) => void;
  onSelectGlobal: () => void;
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
  const [signInOpen, setSignInOpen] = useState(false);

  const isLinked = (p: Provider) => (p === "twitch" ? Boolean(twitch) : Boolean(kick));
  const anyLinked = Boolean(twitch || kick);

  const selStreamers = STREAMERS.filter((s) => streamers.has(s.id));
  const selPlatforms = SEND_PLATFORMS.filter((p) => platforms.has(p));
  const isGlobal = global;

  const chipPlatforms = (["twitch", "kick", "x"] as Platform[]).filter((p) => platforms.has(p));

  async function submit() {
    if (sending) return;
    if (!anyLinked) {
      setSignInOpen(true);
      return;
    }
    const msg = text.trim();
    if (!msg) return;
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
    const targets = linkedP.flatMap((p) =>
      selStreamers
        .filter((s) => streamerPlatforms(s.id).includes(p))
        .map((s) => ({ platform: p, streamer: s.id }))
    );
    if (targets.length === 0) {
      setSending(false);
      setError("Selected source can't be posted to (X is view-only).");
      return;
    }
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

  const canSend = !sending && (Boolean(text.trim()) || !anyLinked);

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
            _hover={{ bg: c.overlay.hover }}
            transition="all 0.12s"
          >
            {isGlobal ? (
              <>
                <Box color={c.text.primary} display="flex" flexShrink={0}>
                  <MarketBubbleMark size={14} />
                </Box>
                <Text fontSize="xs" color={c.text.secondary} noOfLines={1}>
                  Global
                </Text>
              </>
            ) : (
              <HStack spacing="6px" minW={0}>
                {selStreamers.length > 0 ? (
                  <HStack spacing="4px" flexShrink={0}>
                    {selStreamers.map((s) =>
                      s.id === "marketbubble" ? (
                        <Box
                          key={s.id}
                          w="18px"
                          h="18px"
                          borderRadius="full"
                          bg="#ffffff"
                          color="#000000"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <MarketBubbleMark size={12} />
                        </Box>
                      ) : (
                        <Box
                          key={s.id}
                          w="18px"
                          h="18px"
                          borderRadius="full"
                          overflow="hidden"
                          flexShrink={0}
                        >
                          <Image
                            src={getAvatar(`/${s.id}.jpg`)}
                            alt={s.displayName}
                            w="100%"
                            h="100%"
                            objectFit="cover"
                          />
                        </Box>
                      )
                    )}
                  </HStack>
                ) : (
                  <Text fontSize="xs" color={c.text.secondary} noOfLines={1}>
                    None
                  </Text>
                )}
                {chipPlatforms.length > 0 && (
                  <>
                    <Text fontSize="xs" color={c.text.subtle} flexShrink={0}>
                      ·
                    </Text>
                    <HStack spacing="5px" flexShrink={0}>
                      {chipPlatforms.map((p) => (
                        <Box
                          key={p}
                          display="flex"
                          color={
                            p === "twitch"
                              ? c.platform.twitch
                              : p === "kick"
                                ? c.platform.kick
                                : c.text.secondary
                          }
                        >
                          {p === "twitch" ? (
                            <FaTwitch size={12} />
                          ) : p === "kick" ? (
                            <SiKick size={11} />
                          ) : (
                            <FaXTwitter size={11} />
                          )}
                        </Box>
                      ))}
                    </HStack>
                  </>
                )}
              </HStack>
            )}
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
                  onClick={onSelectGlobal}
                  w="100%"
                  justify="space-between"
                  px="9px"
                  py="7px"
                  borderRadius={c.radius.control}
                  bg={isGlobal ? c.overlay.soft : "transparent"}
                  _hover={{ bg: c.overlay.hover }}
                >
                  <HStack spacing="8px">
                    <Box color={c.text.primary} display="flex">
                      <MarketBubbleMark size={14} />
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
                {STREAMERS.map((s) => (
                  <StreamerOption
                    key={s.id}
                    streamer={s}
                    on={streamers.has(s.id)}
                    isGlobal={isGlobal}
                    onClick={() => onToggleStreamer(s.id)}
                  />
                ))}

                <Box h="1px" bg={c.border.subtle} my="4px" />
                <Text px="9px" pb="4px" fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
                  PLATFORMS
                </Text>
                {SEND_PLATFORMS.map((p) => {
                  const on = platforms.has(p);
                  return (
                    <HStack
                      as="button"
                      key={p}
                      onClick={() => onTogglePlatform(p)}
                      w="100%"
                      justify="space-between"
                      px="9px"
                      py="7px"
                      borderRadius={c.radius.control}
                      bg={on && !isGlobal ? c.overlay.soft : "transparent"}
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
                      {on && !isGlobal && (
                        <Box color={c.brand.green} display="flex">
                          <LuCheck size={13} />
                        </Box>
                      )}
                    </HStack>
                  );
                })}

                <HStack
                  as="button"
                  onClick={() => onTogglePlatform("x")}
                  w="100%"
                  justify="space-between"
                  px="9px"
                  py="7px"
                  borderRadius={c.radius.control}
                  bg={platforms.has("x") && !isGlobal ? c.overlay.soft : "transparent"}
                  _hover={{ bg: c.overlay.hover }}
                >
                  <HStack spacing="8px">
                    <Box color={c.text.secondary} display="flex">
                      <FaXTwitter size={12} />
                    </Box>
                    <Text fontSize="sm" color={c.text.primary}>
                      Twitter
                    </Text>
                    <Text fontSize="2xs" color={c.text.subtle}>
                      view only
                    </Text>
                  </HStack>
                  {platforms.has("x") && !isGlobal && (
                    <Box color={c.brand.green} display="flex">
                      <LuCheck size={13} />
                    </Box>
                  )}
                </HStack>
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
            color={settingsOpen ? c.text.primary : c.text.muted}
            _hover={{ color: c.text.primary }}
            transition="color 0.12s"
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
            bg={canSend ? c.text.primary : c.overlay.soft}
            color={canSend ? c.surface : c.text.subtle}
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

      <Modal isOpen={signInOpen} onClose={() => setSignInOpen(false)} isCentered size="xs">
        <ModalOverlay bg="rgba(0,0,0,0.6)" backdropFilter="blur(4px)" />
        <ModalContent
          bg={c.surface}
          color={c.text.primary}
          border="1px solid"
          borderColor={c.border.subtle}
          borderRadius={c.radius.panel}
          boxShadow={c.shadow.panel}
          mx="16px"
        >
          <ModalHeader fontFamily="heading" fontWeight={400} fontSize="2xl">
            Sign in to chat
          </ModalHeader>
          <ModalCloseButton borderRadius={c.radius.control} top="14px" right="14px" />
          <ModalBody pb="22px">
            <Text fontSize="sm" color={c.text.muted} mb="14px">
              Connect an account to send messages across the streams.
            </Text>
            <VStack spacing="8px" align="stretch">
              <HStack
                as="button"
                onClick={() => login("twitch")}
                spacing="10px"
                h="44px"
                px="14px"
                borderRadius={c.radius.control}
                bg={c.overlay.soft}
                _hover={{ bg: c.overlay.hover }}
                transition="all 0.12s"
              >
                <Box color={c.platform.twitch} display="flex">
                  <FaTwitch size={18} />
                </Box>
                <Text fontSize="sm" fontWeight={600}>
                  Continue with Twitch
                </Text>
              </HStack>
              <HStack
                as="button"
                onClick={() => login("kick")}
                spacing="10px"
                h="44px"
                px="14px"
                borderRadius={c.radius.control}
                bg={c.overlay.soft}
                _hover={{ bg: c.overlay.hover }}
                transition="all 0.12s"
              >
                <Box color={c.platform.kick} display="flex">
                  <SiKick size={16} />
                </Box>
                <Text fontSize="sm" fontWeight={600}>
                  Continue with Kick
                </Text>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
