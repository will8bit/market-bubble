"use client";

import { supabase } from "@/lib/supabase";
import { ChatMessage } from "./types";

const CHANNEL = process.env.NEXT_PUBLIC_CHAT_CHANNEL || "market-bubble-chat";

export function subscribeToChat(onBatch: (messages: ChatMessage[]) => void): () => void {
  if (!supabase) return () => {};

  const channel = supabase.channel(CHANNEL, {
    config: { broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "msgs" }, (payload) => {
    const messages = (payload.payload as { messages?: ChatMessage[] })?.messages;
    if (messages && messages.length) onBatch(messages);
  });

  channel.subscribe();

  return () => {
    supabase!.removeChannel(channel);
  };
}

export async function fetchRecent(): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("chat_recent")
    .select("messages")
    .eq("channel", CHANNEL)
    .maybeSingle();
  if (error || !data) return [];
  const messages = (data as { messages?: ChatMessage[] }).messages;
  return Array.isArray(messages) ? messages : [];
}
