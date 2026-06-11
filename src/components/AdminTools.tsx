"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, HStack, VStack, Text, Input } from "@chakra-ui/react";
import {
  LuStar,
  LuSearch,
  LuExternalLink,
  LuMessageSquare,
  LuHash,
  LuUsers,
  LuLink,
} from "react-icons/lu";
import { FaTwitch } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { ChatMessage } from "@/lib/chat/types";
import { useAuth } from "@/lib/auth";
import { usePersistentState } from "@/lib/usePersistentState";
import { useShow } from "@/lib/showConfig";
import { scrollbarSx } from "@/theme/scrollbar";
import { useColors } from "@/theme/useColors";

type Tab = "questions" | "saved" | "trending" | "chatters" | "links";
type Section = "moderation" | "broadcast";

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;

const LOG_KEY = "mb-admin-log";
const LOG_MAX = 500;
const LOG_AGE_MS = 2 * 3600 * 1000;

function loadLog(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const cutoff = Date.now() - LOG_AGE_MS;
    return (JSON.parse(raw) as ChatMessage[]).filter((m) => m.timestamp >= cutoff);
  } catch {
    return [];
  }
}

function useNow(ms = 2000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function SubTab({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  const c = useColors();
  return (
    <Box
      as="button"
      onClick={onClick}
      flex="1"
      minW={0}
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap="4px"
      py="7px"
      borderRadius="9px"
      position="relative"
      bg={active ? c.surfaceRaised : "transparent"}
      color={active ? c.text.primary : c.text.muted}
      _hover={{ color: c.text.primary }}
      transition="all 0.15s"
    >
      {icon}
      <Text fontFamily="mono" fontSize="9px" letterSpacing="0.04em" lineHeight={1}>
        {label}
      </Text>
      {badge ? (
        <Box
          position="absolute"
          top="3px"
          right="6px"
          minW="14px"
          h="14px"
          px="3px"
          borderRadius="full"
          bg={c.brand.gold}
          color={c.bg}
          fontSize="9px"
          fontWeight={700}
          lineHeight="14px"
          textAlign="center"
        >
          {badge}
        </Box>
      ) : null}
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  const c = useColors();
  return (
    <Box flex="1" minW={0} textAlign="center">
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle}>
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xl" fontWeight={600} color={c.text.primary} lineHeight={1.1}>
        {value}
      </Text>
    </Box>
  );
}


function TopTab({
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
      flex="1"
      py="8px"
      borderRadius="9px"
      bg={active ? c.surfaceRaised : "transparent"}
      color={active ? c.text.primary : c.text.muted}
      fontFamily="mono"
      fontSize="2xs"
      fontWeight={600}
      letterSpacing="0.1em"
      _hover={{ color: c.text.primary }}
      transition="all 0.15s"
    >
      {children}
    </Box>
  );
}

function BroadcastField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useColors();
  return (
    <Box mb="14px">
      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle} mb="6px">
        {label}
      </Text>
      <Box
        bg={c.overlay.soft}
        border="1px solid"
        borderColor={c.border.subtle}
        borderRadius={c.radius.control}
        px="12px"
        _focusWithin={{ borderColor: c.border.strong }}
        transition="border-color 0.15s"
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          variant="unstyled"
          h="40px"
          fontSize="sm"
          color={c.text.primary}
          _placeholder={{ color: c.text.placeholder }}
        />
      </Box>
    </Box>
  );
}

function PushButton({
  icon,
  label,
  color,
  disabled,
  onPush,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  disabled: boolean;
  onPush: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const c = useColors();
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  async function go() {
    if (disabled || state === "loading") return;
    setState("loading");
    setErr("");
    const r = await onPush();
    if (r.ok) {
      setState("ok");
      setTimeout(() => setState("idle"), 2500);
    } else {
      setState("err");
      setErr(r.error || "failed");
    }
  }

  return (
    <Box flex="1" minW={0}>
      <HStack
        as="button"
        onClick={go}
        w="100%"
        justify="center"
        spacing="8px"
        py="9px"
        borderRadius={c.radius.control}
        border="1px solid"
        borderColor={state === "ok" ? c.brand.green : c.border.subtle}
        bg={c.overlay.soft}
        color={disabled ? c.text.subtle : c.text.primary}
        opacity={disabled ? 0.5 : 1}
        cursor={disabled ? "not-allowed" : "pointer"}
        _hover={disabled ? {} : { bg: c.overlay.hover }}
        transition="all 0.15s"
      >
        <Box color={color}>{icon}</Box>
        <Text fontSize="sm" fontWeight={600}>
          {state === "loading" ? "Pushing…" : state === "ok" ? "Updated" : label}
        </Text>
      </HStack>
      {state === "err" && (
        <Text fontFamily="mono" fontSize="2xs" color={c.brand.red} mt="4px" noOfLines={2}>
          {err}
        </Text>
      )}
    </Box>
  );
}

function BroadcastPanel() {
  const c = useColors();
  const { title, subtitle, dirty, saving, setDraft, save, setStreamTitle } = useShow();
  const { twitch, kick } = useAuth();
  const [saveState, setSaveState] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSave() {
    setSaveState(null);
    const r = await save();
    setSaveState(r.ok ? { ok: true, text: "Saved for everyone" } : { ok: false, text: r.error || "Failed to save" });
    if (r.ok) setTimeout(() => setSaveState(null), 2500);
  }

  return (
    <Flex direction="column" flex="1" minH={0} overflowY="auto" sx={scrollbarSx(c)}>
      <BroadcastField label="EPISODE TITLE" value={title} onChange={(v) => setDraft({ title: v })} />
      <BroadcastField label="SUBTITLE LINE" value={subtitle} onChange={(v) => setDraft({ subtitle: v })} />

      <Flex align="center" justify="space-between" gap="10px" mt="2px">
        <Text fontFamily="mono" fontSize="2xs" color={saveState ? (saveState.ok ? c.brand.green : c.brand.red) : c.text.subtle} noOfLines={1}>
          {saveState ? saveState.text : dirty ? "Unsaved changes" : ""}
        </Text>
        <HStack
          as="button"
          onClick={onSave}
          spacing="7px"
          px="16px"
          py="9px"
          borderRadius={c.radius.control}
          bg={dirty && !saving ? c.text.primary : c.overlay.soft}
          color={dirty && !saving ? c.bg : c.text.subtle}
          fontWeight={700}
          fontSize="sm"
          opacity={saving ? 0.7 : 1}
          cursor={saving ? "default" : "pointer"}
          transition="all 0.15s"
          flexShrink={0}
        >
          <Text>{saving ? "Saving…" : "Save"}</Text>
        </HStack>
      </Flex>

      <Box h="1px" bg={c.border.subtle} my="16px" />

      <Text fontFamily="mono" fontSize="2xs" letterSpacing="0.08em" color={c.text.subtle} mb="8px">
        PUSH TITLE TO STREAM
      </Text>
      <Text fontFamily="mono" fontSize="2xs" color={c.text.subtle} mb="10px" lineHeight={1.5}>
        Sets the live title on your own channel. Works when the channel owner is signed in.
      </Text>
      <HStack spacing="8px" align="flex-start">
        <PushButton
          icon={<FaTwitch size={15} />}
          label="Twitch"
          color={c.platform.twitch}
          disabled={!twitch}
          onPush={() => setStreamTitle("twitch")}
        />
        <PushButton
          icon={<SiKick size={15} />}
          label="Kick"
          color={c.platform.kick}
          disabled={!kick}
          onPush={() => setStreamTitle("kick")}
        />
      </HStack>
    </Flex>
  );
}

export function AdminTools({ messages }: { messages: ChatMessage[] }) {
  const c = useColors();
  const now = useNow();
  const [section, setSection] = useState<Section>("moderation");
  const [tab, setTab] = useState<Tab>("questions");
  const [q, setQ] = useState("");
  const [saved, setSaved] = usePersistentState<ChatMessage[]>("mb-admin-saved", []);

  const [log, setLog] = useState<ChatMessage[]>(loadLog);

  useEffect(() => {
    if (messages.length === 0) return;
    setLog((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      let changed = false;
      const merged = prev.slice();
      for (const m of messages) {
        if (!ids.has(m.id)) {
          merged.push(m);
          ids.add(m.id);
          changed = true;
        }
      }
      if (!changed) return prev;
      merged.sort((a, b) => a.timestamp - b.timestamp);
      const cutoff = Date.now() - LOG_AGE_MS;
      const trimmed = merged.filter((m) => m.timestamp >= cutoff);
      return trimmed.length > LOG_MAX ? trimmed.slice(trimmed.length - LOG_MAX) : trimmed;
    });
  }, [messages]);

  const logRef = useRef(log);
  logRef.current = log;
  useEffect(() => {
    const persist = () => {
      try {
        window.localStorage.setItem(LOG_KEY, JSON.stringify(logRef.current));
      } catch {}
    };
    const t = setInterval(persist, 4000);
    window.addEventListener("beforeunload", persist);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", persist);
      persist();
    };
  }, []);

  const stats = useMemo(() => {
    const minAgo = now - 60000;
    const fiveAgo = now - 300000;
    let perMin = 0;
    const chatters = new Set<string>();
    for (const m of log) {
      if (m.timestamp >= minAgo) perMin += 1;
      if (m.timestamp >= fiveAgo) chatters.add(m.author.name.toLowerCase());
    }
    return { perMin, chatters: chatters.size, buffer: log.length };
  }, [log, now]);

  const trending = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of log) for (const t of m.cashtags) counts.set(t, (counts.get(t) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [log]);

  const chatters = useMemo(() => {
    const counts = new Map<string, { name: string; color: string; n: number }>();
    for (const m of log) {
      const k = m.author.name.toLowerCase();
      const e = counts.get(k) || { name: m.author.name, color: m.author.color, n: 0 };
      e.n += 1;
      counts.set(k, e);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 15);
  }, [log]);

  const questions = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return log
      .filter((m) => m.text.includes("?"))
      .filter(
        (m) => !ql || m.text.toLowerCase().includes(ql) || m.author.name.toLowerCase().includes(ql)
      )
      .slice(-80)
      .reverse();
  }, [log, q]);

  const links = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out: { id: string; m: ChatMessage; url: string }[] = [];
    for (let i = log.length - 1; i >= 0 && out.length < 80; i--) {
      const m = log[i];
      const found = m.text.match(URL_RE);
      if (!found) continue;
      found.forEach((raw, j) => {
        const url = raw.replace(/[.,!?)]+$/, "");
        if (ql && !url.toLowerCase().includes(ql) && !m.author.name.toLowerCase().includes(ql)) return;
        out.push({ id: `${m.id}-${j}`, m, url });
      });
    }
    return out;
  }, [log, q]);

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
      <HStack
        spacing="2px"
        bg={c.overlay.soft}
        borderRadius={c.radius.control}
        p="3px"
        mb="12px"
        flexShrink={0}
      >
        <TopTab active={section === "moderation"} onClick={() => setSection("moderation")}>
          MODERATION
        </TopTab>
        <TopTab active={section === "broadcast"} onClick={() => setSection("broadcast")}>
          BROADCAST
        </TopTab>
      </HStack>

      {section === "broadcast" ? (
        <BroadcastPanel />
      ) : (
        <>
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
        p="4px"
        mb="12px"
        flexShrink={0}
      >
        <SubTab active={tab === "questions"} onClick={() => setTab("questions")} icon={<LuMessageSquare size={15} />} label="Q&A" />
        <SubTab active={tab === "saved"} onClick={() => setTab("saved")} icon={<LuStar size={15} />} label="SAVED" badge={saved.length} />
        <SubTab active={tab === "trending"} onClick={() => setTab("trending")} icon={<LuHash size={15} />} label="TAGS" />
        <SubTab active={tab === "chatters"} onClick={() => setTab("chatters")} icon={<LuUsers size={15} />} label="USERS" />
        <SubTab active={tab === "links"} onClick={() => setTab("links")} icon={<LuLink size={15} />} label="LINKS" />
      </HStack>

      <Box flex="1" minH={0} overflowY="auto" sx={scrollbarSx(c)}>
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

        {tab === "links" && (
          <VStack align="stretch" spacing="6px">
            {links.length === 0 ? (
              <Text fontFamily="mono" fontSize="xs" color={c.text.subtle}>
                No links posted yet.
              </Text>
            ) : (
              links.map((l) => {
                const href = l.url.startsWith("http") ? l.url : `https://${l.url}`;
                return (
                  <Flex
                    key={l.id}
                    align="flex-start"
                    gap="8px"
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
                      <Text fontSize="2xs" fontWeight={700} color={l.m.author.color} noOfLines={1}>
                        {l.m.author.name}
                      </Text>
                      <Text
                        as="a"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        display="block"
                        fontSize="xs"
                        color={c.brand.gold}
                        mt="2px"
                        noOfLines={2}
                        sx={{ wordBreak: "break-all" }}
                        _hover={{ textDecoration: "underline" }}
                      >
                        {l.url}
                      </Text>
                    </Box>
                    <Box
                      as="a"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      color={c.text.subtle}
                      _hover={{ color: c.text.primary }}
                      flexShrink={0}
                      aria-label="Open link"
                      mt="1px"
                    >
                      <LuExternalLink size={14} />
                    </Box>
                  </Flex>
                );
              })
            )}
          </VStack>
        )}
      </Box>
        </>
      )}
    </Box>
  );
}
