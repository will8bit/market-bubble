"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Flex, HStack, VStack, Text, Input } from "@chakra-ui/react";
import { LuStar, LuSearch } from "react-icons/lu";
import { useChatFeed } from "@/lib/chat/useChatFeed";
import { ChatMessage } from "@/lib/chat/types";
import { useColors } from "@/theme/useColors";

type Tab = "questions" | "saved" | "trending" | "chatters";

function useNow(ms = 2000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function TabBtn({
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
      px="9px"
      py="6px"
      borderRadius="9px"
      bg={active ? c.surfaceRaised : "transparent"}
      color={active ? c.text.primary : c.text.muted}
      fontFamily="mono"
      fontSize="2xs"
      letterSpacing="0.08em"
      _hover={{ color: c.text.primary }}
      transition="all 0.15s"
    >
      {children}
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  const c = useColors();
  return (
    <Box flex="1" minW={0}>
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xl" fontWeight={600} color={c.text.primary} lineHeight={1.1}>
        {value}
      </Text>
    </Box>
  );
}

const scrollSx = {
  scrollbarWidth: "thin" as const,
  "&::-webkit-scrollbar": { width: "7px" },
  "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.1)", borderRadius: "4px" },
  "&::-webkit-scrollbar-track": { background: "transparent" },
};

export function AdminTools() {
  const c = useColors();
  const { messages } = useChatFeed(false);
  const now = useNow();
  const [tab, setTab] = useState<Tab>("questions");
  const [q, setQ] = useState("");
  const [saved, setSaved] = useState<ChatMessage[]>([]);

  const stats = useMemo(() => {
    const minAgo = now - 60000;
    const fiveAgo = now - 300000;
    let perMin = 0;
    const chatters = new Set<string>();
    for (const m of messages) {
      if (m.timestamp >= minAgo) perMin += 1;
      if (m.timestamp >= fiveAgo) chatters.add(m.author.name.toLowerCase());
    }
    return { perMin, chatters: chatters.size, buffer: messages.length };
  }, [messages, now]);

  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of messages) for (const t of m.cashtags) counts.set(t, (counts.get(t) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [messages]);

  const chatters = useMemo(() => {
    const counts = new Map<string, { name: string; color: string; n: number }>();
    for (const m of messages) {
      const k = m.author.name.toLowerCase();
      const e = counts.get(k) || { name: m.author.name, color: m.author.color, n: 0 };
      e.n += 1;
      counts.set(k, e);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 15);
  }, [messages]);

  const questions = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return messages
      .filter((m) => m.text.includes("?"))
      .filter(
        (m) => !ql || m.text.toLowerCase().includes(ql) || m.author.name.toLowerCase().includes(ql)
      )
      .slice(-80)
      .reverse();
  }, [messages, q]);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.id)), [saved]);

  function toggleSave(m: ChatMessage) {
    setSaved((prev) =>
      prev.some((s) => s.id === m.id) ? prev.filter((s) => s.id !== m.id) : [m, ...prev].slice(0, 100)
    );
  }

  function Row({ m, onSave, saved: isSaved }: { m: ChatMessage; onSave: () => void; saved: boolean }) {
    return (
      <HStack
        align="flex-start"
        spacing="8px"
        px="9px"
        py="8px"
        borderRadius={c.radius.card}
        bg={c.surfaceLight}
        border="1px solid"
        borderColor={c.border.subtle}
        _hover={{ bg: c.surfaceRaised }}
        transition="background-color 0.12s"
      >
        <Box flex="1" minW={0}>
          <Text as="span" fontSize="xs" fontWeight={700} color={m.author.color}>
            {m.author.name}
          </Text>
          <Text fontSize="xs" color={c.text.primary} mt="2px">
            {m.text}
          </Text>
        </Box>
        <Box
          as="button"
          onClick={onSave}
          color={isSaved ? c.brand.gold : c.text.subtle}
          _hover={{ color: c.brand.gold }}
          flexShrink={0}
          aria-label="Save"
        >
          <LuStar size={14} />
        </Box>
      </HStack>
    );
  }

  return (
    <Box
      bg={c.surface}
      border="1px solid"
      borderColor={c.border.subtle}
      borderRadius={c.radius.panel}
      boxShadow={c.shadow.soft}
      p="14px"
      h="100%"
      minH={0}
      display="flex"
      flexDirection="column"
    >
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.1em" color={c.text.subtle} mb="12px">
        MODERATION
      </Text>

      <HStack spacing="10px" mb="12px" flexShrink={0}>
        <Stat label="MSGS / MIN" value={stats.perMin} />
        <Stat label="ACTIVE" value={stats.chatters} />
        <Stat label="BUFFER" value={stats.buffer} />
      </HStack>

      <Flex
        align="center"
        bg={c.overlay.soft}
        border="1px solid"
        borderColor={c.border.subtle}
        borderRadius={c.radius.control}
        px="10px"
        mb="12px"
        flexShrink={0}
      >
        <Box color={c.text.subtle}>
          <LuSearch size={13} />
        </Box>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter questions / users"
          variant="unstyled"
          h="34px"
          px="8px"
          fontSize="sm"
          color={c.text.primary}
          _placeholder={{ color: c.text.placeholder }}
        />
      </Flex>

      <HStack
        spacing="2px"
        bg={c.overlay.soft}
        borderRadius={c.radius.control}
        p="3px"
        mb="12px"
        flexShrink={0}
      >
        <TabBtn active={tab === "questions"} onClick={() => setTab("questions")}>
          QUESTIONS
        </TabBtn>
        <TabBtn active={tab === "saved"} onClick={() => setTab("saved")}>
          SAVED {saved.length ? `(${saved.length})` : ""}
        </TabBtn>
        <TabBtn active={tab === "trending"} onClick={() => setTab("trending")}>
          TRENDING
        </TabBtn>
        <TabBtn active={tab === "chatters"} onClick={() => setTab("chatters")}>
          CHATTERS
        </TabBtn>
      </HStack>

      <Box flex="1" minH={0} overflowY="auto" sx={scrollSx}>
        {tab === "questions" && (
          <VStack align="stretch" spacing="6px">
            {questions.length === 0 ? (
              <Text fontFamily="mono" fontSize="xs" color={c.text.subtle}>
                No questions yet.
              </Text>
            ) : (
              questions.map((m) => (
                <Row key={m.id} m={m} saved={savedIds.has(m.id)} onSave={() => toggleSave(m)} />
              ))
            )}
          </VStack>
        )}

        {tab === "saved" && (
          <VStack align="stretch" spacing="6px">
            {saved.length === 0 ? (
              <Text fontFamily="mono" fontSize="xs" color={c.text.subtle}>
                Star questions to save them here.
              </Text>
            ) : (
              saved.map((m) => (
                <Row key={m.id} m={m} saved onSave={() => toggleSave(m)} />
              ))
            )}
          </VStack>
        )}

        {tab === "trending" && (
          <VStack align="stretch" spacing="4px">
            {trending.length === 0 ? (
              <Text fontFamily="mono" fontSize="xs" color={c.text.subtle}>
                No cashtags mentioned yet.
              </Text>
            ) : (
              trending.map(([tag, n]) => (
                <Flex key={tag} align="center" justify="space-between" px="9px" py="7px" borderRadius={c.radius.card} bg={c.surfaceLight}>
                  <Text fontFamily="mono" fontSize="sm" fontWeight={600} color={c.brand.gold}>
                    ${tag}
                  </Text>
                  <Text fontFamily="mono" fontSize="sm" color={c.text.secondary}>
                    {n}
                  </Text>
                </Flex>
              ))
            )}
          </VStack>
        )}

        {tab === "chatters" && (
          <VStack align="stretch" spacing="4px">
            {chatters.map((u) => (
              <Flex key={u.name} align="center" justify="space-between" px="9px" py="7px" borderRadius={c.radius.card} bg={c.surfaceLight}>
                <Text fontSize="sm" fontWeight={600} color={u.color} noOfLines={1}>
                  {u.name}
                </Text>
                <Text fontFamily="mono" fontSize="sm" color={c.text.secondary}>
                  {u.n}
                </Text>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
