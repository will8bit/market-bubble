"use client";

import { useEffect, useMemo, useRef, useState, useCallback, memo, Fragment, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Box, HStack, VStack, Text, Flex, Input, Image } from "@chakra-ui/react";
import {
  LuSearch,
  LuX,
  LuListFilter,
  LuSettings2,
  LuExternalLink,
  LuMinus,
  LuPlus,
  LuSword,
  LuStar,
  LuGem,
  LuBadgeCheck,
  LuAward,
  LuCrown,
} from "react-icons/lu";
import { FaTwitch, FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { ChatMessage, Platform, StreamerId, Badge, STREAMERS } from "@/lib/chat/types";
import { useChatFeed } from "@/lib/chat/useChatFeed";
import { getAvatar } from "@/lib/avatars";
import { ChatComposer } from "./ChatComposer";
import { useColors } from "@/theme/useColors";

type Colors = ReturnType<typeof useColors>;
type Panel = "filters" | "settings" | null;

const PLATFORMS: Platform[] = ["twitch", "kick", "x"];

const SOURCE_META: { id: Platform; label: string; icon: ReactNode }[] = [
  { id: "twitch", label: "Twitch", icon: <FaTwitch size={13} /> },
  { id: "kick", label: "Kick", icon: <SiKick size={12} /> },
  { id: "x", label: "X", icon: <FaXTwitter size={12} /> },
];

const STREAMER_IMG: Record<StreamerId, string> = {
  banks: "/banks.jpg",
  ansem: "/ansem.jpg",
};

const BADGE_META: Record<Badge["type"], { icon: ReactNode; color: string }> = {
  broadcaster: { icon: <LuCrown size={10} />, color: "#e0322a" },
  moderator: { icon: <LuSword size={10} />, color: "#2f9e6a" },
  vip: { icon: <LuGem size={10} />, color: "#e0568f" },
  subscriber: { icon: <LuStar size={10} />, color: "#9146ff" },
  verified: { icon: <LuBadgeCheck size={10} />, color: "#378add" },
  og: { icon: <LuAward size={10} />, color: "#c79a3f" },
};

function chatTitle(platforms: Set<Platform>, streamers: Set<StreamerId>) {
  const allP = platforms.size === PLATFORMS.length;
  const allS = streamers.size === STREAMERS.length;
  if (allP && allS) return "GLOBAL CHAT";
  const segs: string[] = [];
  if (!allS) {
    const names = STREAMERS.filter((s) => streamers.has(s.id)).map((s) => s.displayName);
    if (names.length) segs.push(names.join(" + "));
  }
  if (!allP) {
    const labels = SOURCE_META.filter((p) => platforms.has(p.id)).map((p) => p.label);
    if (labels.length) segs.push(labels.join(" + "));
  }
  if (!segs.length) return "GLOBAL CHAT";
  return segs.join(" · ").toUpperCase();
}

function platformColor(c: Colors, p: Platform) {
  return p === "twitch" ? c.platform.twitch : p === "kick" ? c.platform.kick : c.platform.x;
}

function platformIcon(p: Platform) {
  if (p === "twitch") return <FaTwitch size={11} />;
  if (p === "kick") return <SiKick size={10} />;
  return <FaXTwitter size={10} />;
}

function streamerColor(c: Colors, s: StreamerId) {
  return s === "banks" ? c.streamer.banks : c.streamer.ansem;
}

function streamerName(s: StreamerId) {
  return STREAMERS.find((x) => x.id === s)?.displayName ?? s;
}

function GroupLabel({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em" color={c.text.subtle} mb="8px">
      {children}
    </Text>
  );
}

function IconBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const c = useColors();
  return (
    <Flex
      as="button"
      aria-label={label}
      onClick={onClick}
      align="center"
      justify="center"
      w="32px"
      h="32px"
      borderRadius={c.radius.control}
      bg={active ? c.overlay.strong : "transparent"}
      color={active ? c.text.primary : c.text.muted}
      _hover={{ color: c.text.primary, bg: c.overlay.hover }}
      transition="all 0.15s"
    >
      {children}
    </Flex>
  );
}

function MiniSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const c = useColors();
  return (
    <Box
      as="button"
      onClick={onToggle}
      w="34px"
      h="19px"
      borderRadius={c.radius.pill}
      bg={on ? c.brand.green : c.overlay.strong}
      position="relative"
      transition="background 0.15s"
      flexShrink={0}
    >
      <Box
        position="absolute"
        top="2px"
        left={on ? "17px" : "2px"}
        w="15px"
        h="15px"
        borderRadius="full"
        bg="#fff"
        transition="left 0.15s"
      />
    </Box>
  );
}

function SettingRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const c = useColors();
  return (
    <Flex align="center" justify="space-between" py="9px">
      <Text fontSize="sm" color={c.text.primary}>
        {label}
      </Text>
      <MiniSwitch on={on} onToggle={onToggle} />
    </Flex>
  );
}

const MIN_CHAT_SIZE = 11;
const MAX_CHAT_SIZE = 22;

function SizeStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const c = useColors();
  const atMin = value <= MIN_CHAT_SIZE;
  const atMax = value >= MAX_CHAT_SIZE;
  return (
    <HStack
      spacing="0"
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.control}
      overflow="hidden"
    >
      <Flex
        as="button"
        aria-label="Decrease text size"
        onClick={() => onChange(Math.max(MIN_CHAT_SIZE, value - 1))}
        align="center"
        justify="center"
        w="30px"
        py="6px"
        color={c.text.muted}
        opacity={atMin ? 0.35 : 1}
        _hover={atMin ? {} : { color: c.text.primary, bg: c.overlay.hover }}
        transition="all 0.15s"
      >
        <LuMinus size={13} />
      </Flex>
      <Box
        minW="50px"
        textAlign="center"
        py="5px"
        borderLeft="1px solid"
        borderRight="1px solid"
        borderColor={c.border.subtle}
        fontFamily="mono"
        fontSize="xs"
        fontWeight={600}
        color={c.text.primary}
      >
        {value}px
      </Box>
      <Flex
        as="button"
        aria-label="Increase text size"
        onClick={() => onChange(Math.min(MAX_CHAT_SIZE, value + 1))}
        align="center"
        justify="center"
        w="30px"
        py="6px"
        color={c.text.muted}
        opacity={atMax ? 0.35 : 1}
        _hover={atMax ? {} : { color: c.text.primary, bg: c.overlay.hover }}
        transition="all 0.15s"
      >
        <LuPlus size={13} />
      </Flex>
    </HStack>
  );
}

type SourceStyle = "subtle" | "color" | "glow";

function SegSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; val: string }[];
  onChange: (v: string) => void;
}) {
  const c = useColors();
  return (
    <HStack
      spacing="0"
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.control}
      overflow="hidden"
    >
      {options.map((o, i) => {
        const active = value === o.val;
        return (
          <Box
            as="button"
            key={o.val}
            onClick={() => onChange(o.val)}
            px="11px"
            py="5px"
            bg={active ? c.overlay.strong : "transparent"}
            color={active ? c.text.primary : c.text.muted}
            borderLeft={i > 0 ? "1px solid" : "none"}
            borderColor={c.border.subtle}
            fontSize="xs"
            fontWeight={600}
            _hover={{ color: c.text.primary, bg: active ? c.overlay.strong : c.overlay.hover }}
            transition="all 0.15s"
          >
            {o.label}
          </Box>
        );
      })}
    </HStack>
  );
}

function SourceToggle({
  meta,
  active,
  onClick,
}: {
  meta: { id: Platform; label: string; icon: ReactNode };
  active: boolean;
  onClick: () => void;
}) {
  const c = useColors();
  const color = platformColor(c, meta.id);
  return (
    <HStack
      as="button"
      onClick={onClick}
      spacing="7px"
      px="12px"
      py="8px"
      borderRadius={c.radius.pill}
      bg={active ? `${color}22` : c.overlay.soft}
      border="1px solid"
      borderColor={active ? color : "transparent"}
      opacity={active ? 1 : 0.5}
      _hover={{ opacity: 1 }}
      transition="all 0.15s"
    >
      <Box color={color} display="flex">
        {meta.icon}
      </Box>
      <Text fontSize="sm" fontWeight={600} color={c.text.primary}>
        {meta.label}
      </Text>
    </HStack>
  );
}

function StreamerToggle({
  id,
  name,
  active,
  onClick,
}: {
  id: StreamerId;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  const c = useColors();
  const accent = streamerColor(c, id);
  return (
    <HStack
      as="button"
      onClick={onClick}
      spacing="8px"
      pl="6px"
      pr="13px"
      py="5px"
      borderRadius={c.radius.pill}
      bg={active ? `${accent}22` : c.overlay.soft}
      border="1px solid"
      borderColor={active ? accent : "transparent"}
      opacity={active ? 1 : 0.5}
      _hover={{ opacity: 1 }}
      transition="all 0.15s"
    >
      <Box
        w="22px"
        h="22px"
        borderRadius="full"
        overflow="hidden"
        flexShrink={0}
        border="1px solid"
        borderColor={accent}
      >
        <Image src={getAvatar(STREAMER_IMG[id])} alt={name} w="100%" h="100%" objectFit="cover" />
      </Box>
      <Text fontSize="sm" fontWeight={600} color={c.text.primary}>
        {name}
      </Text>
    </HStack>
  );
}

const TEXT_TOKEN_RE = /(\[t?emote:\d+:[^\]]+\]|\$[A-Za-z]{2,6}\b)/g;

function renderText(c: Colors, text: string, onCashtag: (t: string) => void) {
  const parts = text.split(TEXT_TOKEN_RE);
  return parts.map((part, i) => {
    if (!part) return null;

    const kick = part.match(/^\[emote:(\d+):([^\]]+)\]$/);
    if (kick) {
      return (
        <Box
          as="img"
          key={i}
          src={`https://files.kick.com/emotes/${kick[1]}/fullsize`}
          alt={kick[2]}
          title={kick[2]}
          display="inline-block"
          h="22px"
          verticalAlign="-6px"
          mx="1px"
          loading="lazy"
        />
      );
    }

    const twitch = part.match(/^\[temote:(\d+):([^\]]+)\]$/);
    if (twitch) {
      return (
        <Box
          as="img"
          key={i}
          src={`https://static-cdn.jtvnw.net/emoticons/v2/${twitch[1]}/default/dark/1.0`}
          alt={twitch[2]}
          title={twitch[2]}
          display="inline-block"
          h="22px"
          verticalAlign="-6px"
          mx="1px"
          loading="lazy"
        />
      );
    }

    if (/^\$[A-Za-z]{2,6}$/.test(part)) {
      return (
        <Text
          as="span"
          key={i}
          color={c.brand.gold}
          fontWeight={600}
          cursor="pointer"
          onClick={() => onCashtag(part.slice(1).toUpperCase())}
          _hover={{ textDecoration: "underline" }}
        >
          {part}
        </Text>
      );
    }

    return <Fragment key={i}>{part}</Fragment>;
  });
}

const ChatRow = memo(function ChatRow({
  msg,
  compact,
  showBadges,
  showIcons,
  showAvatars,
  showDetails,
  sourceStyle,
  size,
  onCashtag,
}: {
  msg: ChatMessage;
  compact: boolean;
  showBadges: boolean;
  showIcons: boolean;
  showAvatars: boolean;
  showDetails: boolean;
  sourceStyle: SourceStyle;
  size: number;
  onCashtag: (t: string) => void;
}) {
  const c = useColors();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const detail = (
    <Box py="2px">
      <Text fontSize="xs" fontWeight={700} color={c.text.primary}>
        {msg.author.name}
      </Text>
      <HStack spacing="5px" mt="3px" color={c.text.muted}>
        <Box as="span" display="inline-flex">
          {platformIcon(msg.platform)}
        </Box>
        <Text fontSize="2xs">{streamerName(msg.streamer)}&apos;s stream</Text>
      </HStack>
      <Text fontSize="2xs" fontFamily="mono" color={c.text.subtle} mt="1px">
        {time}
      </Text>
    </Box>
  );
  return (
    <>
      <Box
        px="16px"
        py={compact ? "3px" : "6px"}
        _hover={{ bg: c.overlay.subtle }}
        onMouseEnter={(e) => {
          if (!showDetails) return;
          setPos({ x: e.clientX, y: e.clientY });
          timer.current = setTimeout(() => setShow(true), 450);
        }}
        onMouseMove={(e) => {
          if (showDetails) setPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => {
          if (timer.current) clearTimeout(timer.current);
          setShow(false);
          setPos(null);
        }}
      >
      <Text fontSize={`${size}px`} lineHeight={1.5} color={c.text.secondary}>
        {showIcons && (
          <Box
            as="span"
            display="inline-flex"
            verticalAlign="middle"
            mr="7px"
            color={sourceStyle === "subtle" ? c.text.subtle : platformColor(c, msg.platform)}
            sx={
              sourceStyle === "glow"
                ? { filter: `drop-shadow(0 0 4px ${platformColor(c, msg.platform)})` }
                : undefined
            }
          >
            {platformIcon(msg.platform)}
          </Box>
        )}
        {showAvatars && (
          <Box as="span" display="inline-flex" verticalAlign="middle" mr="6px">
            <Image
              src={STREAMER_IMG[msg.streamer]}
              alt=""
              w="16px"
              h="16px"
              borderRadius="full"
              objectFit="cover"
            />
          </Box>
        )}
        {showBadges &&
          msg.author.badges.map((b, i) => (
            <Box
              as="span"
              key={i}
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              w="15px"
              h="15px"
              borderRadius="4px"
              bg={BADGE_META[b.type].color}
              color="#fff"
              mr="3px"
              verticalAlign="middle"
            >
              {BADGE_META[b.type].icon}
            </Box>
          ))}
        <Text as="span" fontWeight={700} color={msg.author.color}>
          {msg.author.name}
        </Text>
        <Text as="span" color={c.text.subtle}>
          :{" "}
        </Text>
        <Text as="span" color={c.text.primary}>
          {renderText(c, msg.text, onCashtag)}
        </Text>
      </Text>
      </Box>
      {showDetails && show && pos &&
        createPortal(
          <Box
            position="fixed"
            left={`${pos.x + 14}px`}
            top={`${pos.y + 16}px`}
            zIndex={3000}
            pointerEvents="none"
            bg={c.surfaceRaised}
            color={c.text.primary}
            border="1px solid"
            borderColor={c.border.default}
            borderRadius={c.radius.control}
            boxShadow={c.shadow.soft}
            px="11px"
            py="9px"
            maxW="240px"
          >
            {detail}
          </Box>,
          document.body
        )}
    </>
  );
});

export function ChatPanel() {
  const c = useColors();
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));
  const [streamers, setStreamers] = useState<Set<StreamerId>>(
    new Set(STREAMERS.map((s) => s.id))
  );
  const [query, setQuery] = useState("");
  const [cashtag, setCashtag] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const [hideCommands, setHideCommands] = useState(false);
  const [compact, setCompact] = useState(false);
  const [showBadges, setShowBadges] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [showAvatars, setShowAvatars] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [sourceStyle, setSourceStyle] = useState<SourceStyle>("subtle");
  const [chatSize, setChatSize] = useState(13);

  const [atBottom, setAtBottom] = useState(true);

  const messages = useChatFeed(!atBottom);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleCashtag = useCallback((t: string) => setCashtag(t), []);

  function togglePanel(p: Exclude<Panel, null>) {
    setPanel((prev) => (prev === p ? null : p));
  }

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function toggleStreamer(s: StreamerId) {
    setStreamers((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (!platforms.has(m.platform)) return false;
      if (!streamers.has(m.streamer)) return false;
      if (hideCommands && m.text.startsWith("!")) return false;
      if (cashtag && !m.cashtags.includes(cashtag)) return false;
      if (q && !m.text.toLowerCase().includes(q) && !m.author.name.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [messages, platforms, streamers, hideCommands, cashtag, query]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) el.scrollTop = el.scrollHeight;
  }, [filtered, atBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 60);
  }

  function jumpToBottom() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setAtBottom(true);
  }

  return (
    <Flex direction="column" h="100%" bg="transparent" minW={0} position="relative">
      <Flex
        align="center"
        justify="space-between"
        px="14px"
        h="52px"
        flexShrink={0}
        borderBottom="1px solid"
        borderColor={c.border.subtle}
      >
        <Text
          fontFamily="mono"
          fontSize="xs"
          letterSpacing="0.1em"
          color={c.text.primary}
          pl="4px"
          noOfLines={1}
          flex="1"
          minW={0}
          mr="8px"
        >
          {chatTitle(platforms, streamers)}
        </Text>
        <HStack spacing="4px" flexShrink={0}>
          <IconBtn label="Filters" active={panel === "filters"} onClick={() => togglePanel("filters")}>
            <LuListFilter size={16} />
          </IconBtn>
          <IconBtn label="Chat settings" active={panel === "settings"} onClick={() => togglePanel("settings")}>
            <LuSettings2 size={16} />
          </IconBtn>
          <IconBtn
            label="Pop out chat"
            active={false}
            onClick={() =>
              window.open("/popout/marketbubble/chat?popout=", "mb-chat", "popup=yes,width=420,height=760")
            }
          >
            <LuExternalLink size={16} />
          </IconBtn>
        </HStack>
      </Flex>

      {panel === "filters" && (
        <VStack
          align="stretch"
          spacing="16px"
          px="16px"
          py="16px"
          position="absolute"
          top="52px"
          left="0"
          right="0"
          zIndex={20}
          maxH="calc(100% - 52px)"
          overflowY="auto"
          bg={c.surface}
          boxShadow={c.shadow.soft}
          borderBottom="1px solid"
          borderColor={c.border.subtle}
          borderBottomRadius={c.radius.card}
        >
          <Flex
            align="center"
            bg={c.overlay.soft}
            border="1px solid"
            borderColor={c.border.subtle}
            borderRadius={c.radius.control}
            px="12px"
          >
            <Box color={c.text.subtle}>
              <LuSearch size={14} />
            </Box>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages or users"
              variant="unstyled"
              fontSize="sm"
              px="9px"
              py="9px"
              color={c.text.primary}
              _placeholder={{ color: c.text.placeholder }}
            />
            {query && (
              <Box as="button" color={c.text.subtle} onClick={() => setQuery("")}>
                <LuX size={14} />
              </Box>
            )}
          </Flex>

          <Box>
            <GroupLabel>SOURCE</GroupLabel>
            <HStack spacing="7px">
              {SOURCE_META.map((s) => (
                <SourceToggle
                  key={s.id}
                  meta={s}
                  active={platforms.has(s.id)}
                  onClick={() => togglePlatform(s.id)}
                />
              ))}
            </HStack>
          </Box>

          <Box>
            <GroupLabel>STREAMER</GroupLabel>
            <HStack spacing="7px">
              {STREAMERS.map((s) => (
                <StreamerToggle
                  key={s.id}
                  id={s.id}
                  name={s.displayName}
                  active={streamers.has(s.id)}
                  onClick={() => toggleStreamer(s.id)}
                />
              ))}
            </HStack>
          </Box>

          {cashtag && (
            <HStack
              as="button"
              alignSelf="flex-start"
              onClick={() => setCashtag(null)}
              spacing="6px"
              px="11px"
              py="6px"
              borderRadius={c.radius.pill}
              bg="rgba(199,154,63,0.14)"
              border="1px solid"
              borderColor={c.brand.gold}
            >
              <Text fontFamily="mono" fontSize="2xs" fontWeight={600} color={c.brand.gold}>
                ${cashtag}
              </Text>
              <Box color={c.brand.gold} display="flex">
                <LuX size={12} />
              </Box>
            </HStack>
          )}
        </VStack>
      )}

      {panel === "settings" && (
        <VStack
          align="stretch"
          spacing="0"
          px="16px"
          py="10px"
          position="absolute"
          top="52px"
          left="0"
          right="0"
          zIndex={20}
          maxH="calc(100% - 52px)"
          overflowY="auto"
          bg={c.surface}
          boxShadow={c.shadow.soft}
          borderBottom="1px solid"
          borderColor={c.border.subtle}
          borderBottomRadius={c.radius.card}
        >
          <GroupLabel>APPEARANCE</GroupLabel>
          <Flex align="center" justify="space-between" py="9px">
            <Text fontSize="sm" color={c.text.primary}>
              Text size
            </Text>
            <SizeStepper value={chatSize} onChange={setChatSize} />
          </Flex>
          <SettingRow label="Compact mode" on={compact} onToggle={() => setCompact((v) => !v)} />
          <SettingRow label="Hide commands" on={hideCommands} onToggle={() => setHideCommands((v) => !v)} />
          <SettingRow label="Platform icons" on={showIcons} onToggle={() => setShowIcons((v) => !v)} />
          <Flex align="center" justify="space-between" py="9px">
            <Text fontSize="sm" color={c.text.primary}>
              Source style
            </Text>
            <SegSelect
              value={sourceStyle}
              options={[
                { label: "Subtle", val: "subtle" },
                { label: "Color", val: "color" },
                { label: "Glow", val: "glow" },
              ]}
              onChange={(v) => setSourceStyle(v as SourceStyle)}
            />
          </Flex>
          <SettingRow label="Streamer avatars" on={showAvatars} onToggle={() => setShowAvatars((v) => !v)} />
          <SettingRow label="Chat badges" on={showBadges} onToggle={() => setShowBadges((v) => !v)} />
          <SettingRow label="Hover details" on={showDetails} onToggle={() => setShowDetails((v) => !v)} />
        </VStack>
      )}

      <Box ref={scrollRef} onScroll={onScroll} flex="1" overflowY="auto" py="8px" position="relative">
        {filtered.map((m) => (
          <ChatRow
            key={m.id}
            msg={m}
            compact={compact}
            showBadges={showBadges}
            showIcons={showIcons}
            showAvatars={showAvatars}
            showDetails={showDetails}
            sourceStyle={sourceStyle}
            size={chatSize}
            onCashtag={handleCashtag}
          />
        ))}
      </Box>

      {!atBottom && (
        <Box px="16px" pb="10px" flexShrink={0}>
          <Box
            as="button"
            onClick={jumpToBottom}
            w="100%"
            py="9px"
            borderRadius={c.radius.control}
            bg={c.overlay.strong}
            fontSize="xs"
            fontWeight={600}
            color={c.text.primary}
            _hover={{ bg: c.overlay.hover }}
            transition="all 0.15s"
          >
            Paused — jump to live ↓
          </Box>
        </Box>
      )}

      <ChatComposer platforms={platforms} streamers={streamers} />
    </Flex>
  );
}
