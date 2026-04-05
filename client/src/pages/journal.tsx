import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { JournalEntry } from "@shared/schema";
import { ChevronDown, ChevronUp } from "lucide-react";
import { playJournalSave, playTap } from "@/lib/sounds";

const JOURNAL_PROMPTS = [
  { emoji: "🧠", prompt: "What's one mental challenge I faced today and how did I handle it?" },
  { emoji: "💪", prompt: "What am I proud of myself for this week?" },
  { emoji: "😤", prompt: "What's been frustrating me, and what can I actually control?" },
  { emoji: "🎯", prompt: "What does winning the next 30 days look like for me?" },
  { emoji: "🔥", prompt: "What would the best version of myself do differently right now?" },
  { emoji: "😔", prompt: "What am I carrying that I need to put down?" },
  { emoji: "🤝", prompt: "Who in my life do I need to reach out to, and why have I been avoiding it?" },
  { emoji: "💡", prompt: "What's one belief I hold about myself that might be holding me back?" },
  { emoji: "🌅", prompt: "If I woke up tomorrow with no fear, what would I do?" },
  { emoji: "🏔️", prompt: "What's the hardest thing I've overcome? What did it teach me?" },
];

export default function JournalPage() {
  const [selectedPromptIdx, setSelectedPromptIdx] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
  });

  const createEntryMutation = useMutation({
    mutationFn: async () => {
      const prompt = customPrompt.trim() ||
        (selectedPromptIdx !== null ? JOURNAL_PROMPTS[selectedPromptIdx].prompt : "");
      const res = await apiRequest("POST", "/api/journal", { prompt, content });
      return res.json();
    },
    onSuccess: () => {
      playJournalSave();
      queryClient.invalidateQueries({ queryKey: ["/api/journal"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowForm(false);
      setContent("");
      setSelectedPromptIdx(null);
      setCustomPrompt("");
    },
  });

  const selectedPrompt = selectedPromptIdx !== null ? JOURNAL_PROMPTS[selectedPromptIdx] : null;
  const activePrompt = customPrompt.trim() || selectedPrompt?.prompt || "";

  return (
    <div className="flex flex-col pb-24 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-foreground">JOURNAL</h1>
            <p className="text-xs text-muted-foreground">{entries.length} entries · +30 XP per write</p>
          </div>
          <button
            data-testid="new-entry-btn"
            className="forge-button px-4 py-2 text-sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "CANCEL" : "WRITE"}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Write Form */}
        {showForm && (
          <div className="fade-up space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Pick a prompt</p>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto scrollbar-hide">
                {JOURNAL_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    data-testid={`prompt-${i}`}
                    className={`prompt-card text-left flex items-start gap-3 ${selectedPromptIdx === i ? "selected" : ""}`}
                    onClick={() => {
                      playTap();
                      setSelectedPromptIdx(i === selectedPromptIdx ? null : i);
                      setCustomPrompt("");
                    }}
                  >
                    <span className="text-xl flex-shrink-0">{p.emoji}</span>
                    <span className="text-sm text-foreground leading-snug">{p.prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Or write your own prompt</p>
              <input
                placeholder="Your own prompt..."
                value={customPrompt}
                onChange={e => { setCustomPrompt(e.target.value); setSelectedPromptIdx(null); }}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                data-testid="input-custom-prompt"
              />
            </div>

            {activePrompt && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Writing about</p>
                <p className="text-sm text-foreground italic">"{activePrompt}"</p>
              </div>
            )}

            <textarea
              rows={5}
              placeholder="Write freely. No one's watching. This is for you..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors resize-none"
              data-testid="journal-textarea"
            />

            <div className="flex gap-2 items-center">
              <button
                className="forge-button flex-1 py-3 text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                disabled={!content.trim() || !activePrompt || createEntryMutation.isPending}
                onClick={() => createEntryMutation.mutate()}
                data-testid="submit-journal"
              >
                {createEntryMutation.isPending ? "SAVING..." : "SAVE ENTRY · +30 XP"}
              </button>
            </div>
          </div>
        )}

        {/* Entries */}
        {entries.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Past Entries</p>
            <div className="space-y-3">
              {entries.map(entry => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedEntry === entry.id}
                  onToggle={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                />
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && !showForm && (
          <div className="pt-10 text-center text-muted-foreground">
            <p className="text-4xl mb-3">📓</p>
            <p className="font-display text-xl text-foreground mb-1">START YOUR STORY</p>
            <p className="text-sm max-w-xs mx-auto">Writing is one of the most powerful tools for mental clarity. Begin today.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JournalEntryCard({ entry, isExpanded, onToggle }: {
  entry: JournalEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const preview = entry.content.slice(0, 120) + (entry.content.length > 120 ? "..." : "");

  return (
    <div
      data-testid={`journal-entry-${entry.id}`}
      className="journal-card cursor-pointer hover:border-primary/30"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-xp font-semibold">{dateStr}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-streak">+{entry.xpEarned} XP</span>
          </div>
          <p className="text-xs text-muted-foreground italic mb-2 line-clamp-1">"{entry.prompt}"</p>
          <p className="text-sm text-foreground leading-relaxed">
            {isExpanded ? entry.content : preview}
          </p>
        </div>
        <button className="text-muted-foreground flex-shrink-0 mt-1">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
    </div>
  );
}
