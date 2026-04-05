import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Habit } from "@shared/schema";
import { Flame, Plus, Trash2, Zap, Trophy, ChevronRight, Sparkles, PenLine } from "lucide-react";
import { playTap, playHabitComplete } from "@/lib/sounds";

const CATEGORY_OPTIONS = [
  { value: "mindset", label: "Mindset", color: "text-mindset", bg: "bg-mindset", border: "border-mindset" },
  { value: "body",    label: "Body",    color: "text-body-cat", bg: "bg-body-cat", border: "border-body-cat" },
  { value: "social",  label: "Social",  color: "text-social",   bg: "bg-social",   border: "border-social" },
  { value: "sleep",   label: "Sleep",   color: "text-sleep",    bg: "bg-sleep",    border: "border-sleep" },
];

// ─── Template library ─────────────────────────────────────────────
const HABIT_TEMPLATES: Record<string, { icon: string; name: string; xp: number }[]> = {
  mindset: [
    { icon: "🧘", name: "10 Min Meditation",         xp: 20 },
    { icon: "📵", name: "No Phone First Hour",        xp: 20 },
    { icon: "📖", name: "Read 20 Pages",              xp: 15 },
    { icon: "🖊️", name: "Write in Journal",           xp: 20 },
    { icon: "🎯", name: "Set Daily Intentions",       xp: 15 },
    { icon: "🧠", name: "Learn Something New",        xp: 25 },
    { icon: "🌿", name: "5 Min Breathing Exercise",   xp: 10 },
    { icon: "📵", name: "No Social Media Before Noon",xp: 25 },
    { icon: "🌅", name: "Morning Gratitude (3 things)",xp: 15 },
    { icon: "🎵", name: "Listen to a Podcast",        xp: 10 },
    { icon: "🧩", name: "Practice a Skill 20 Min",    xp: 20 },
    { icon: "💡", name: "Evening Reflection",         xp: 15 },
  ],
  body: [
    { icon: "🧊", name: "Morning Cold Shower",        xp: 25 },
    { icon: "💪", name: "Workout / Move",             xp: 30 },
    { icon: "🥗", name: "Drink 2L Water",             xp: 10 },
    { icon: "🏃", name: "30 Min Walk Outside",        xp: 20 },
    { icon: "🥗", name: "Eat a Healthy Meal",         xp: 15 },
    { icon: "🧊", name: "Cold Exposure (Any Form)",   xp: 20 },
    { icon: "💪", name: "10 Min Stretching",          xp: 10 },
    { icon: "🏃", name: "Run 5K",                     xp: 40 },
    { icon: "🥗", name: "No Junk Food Today",         xp: 20 },
    { icon: "💪", name: "100 Push-Ups",               xp: 30 },
    { icon: "🌅", name: "Morning Sunlight (10 min)",  xp: 15 },
    { icon: "🥗", name: "No Alcohol Today",           xp: 25 },
  ],
  social: [
    { icon: "🤝", name: "Connect With Someone",       xp: 15 },
    { icon: "📞", name: "Call a Friend or Family",    xp: 20 },
    { icon: "🤝", name: "Do Something Kind",          xp: 15 },
    { icon: "💬", name: "Start a Conversation",       xp: 20 },
    { icon: "🤝", name: "Express Gratitude to Someone",xp: 15 },
    { icon: "📝", name: "Send a Thoughtful Message",  xp: 10 },
    { icon: "🎲", name: "Spend Quality Time (IRL)",   xp: 25 },
    { icon: "🤝", name: "Help Someone Today",         xp: 20 },
    { icon: "🎯", name: "Attend a Social Event",      xp: 30 },
    { icon: "💬", name: "Practice Active Listening",  xp: 15 },
  ],
  sleep: [
    { icon: "💤", name: "In Bed by 10:30pm",          xp: 20 },
    { icon: "🌅", name: "No Screens 1hr Before Bed",  xp: 15 },
    { icon: "💤", name: "7–8 Hours of Sleep",         xp: 20 },
    { icon: "📵", name: "Phone Off at 9pm",           xp: 20 },
    { icon: "🌿", name: "Wind-Down Routine",          xp: 15 },
    { icon: "💤", name: "Consistent Wake-Up Time",    xp: 20 },
    { icon: "🌅", name: "No Caffeine After 2pm",      xp: 15 },
    { icon: "🧘", name: "Sleep Meditation",           xp: 10 },
  ],
};

const XP_OPTIONS = [10, 15, 20, 25, 30, 40, 50];

// ─── Add modes ────────────────────────────────────────────────────
type AddMode = "choose" | "templates" | "custom";

export default function HabitsPage() {
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [templateCategory, setTemplateCategory] = useState("mindset");

  // Custom form state
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [newCategory, setNewCategory] = useState("mindset");
  const [newXp, setNewXp] = useState(20);

  const { data: habits = [], isLoading } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
  });

  const createHabitMutation = useMutation({
    mutationFn: async (payload: { name: string; icon: string; category: string; xpReward: number }) => {
      const res = await apiRequest("POST", "/api/habits", payload);
      return res.json();
    },
    onSuccess: () => {
      playHabitComplete();
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      setAddMode(null);
      setNewName("");
      setNewIcon("🎯");
      setNewCategory("mindset");
      setNewXp(20);
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/habits/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
  });

  const totalXpEarnable = habits.reduce((sum, h) => sum + h.xpReward, 0);
  const topStreak = Math.max(...habits.map(h => h.longestStreak), 0);

  // Check if a template habit is already added
  const existingNames = new Set(habits.map(h => h.name.toLowerCase()));

  return (
    <div className="flex flex-col pb-24 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-foreground">MY HABITS</h1>
          <button
            data-testid="add-habit-btn"
            className="forge-button px-4 py-2 text-sm flex items-center gap-1.5"
            onClick={() => { playTap(); setAddMode(addMode ? null : "choose"); }}
          >
            <Plus size={16} />
            {addMode ? "CLOSE" : "ADD"}
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-xp" />
            <span className="text-sm font-semibold text-foreground">{totalXpEarnable}</span>
            <span className="text-xs text-muted-foreground">XP/day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={14} className="text-streak" />
            <span className="text-sm font-semibold text-foreground">{topStreak}</span>
            <span className="text-xs text-muted-foreground">best streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy size={14} className="text-level" />
            <span className="text-sm font-semibold text-foreground">{habits.reduce((s, h) => s + h.totalCompletions, 0)}</span>
            <span className="text-xs text-muted-foreground">total done</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* ── Mode: Choose ─────────────────────────────────── */}
        {addMode === "choose" && (
          <div className="fade-up space-y-2.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">How do you want to add?</p>
            <button
              className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all active:scale-[0.98]"
              onClick={() => { playTap(); setAddMode("templates"); }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-xp" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-foreground">Choose from templates</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pick from 40+ proven habits, sorted by category</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>

            <button
              className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all active:scale-[0.98]"
              onClick={() => { playTap(); setAddMode("custom"); }}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <PenLine size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm text-foreground">Create custom habit</p>
                <p className="text-xs text-muted-foreground mt-0.5">Name it yourself, pick an icon & XP reward</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* ── Mode: Templates ──────────────────────────────── */}
        {addMode === "templates" && (
          <div className="fade-up space-y-3">
            <div className="flex items-center gap-2">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                onClick={() => { playTap(); setAddMode("choose"); }}
              >
                ← Back
              </button>
              <p className="font-display text-lg text-foreground">TEMPLATES</p>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORY_OPTIONS.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { playTap(); setTemplateCategory(cat.value); }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    templateCategory === cat.value
                      ? `${cat.color} bg-current/10 ${cat.border}`
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="space-y-2">
              {HABIT_TEMPLATES[templateCategory].map(tmpl => {
                const alreadyAdded = existingNames.has(tmpl.name.toLowerCase());
                return (
                  <button
                    key={tmpl.name}
                    disabled={alreadyAdded || createHabitMutation.isPending}
                    onClick={() => {
                      if (alreadyAdded) return;
                      playTap();
                      createHabitMutation.mutate({
                        name: tmpl.name,
                        icon: tmpl.icon,
                        category: templateCategory,
                        xpReward: tmpl.xp,
                      });
                    }}
                    className={`w-full bg-card border rounded-xl px-4 py-3 flex items-center gap-3 transition-all text-left ${
                      alreadyAdded
                        ? "border-streak/30 opacity-50 cursor-default"
                        : "border-border hover:border-primary/40 active:scale-[0.98]"
                    }`}
                  >
                    <span className="text-xl w-8 flex-shrink-0">{tmpl.icon}</span>
                    <span className={`flex-1 text-sm font-medium ${alreadyAdded ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {tmpl.name}
                    </span>
                    {alreadyAdded ? (
                      <span className="text-xs text-streak font-semibold flex-shrink-0">✓ Added</span>
                    ) : (
                      <span className="text-xs text-xp font-semibold flex-shrink-0">+{tmpl.xp} XP</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Mode: Custom ─────────────────────────────────── */}
        {addMode === "custom" && (
          <div className="fade-up bg-card border border-primary/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                onClick={() => { playTap(); setAddMode("choose"); }}
              >
                ← Back
              </button>
              <p className="font-display text-lg text-foreground">CUSTOM HABIT</p>
            </div>

            <input
              autoFocus
              placeholder="Habit name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && newName.trim() && createHabitMutation.mutate({ name: newName.trim(), icon: newIcon, category: newCategory, xpReward: newXp })}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
              data-testid="input-habit-name"
            />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Icon</p>
              <div className="flex flex-wrap gap-2">
                {["🎯","💪","🧘","📖","🧊","📵","🤝","🌅","🏃","🥗","🎵","🌿","💤","🖊️","🎲","🧠","💡","📞","🏋️","🚴","🎨","💬","🌊","🔥","⚡"].map(icon => (
                  <button
                    key={icon}
                    data-testid={`icon-${icon}`}
                    onClick={() => setNewIcon(icon)}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                      newIcon === icon
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-secondary border-2 border-transparent hover:border-border"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Category</p>
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat.value}
                    data-testid={`category-${cat.value}`}
                    onClick={() => setNewCategory(cat.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
                      newCategory === cat.value
                        ? `border-current ${cat.color} bg-current/10`
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">XP Reward</p>
              <div className="flex gap-2 flex-wrap">
                {XP_OPTIONS.map(xp => (
                  <button
                    key={xp}
                    data-testid={`xp-${xp}`}
                    onClick={() => setNewXp(xp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      newXp === xp
                        ? "border-primary text-xp bg-primary/10"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    +{xp}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="forge-button flex-1 py-2.5 text-sm disabled:opacity-40"
                disabled={!newName.trim() || createHabitMutation.isPending}
                onClick={() => createHabitMutation.mutate({ name: newName.trim(), icon: newIcon, category: newCategory, xpReward: newXp })}
                data-testid="create-habit"
              >
                {createHabitMutation.isPending ? "ADDING..." : "ADD HABIT"}
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setAddMode(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Habit list by category ───────────────────────── */}
        {CATEGORY_OPTIONS.map(cat => {
          const catHabits = habits.filter(h => h.category === cat.value);
          if (catHabits.length === 0) return null;
          return (
            <div key={cat.value}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-2 h-2 rounded-full ${cat.bg}`} />
                <p className={`text-xs font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</p>
              </div>
              <div className="space-y-2">
                {catHabits.map(habit => (
                  <HabitRow key={habit.id} habit={habit} onDelete={() => deleteHabitMutation.mutate(habit.id)} />
                ))}
              </div>
            </div>
          );
        })}

        {habits.length === 0 && !addMode && (
          <div className="pt-8 text-center text-muted-foreground">
            <p className="text-4xl mb-3">💪</p>
            <p className="font-display text-xl text-foreground mb-1">BUILD YOUR ARSENAL</p>
            <p className="text-sm">Add daily habits to forge mental strength.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HabitRow({ habit, onDelete }: { habit: Habit; onDelete: () => void }) {
  return (
    <div data-testid={`habit-row-${habit.id}`} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-xl flex-shrink-0">
        {habit.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{habit.name}</p>
          {habit.completedToday ? (
            <span className="text-xs text-streak font-medium">✓ done</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame size={10} className="text-streak" /> {habit.streak}d streak
          </span>
          <span className="text-xs text-muted-foreground">
            {habit.totalCompletions} total
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0 flex items-center gap-2">
        <div>
          <p className="text-xp font-display text-sm">+{habit.xpReward}</p>
          <p className="text-xs text-muted-foreground">XP</p>
        </div>
        <button
          data-testid={`delete-habit-${habit.id}`}
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
