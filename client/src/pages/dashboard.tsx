import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, CheckIn, Habit } from "@shared/schema";
import XpBar from "@/components/XpBar";
import LevelUpModal from "@/components/LevelUpModal";
import { Zap, Flame, CheckCircle2, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playHabitComplete, playXpEarn, playLevelUp, playCheckIn, playTap, playStreak } from "@/lib/sounds";

const MOOD_OPTIONS = [
  { value: 1, emoji: "💀", label: "Low" },
  { value: 2, emoji: "😶", label: "Rough" },
  { value: 3, emoji: "😐", label: "Steady" },
  { value: 4, emoji: "😤", label: "Good" },
  { value: 5, emoji: "🔥", label: "Fired Up" },
];

const ENERGY_OPTIONS = [
  { value: 1, emoji: "🔋", label: "Dead" },
  { value: 2, emoji: "⚡", label: "Low" },
  { value: 3, emoji: "⚡⚡", label: "OK" },
  { value: 4, emoji: "⚡⚡⚡", label: "High" },
  { value: 5, emoji: "💥", label: "MAX" },
];

function getDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export default function Dashboard() {
  const { toast } = useToast();
  const [levelUpData, setLevelUpData] = useState<{ level: number; title: string } | null>(null);
  const [xpPops, setXpPops] = useState<{ id: number; x: number; y: number; amount: number }[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const popIdRef = useRef(0);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: habits } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const { data: todayCheckIn } = useQuery<CheckIn | null>({
    queryKey: ["/api/checkin/today"],
  });

  const completeHabitMutation = useMutation({
    mutationFn: async ({ id, rect }: { id: number; rect: DOMRect }) => {
      const res = await apiRequest("POST", `/api/habits/${id}/complete`);
      return { data: await res.json(), rect };
    },
    onSuccess: ({ data, rect }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      // Sound effects
      playHabitComplete();
      playXpEarn();

      // XP pop animation
      const newPop = {
        id: popIdRef.current++,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        amount: data.xpGained,
      };
      setXpPops(p => [...p, newPop]);
      setTimeout(() => setXpPops(p => p.filter(pop => pop.id !== newPop.id)), 1500);

      if (data.leveledUp) {
        setTimeout(() => {
          playLevelUp();
          queryClient.fetchQuery({ queryKey: ["/api/user"] }).then((u: any) => {
            setLevelUpData({ level: u.level, title: u.title });
          });
        }, 400);
      }
    },
    onError: () => {},
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkin", {
        mood: selectedMood,
        energy: selectedEnergy,
        note: moodNote || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkin/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moods/weekly"] });
      playCheckIn();
      if (data.leveledUp) {
        setTimeout(() => {
          playLevelUp();
          queryClient.fetchQuery({ queryKey: ["/api/user"] }).then((u: any) => {
            setLevelUpData({ level: u.level, title: u.title });
          });
        }, 300);
      }
      toast({ title: "+10 XP", description: "Check-in recorded. Keep showing up." });
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PATCH", "/api/user", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setEditingName(false);
    },
  });

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="font-display text-4xl text-xp animate-pulse">MIND FORGE</div>
      </div>
    );
  }

  const todayHabits = habits?.slice(0, 4) || [];
  const completedCount = todayHabits.filter(h => h.completedToday).length;
  const allCompleted = todayHabits.length > 0 && completedCount === todayHabits.length;

  return (
    <div className="flex flex-col pb-24 overflow-y-auto min-h-screen">
      {/* XP pop-ups */}
      {xpPops.map(pop => (
        <div
          key={pop.id}
          className="xp-pop"
          style={{ position: "fixed", left: pop.x - 30, top: pop.y - 20, zIndex: 100, pointerEvents: "none" }}
        >
          +{pop.amount} XP
        </div>
      ))}

      {levelUpData && (
        <LevelUpModal
          newLevel={levelUpData.level}
          title={levelUpData.title}
          onClose={() => setLevelUpData(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") updateNameMutation.mutate(nameInput);
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="bg-secondary text-foreground border border-border rounded-lg px-2 py-0.5 text-sm w-36 outline-none focus:border-primary"
                    data-testid="input-name"
                  />
                  <button onClick={() => updateNameMutation.mutate(nameInput)} className="text-streak" data-testid="confirm-name">
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-muted-foreground" data-testid="cancel-name">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="font-display text-xl text-foreground">
                    {getDayGreeting()}, {user?.name}
                  </div>
                  <button
                    onClick={() => { setNameInput(user?.name || ""); setEditingName(true); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="edit-name"
                  >
                    <Edit2 size={13} />
                  </button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          {/* Inline XP badge */}
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
            <Zap size={14} className="text-xp" />
            <span className="font-display text-sm text-level">{user?.totalXp?.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">XP</span>
          </div>
        </div>

        {user && <XpBar user={user} />}
      </div>

      <div className="px-5 py-5 space-y-6">

        {/* Daily Progress */}
        <div className="fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-foreground">TODAY'S FORGE</h2>
            <span className={`text-sm font-semibold ${allCompleted ? "text-streak" : "text-muted-foreground"}`}>
              {completedCount}/{todayHabits.length} done
            </span>
          </div>

          {allCompleted && todayHabits.length > 0 && (
            <div className="mb-3 rounded-xl border border-streak/30 bg-streak/5 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-streak font-semibold text-sm">All habits smashed!</p>
                <p className="text-xs text-muted-foreground">You're on another level today.</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {todayHabits.map((habit, i) => (
              <div
                key={habit.id}
                data-testid={`habit-card-${habit.id}`}
                className={`habit-card ${habit.completedToday ? "completed" : "cursor-pointer"} px-4 py-3`}
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={(e) => {
                  // Only fire if click wasn't on the check button itself
                  if (!(e.target as HTMLElement).closest('[data-check-btn]') && !habit.completedToday) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    completeHabitMutation.mutate({ id: habit.id, rect });
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                    habit.completedToday ? "bg-streak/20" : "bg-secondary"
                  }`}>
                    {habit.completedToday ? (
                      <div className="checkmark-anim">
                        <CheckCircle2 size={22} className="text-streak" />
                      </div>
                    ) : (
                      habit.icon
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm leading-tight ${habit.completedToday ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {habit.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {habit.streak > 0 && (
                        <span className="streak-badge">
                          <Flame size={10} /> {habit.streak}d
                        </span>
                      )}
                      <span className={`text-xs ${getCategoryColor(habit.category)}`}>
                        {habit.category}
                      </span>
                    </div>
                  </div>

                  {/* XP + check button */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xp font-display text-sm">+{habit.xpReward}</div>
                      <div className="text-xs text-muted-foreground">XP</div>
                    </div>
                    {/* Explicit check button */}
                    <button
                      data-check-btn="true"
                      data-testid={`check-habit-${habit.id}`}
                      disabled={habit.completedToday || completeHabitMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!habit.completedToday) {
                          const rect = (e.currentTarget as HTMLElement).closest('[data-testid^="habit-card"]')!.getBoundingClientRect();
                          completeHabitMutation.mutate({ id: habit.id, rect });
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                        habit.completedToday
                          ? "border-streak bg-streak/20 text-streak"
                          : "border-border hover:border-streak hover:bg-streak/10 hover:text-streak text-muted-foreground"
                      }`}
                    >
                      <Check size={15} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Progress bar for streak */}
                {habit.streak > 0 && (
                  <div className="mt-2.5 xp-bar-track">
                    <div
                      className="xp-bar-fill"
                      style={{ width: `${Math.min((habit.streak / 7) * 100, 100)}%`, background: "linear-gradient(90deg, #06d6a0, #06d6a0aa)" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {todayHabits.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              <p className="text-sm">No habits yet.</p>
              <p className="text-xs mt-1">Head to <span className="text-primary">Habits</span> to add some.</p>
            </div>
          )}
        </div>

        {/* Daily Check-In */}
        <div className="fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="font-display text-xl text-foreground mb-3">DAILY CHECK-IN</h2>

          {todayCheckIn ? (
            <div className="rounded-xl border border-streak/30 bg-streak/5 p-4 flex items-center gap-3">
              <div className="text-3xl">
                {MOOD_OPTIONS.find(m => m.value === todayCheckIn.mood)?.emoji}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{todayCheckIn.moodLabel} · Energy {todayCheckIn.energy}/5</p>
                <p className="text-xs text-muted-foreground mt-0.5">{todayCheckIn.note || "Check-in complete. +10 XP earned."}</p>
              </div>
              <div className="ml-auto">
                <CheckCircle2 size={20} className="text-streak" />
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">How's your mind today?</p>
                <div className="flex gap-2 justify-between">
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m.value}
                      data-testid={`mood-${m.value}`}
                      className={`mood-btn flex-1 ${selectedMood === m.value ? "selected" : ""}`}
                      onClick={() => { setSelectedMood(m.value); playTap(); }}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2.5">Energy level?</p>
                <div className="flex gap-2 justify-between">
                  {ENERGY_OPTIONS.map(e => (
                    <button
                      key={e.value}
                      data-testid={`energy-${e.value}`}
                      className={`mood-btn flex-1 ${selectedEnergy === e.value ? "selected" : ""}`}
                      onClick={() => { setSelectedEnergy(e.value); playTap(); }}
                    >
                      <span className="text-sm font-semibold">{e.emoji}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <input
                placeholder="Anything on your mind? (optional)"
                value={moodNote}
                onChange={e => setMoodNote(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                data-testid="input-mood-note"
              />

              <button
                className="forge-button w-full py-3 text-sm disabled:opacity-40 disabled:pointer-events-none"
                disabled={!selectedMood || !selectedEnergy}
                onClick={() => checkInMutation.mutate()}
                data-testid="submit-checkin"
              >
                {checkInMutation.isPending ? "SUBMITTING..." : "LOG CHECK-IN · +10 XP"}
              </button>
            </div>
          )}
        </div>

        {/* Motivational quote */}
        <DailyQuote />
      </div>
    </div>
  );
}

function getCategoryColor(cat: string) {
  const map: Record<string, string> = {
    mindset: "text-mindset",
    body: "text-body-cat",
    social: "text-social",
    sleep: "text-sleep",
  };
  return map[cat] || "text-muted-foreground";
}

const QUOTES = [
  { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
  { text: "Hard times create strong men.", author: "G. Michael Hopf" },
  { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "The only way out is through.", author: "Robert Frost" },
  { text: "Do the hard thing first. The rest becomes easy.", author: "Unknown" },
  { text: "You are not your thoughts. You are the observer of your thoughts.", author: "Eckhart Tolle" },
  { text: "Suffer the pain of discipline or the pain of regret.", author: "Jim Rohn" },
];

function DailyQuote() {
  const idx = new Date().getDay() % QUOTES.length;
  const q = QUOTES[idx];
  return (
    <div className="fade-up rounded-xl border border-border bg-card p-5" style={{ animationDelay: "0.2s" }}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Daily Fuel</p>
      <blockquote className="font-display text-lg text-foreground leading-snug mb-2">
        "{q.text}"
      </blockquote>
      <p className="text-xs text-xp">— {q.author}</p>
    </div>
  );
}
