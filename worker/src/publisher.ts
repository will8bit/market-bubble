import { createClient } from "@supabase/supabase-js";
import { ChatMessage } from "./types";

const FLUSH_MS = 250;
const MAX_PER_SEND = 60;
const MAX_BUFFER = 600;
const RECENT_LIMIT = 50;
const SNAPSHOT_MS = 3000;

export interface Publisher {
  broadcast(msg: ChatMessage): void;
  record(msg: ChatMessage): void;
  stop(): void;
}

export function createPublisher(url: string, key: string, channelName: string): Publisher {
  const supabase = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 20 } },
  });

  const channel = supabase.channel(channelName, {
    config: { broadcast: { ack: false, self: false } },
  });

  let ready = false;
  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      ready = true;
      console.log(`[publisher] realtime SUBSCRIBED — broadcasting on "${channelName}"`);
    } else {
      console.log(`[publisher] realtime status: ${status}`);
    }
  });

  let buffer: ChatMessage[] = [];
  let recent: ChatMessage[] = [];
  let dirty = false;

  const timer = setInterval(() => {
    if (!ready || buffer.length === 0) return;
    const batch = buffer.slice(0, MAX_PER_SEND);
    buffer = buffer.slice(MAX_PER_SEND);
    channel.send({ type: "broadcast", event: "msgs", payload: { messages: batch } });
  }, FLUSH_MS);

  let snapshotLogged = false;
  const snapshot = setInterval(async () => {
    if (!dirty) return;
    dirty = false;
    const { error } = await supabase
      .from("chat_recent")
      .upsert(
        { channel: channelName, messages: recent, updated_at: new Date().toISOString() },
        { onConflict: "channel" }
      );
    if (error) {
      console.error(`[publisher] snapshot error: ${error.message}`);
    } else if (!snapshotLogged) {
      snapshotLogged = true;
      console.log("[publisher] snapshot saved to chat_recent");
    }
  }, SNAPSHOT_MS);

  function addRecent(msg: ChatMessage) {
    recent.push(msg);
    if (recent.length > RECENT_LIMIT) recent = recent.slice(recent.length - RECENT_LIMIT);
    dirty = true;
  }

  return {
    broadcast(msg: ChatMessage) {
      buffer.push(msg);
      if (buffer.length > MAX_BUFFER) buffer = buffer.slice(buffer.length - MAX_BUFFER);
      addRecent(msg);
    },
    record(msg: ChatMessage) {
      addRecent(msg);
    },
    stop() {
      clearInterval(timer);
      clearInterval(snapshot);
      supabase.removeChannel(channel);
    },
  };
}
