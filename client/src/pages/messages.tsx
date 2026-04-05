import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Send, MessageCircle, Crown, Lock, Wifi, WifiOff } from "lucide-react";
import { playMessageSend, playTap } from "@/lib/sounds";
import type { DmMessage } from "@shared/schema";

type Profile = {
  visitorId: string;
  handle: string;
  username: string | null;
  showUsername: number;
  isPro: number;
};

type Conversation = {
  id: number;
  participantA: string;
  participantB: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  otherHandle: string;
  otherUsername: string | null;
  otherShowUsername: boolean;
  unreadCount: number;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getDisplayName(handle: string, username: string | null, showUsername: boolean): string {
  if (showUsername && username) return username;
  return handle;
}

// ─── DM Chat View ────────────────────────────────────────────────
function DmChat({
  convo,
  myVisitorId,
  myProfile,
  onBack,
}: {
  convo: Conversation;
  myVisitorId: string;
  myProfile: Profile;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const otherName = getDisplayName(convo.otherHandle, convo.otherUsername, convo.otherShowUsername);

  // Load initial messages (also marks as read)
  useEffect(() => {
    apiRequest("GET", `/api/dm/conversations/${convo.id}/messages`)
      .then((r) => r.json())
      .then((msgs: DmMessage[]) => {
        setMessages(msgs);
        // Refresh conversations to reset unread badge
        queryClient.invalidateQueries({ queryKey: ["/api/dm/conversations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dm/unread"] });
      });
  }, [convo.id]);

  // SSE for real-time DMs
  useEffect(() => {
    const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
    const url = `${API_BASE}/api/dm/stream`;
    const es = new EventSource(url);
    sseRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_dm" && data.conversationId === convo.id) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          // Mark read immediately if chat is open
          apiRequest("GET", `/api/dm/conversations/${convo.id}/messages`).then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/dm/unread"] });
          });
        }
      } catch {}
    };

    return () => {
      es.close();
      sseRef.current = null;
      setConnected(false);
    };
  }, [convo.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/dm/conversations/${convo.id}/messages`, { content });
      return res.json();
    },
    onSuccess: (msg) => {
      playMessageSend();
      // SSE will echo it back to us
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setInput("");
      inputRef.current?.focus();
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }, [input, sendMutation]);

  const myDisplayName = getDisplayName(
    myProfile.handle,
    myProfile.username,
    myProfile.showUsername === 1
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {otherName[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground truncate">{otherName}</p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                {connected ? (
                  <Wifi size={11} className="text-streak" />
                ) : (
                  <WifiOff size={11} />
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Private conversation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <MessageCircle size={36} className="mb-3 opacity-30" />
            <p className="font-display text-lg text-foreground mb-1">START THE CONVERSATION</p>
            <p className="text-sm max-w-xs">Send a private message to {otherName}.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderVisitorId === myVisitorId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "flex-row-reverse" : "flex-row"} items-end gap-2`}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1 bg-primary/20 border border-primary/40 text-primary">
                {isMe ? myDisplayName[0]?.toUpperCase() : otherName[0]?.toUpperCase()}
              </div>

              <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {isMe ? "You" : otherName} · {timeAgo(msg.createdAt)}
                </span>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm bg-card border border-border text-foreground"
                  }`}
                  style={
                    isMe
                      ? { background: "linear-gradient(135deg, #e85d04, #e85d04cc)" }
                      : {}
                  }
                >
                  {msg.content}
                </div>
                {isMe && msg.readAt && (
                  <span className="text-xs text-muted-foreground mt-0.5 px-1">Read</span>
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
            placeholder={`Message ${otherName}...`}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors resize-none min-h-[40px] max-h-[100px]"
          />
          <button
            className="forge-button w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl disabled:opacity-40"
            disabled={!input.trim() || sendMutation.isPending}
            onClick={handleSend}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Private · {1000 - input.length} chars left
        </p>
      </div>
    </div>
  );
}

// ─── Inbox ────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [_, navigate] = useLocation();
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);

  const { data: profile } = useQuery<Profile>({ queryKey: ["/api/profile"] });

  const { data: convos = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/dm/conversations"],
    enabled: profile?.isPro === 1,
    refetchInterval: 30000,
  });

  // Not Pro: show paywall
  if (profile && profile.isPro !== 1) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-2xl text-foreground">MESSAGES</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5 pb-24">
          <div className="w-20 h-20 rounded-full bg-level/20 border border-level/40 flex items-center justify-center">
            <Lock size={32} className="text-level" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground mb-2">PRO FEATURE</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Direct messages are available to Pro members. Upgrade to connect privately with anyone in the community.
            </p>
          </div>
          <button
            className="forge-button px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
            onClick={() => navigate("/upgrade")}
          >
            <Crown size={16} />
            Upgrade to Pro — £3.99/mo
          </button>
        </div>
      </div>
    );
  }

  if (selectedConvo && profile) {
    return (
      <DmChat
        convo={selectedConvo}
        myVisitorId={profile.visitorId}
        myProfile={profile}
        onBack={() => setSelectedConvo(null)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">MESSAGES</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Crown size={11} className="text-level" />
            Pro feature · Private conversations
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-24">
        {isLoading ? (
          <div className="font-display text-xl text-xp animate-pulse text-center py-12">LOADING...</div>
        ) : convos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <MessageCircle size={44} className="text-muted-foreground opacity-30" />
            <div>
              <p className="font-display text-xl text-foreground mb-1">NO MESSAGES YET</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Head to a community room and tap someone's handle to start a private conversation.
              </p>
            </div>
          </div>
        ) : (
          convos.map((convo) => {
            const name = getDisplayName(convo.otherHandle, convo.otherUsername, convo.otherShowUsername);
            return (
              <button
                key={convo.id}
                className="w-full text-left"
                onClick={() => { playTap(); setSelectedConvo(convo); }}
              >
                <div className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-primary/40 transition-all">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-base font-bold text-primary flex-shrink-0">
                      {name[0]?.toUpperCase()}
                    </div>
                    {convo.unreadCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-xp flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">
                          {convo.unreadCount > 9 ? "9+" : convo.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`font-semibold text-sm ${convo.unreadCount > 0 ? "text-foreground" : "text-foreground"}`}>
                        {name}
                      </p>
                      {convo.lastMessageAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {timeAgo(convo.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {convo.lastMessagePreview ? (
                      <p className={`text-xs truncate ${convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {convo.lastMessagePreview}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No messages yet</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
