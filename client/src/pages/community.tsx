import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { CommunityRoom, CommunityMessage } from "@shared/schema";
import { ArrowLeft, Send, Users, Wifi, WifiOff, Lock, Crown, MessageCircle, User } from "lucide-react";
import { playMessageSend, playReaction, playTap } from "@/lib/sounds";

type RoomWithLive = CommunityRoom & { liveCount: number };

type Profile = {
  visitorId: string;
  handle: string;
  username: string | null;
  showUsername: number;
  isPro: number;
};

const REACTION_EMOJIS = ["💪", "❤️", "🙏", "🔥", "👊", "😔"];
const FREE_ROOM_LIMIT = 3;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── Room List ────────────────────────────────────────────────────
function RoomList({ onSelect }: { onSelect: (room: RoomWithLive) => void }) {
  const [_, navigate] = useLocation();

  const { data: rooms = [], isLoading } = useQuery<RoomWithLive[]>({
    queryKey: ["/api/community/rooms"],
    refetchInterval: 30000,
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const isPro = profile?.isPro === 1;
  const displayName = profile
    ? profile.showUsername === 1 && profile.username
      ? profile.username
      : profile.handle
    : null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="font-display text-2xl text-xp animate-pulse">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-foreground">COMMUNITY</h1>
            {displayName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                You're{" "}
                <span className="text-xp font-semibold">{displayName}</span>
                {profile?.showUsername === 0 && " · anonymous"}
              </p>
            )}
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            onClick={() => navigate("/profile-settings")}
            title="Edit identity"
          >
            <User size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-24">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Choose a space to talk
        </p>
        {rooms.map((room, i) => {
          const isLocked = !isPro && i >= FREE_ROOM_LIMIT;
          return (
            <button
              key={room.slug}
              data-testid={`room-${room.slug}`}
              className="w-full text-left fade-up"
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => {
                playTap();
                if (isLocked) navigate("/upgrade");
                else onSelect(room);
              }}
            >
              <div className={`bg-card border rounded-xl px-4 py-4 flex items-center gap-4 transition-all duration-200 active:scale-98 ${isLocked ? "border-border opacity-60" : "border-border hover:border-primary/40"}`}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 relative"
                  style={{ background: `${room.color}22`, border: `1px solid ${room.color}44` }}
                >
                  {room.emoji}
                  {isLocked && (
                    <div className="absolute inset-0 rounded-xl bg-background/70 flex items-center justify-center">
                      <Lock size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-foreground">{room.name}</p>
                    {!isLocked && room.liveCount > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: room.color }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: room.color }} />
                        {room.liveCount} live
                      </span>
                    )}
                    {isLocked && (
                      <span className="flex items-center gap-1 text-xs font-medium text-level">
                        <Crown size={11} className="text-level" />
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                    {room.description}
                  </p>
                </div>

                <div className="text-muted-foreground flex-shrink-0">
                  {isLocked ? (
                    <Lock size={14} className="text-level" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Pro upsell if not pro */}
        {!isPro && rooms.length > FREE_ROOM_LIMIT && (
          <div className="rounded-xl border border-level/30 bg-level/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={14} className="text-level" />
              <p className="text-xs font-semibold text-level">Unlock all rooms with Pro</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {rooms.length - FREE_ROOM_LIMIT} more rooms available for £3.99/month
            </p>
            <button
              className="text-xs font-semibold text-level border border-level/40 rounded-lg px-3 py-1.5 hover:bg-level/20 transition-all"
              onClick={() => navigate("/upgrade")}
            >
              Upgrade →
            </button>
          </div>
        )}

        {/* Safe space rules */}
        <div className="rounded-xl border border-border bg-card/50 p-4 mt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Safe space rules:</span> Be honest, be kind, no judgement. Everyone here is working through something.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Room ────────────────────────────────────────────────────
function ChatRoom({
  room,
  myProfile,
  onBack,
}: {
  room: RoomWithLive;
  myProfile: Profile;
  onBack: () => void;
}) {
  const [_, navigate] = useLocation();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [showReactions, setShowReactions] = useState<number | null>(null);
  const [dmTarget, setDmTarget] = useState<{ visitorId: string; handle: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const myDisplayName =
    myProfile.showUsername === 1 && myProfile.username
      ? myProfile.username
      : myProfile.handle;

  // Load initial messages
  useEffect(() => {
    apiRequest("GET", `/api/community/rooms/${room.slug}/messages`)
      .then((r) => r.json())
      .then((msgs: CommunityMessage[]) => setMessages(msgs));
  }, [room.slug]);

  // SSE connection
  useEffect(() => {
    const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
    const url = `${API_BASE}/api/community/rooms/${room.slug}/stream`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_message") {
          setMessages((prev) => {
            if (prev.find((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        } else if (data.type === "reaction_update") {
          setMessages((prev) => prev.map((m) => (m.id === data.message.id ? data.message : m)));
        } else if (data.type === "connected") {
          setConnected(true);
        }
      } catch {}
    };

    return () => {
      es.close();
      sseRef.current = null;
      setConnected(false);
    };
  }, [room.slug]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/community/rooms/${room.slug}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      playMessageSend();
      setInput("");
      inputRef.current?.focus();
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ id, emoji }: { id: number; emoji: string }) => {
      const res = await apiRequest("POST", `/api/community/messages/${id}/react`, { emoji });
      return res.json();
    },
    onSuccess: (updated) => {
      playReaction();
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setShowReactions(null);
    },
  });

  const dmMutation = useMutation({
    mutationFn: async (targetVisitorId: string) => {
      const res = await apiRequest("POST", "/api/dm/conversations", { targetVisitorId });
      return res.json();
    },
    onSuccess: () => {
      navigate("/messages");
    },
    onError: (err: any) => {
      navigate("/upgrade");
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [input, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDmUser = (msg: CommunityMessage) => {
    if (msg.visitorId === myProfile.visitorId) return;
    setDmTarget({ visitorId: msg.visitorId, handle: msg.handle });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            data-testid="back-btn"
          >
            <ArrowLeft size={18} />
          </button>

          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: `${room.color}22`, border: `1px solid ${room.color}44` }}
          >
            {room.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground">{room.name}</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {connected ? (
                  <><Wifi size={11} className="text-streak" /> live</>
                ) : (
                  <><WifiOff size={11} /> offline</>
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{room.description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <span className="text-4xl mb-3">{room.emoji}</span>
            <p className="font-display text-lg text-foreground mb-1">START THE CONVERSATION</p>
            <p className="text-sm max-w-xs">Be the first to share. You're anonymous — say what's real.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.visitorId === myProfile.visitorId;
          const reactions = JSON.parse(msg.reactions || "{}") as Record<string, number>;
          const hasReactions = Object.keys(reactions).length > 0;

          return (
            <div
              key={msg.id}
              data-testid={`msg-${msg.id}`}
              className={`flex ${isMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}
            >
              {/* Avatar — tap to DM (for other users only) */}
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1 transition-all hover:scale-110 active:scale-95"
                style={{
                  background: isMe ? `${room.color}33` : "rgba(255,255,255,0.07)",
                  color: isMe ? room.color : "var(--color-text-muted)",
                  border: `1px solid ${isMe ? room.color + "44" : "rgba(255,255,255,0.08)"}`,
                }}
                onClick={() => !isMe && handleDmUser(msg)}
                title={!isMe ? `Message ${msg.handle}` : undefined}
              >
                {msg.handle[0]}
              </button>

              <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {isMe ? "You" : msg.handle} · {timeAgo(msg.createdAt)}
                </span>

                <div
                  className={`relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed cursor-pointer select-none ${
                    isMe
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm bg-card border border-border text-foreground"
                  }`}
                  style={isMe ? { background: `linear-gradient(135deg, ${room.color}, ${room.color}cc)` } : {}}
                  onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                >
                  {msg.content}
                </div>

                {/* Reactions */}
                {hasReactions && (
                  <div className="flex gap-1 mt-1 flex-wrap px-1">
                    {Object.entries(reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        className="flex items-center gap-0.5 bg-secondary rounded-full px-2 py-0.5 text-xs border border-border hover:border-primary/40 transition-all"
                        onClick={() => reactMutation.mutate({ id: msg.id, emoji })}
                      >
                        <span>{emoji}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reaction picker */}
                {showReactions === msg.id && (
                  <div className="flex gap-1.5 mt-1.5 px-1 bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        className="text-lg hover:scale-125 transition-transform"
                        onClick={() => reactMutation.mutate({ id: msg.id, emoji })}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 pb-[calc(0.75rem+64px)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={`Message as ${myDisplayName}...`}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors resize-none min-h-[40px] max-h-[100px]"
            data-testid="message-input"
          />
          <button
            className="forge-button w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl disabled:opacity-40"
            disabled={!input.trim() || sendMutation.isPending}
            onClick={handleSend}
            data-testid="send-btn"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          {myProfile.showUsername === 0 ? "Anonymous" : myDisplayName} · {500 - input.length} chars left
          {myProfile.isPro === 1 && (
            <span className="ml-1.5 text-level font-semibold">· Pro</span>
          )}
        </p>
      </div>

      {/* DM prompt sheet */}
      {dmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setDmTarget(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-card border-t border-border rounded-t-2xl z-10 p-5 pb-8">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-lg font-bold text-primary">
                {dmTarget.handle[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{dmTarget.handle}</p>
                <p className="text-xs text-muted-foreground">Community member</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Send a private message to <span className="font-semibold text-foreground">{dmTarget.handle}</span>?
              {myProfile.isPro !== 1 && (
                <span className="block mt-1 text-level">Direct messages require Pro.</span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                onClick={() => setDmTarget(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 forge-button py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                onClick={() => {
                  setDmTarget(null);
                  if (myProfile.isPro !== 1) {
                    navigate("/upgrade");
                  } else {
                    dmMutation.mutate(dmTarget.visitorId);
                  }
                }}
              >
                {myProfile.isPro !== 1 ? (
                  <><Crown size={14} /> Upgrade</>
                ) : (
                  <><MessageCircle size={14} /> Message</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Community Page ──────────────────────────────────────────
export default function CommunityPage() {
  const [selectedRoom, setSelectedRoom] = useState<RoomWithLive | null>(null);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  if (selectedRoom && profile) {
    return (
      <ChatRoom
        room={selectedRoom}
        myProfile={profile}
        onBack={() => setSelectedRoom(null)}
      />
    );
  }

  return <RoomList onSelect={setSelectedRoom} />;
}
