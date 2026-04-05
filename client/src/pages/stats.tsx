import { useQuery } from "@tanstack/react-query";
import type { User, XpEvent, CheckIn, Habit } from "@shared/schema";
import { Zap, Flame, Trophy, Target, TrendingUp, Calendar } from "lucide-react";
import XpBar from "@/components/XpBar";

const MOOD_EMOJIS = ["", "💀", "😶", "😐", "😤", "🔥"];
const LEVEL_TITLES = [
  "Recruit", "Initiate", "Challenger", "Steadfast", "Iron Will",
  "Focused", "Disciplined", "Grounded", "Resilient", "Forged",
  "Unshakeable", "Battle-Hardened", "Sovereign", "Apex", "Legend"
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StatsPage() {
  const { data: user } = useQuery<User>({ queryKey: ["/api/user"] });
  const { data: habits = [] } = useQuery<Habit[]>({ queryKey: ["/api/habits"] });
  const { data: xpEvents = [] } = useQuery<XpEvent[]>({ queryKey: ["/api/xp-events"] });
  const { data: weeklyMoods = [] } = useQuery<CheckIn[]>({ queryKey: ["/api/moods/weekly"] });

  if (!user) return null;

  const totalHabitsCompleted = habits.reduce((s, h) => s + h.totalCompletions, 0);
  const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);
  const activeStreaks = habits.filter(h => h.streak > 0).length;
  const avgMood = weeklyMoods.length > 0
    ? (weeklyMoods.reduce((s, m) => s + m.mood, 0) / weeklyMoods.length).toFixed(1)
    : "—";

  // Build 7-day mood chart
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const moodByDay = last7Days.map(day => {
    const dayStr = day.toISOString().split("T")[0];
    const entry = weeklyMoods.find(m => m.createdAt.startsWith(dayStr));
    return {
      day: DAYS[day.getDay()],
      mood: entry?.mood || null,
      isToday: dayStr === today.toISOString().split("T")[0],
    };
  });

  // Next level info
  const nextTitle = LEVEL_TITLES[Math.min(user.level, LEVEL_TITLES.length - 1)];
  const progress = Math.min((user.xp / user.xpToNextLevel) * 100, 100);

  return (
    <div className="flex flex-col pb-24 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4">
        <h1 className="font-display text-2xl text-foreground">YOUR STATS</h1>
        <p className="text-xs text-muted-foreground">{user.name}'s Mind Forge progress</p>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Level Card */}
        <div className="fade-up bg-card border border-primary/30 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ background: "radial-gradient(circle at 80% 50%, #e85d04, transparent 60%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="level-badge w-16 h-16 text-2xl text-white font-bold">
                {user.level}
              </div>
              <div>
                <p className="font-display text-2xl text-level">{user.title}</p>
                <p className="text-sm text-muted-foreground">{user.totalXp.toLocaleString()} total XP</p>
              </div>
            </div>
            <XpBar user={user} />
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="fade-up grid grid-cols-2 gap-3" style={{ animationDelay: "0.05s" }}>
          <StatCard
            icon={<Flame size={18} className="text-streak" />}
            value={longestStreak}
            label="Best Streak"
            suffix="days"
          />
          <StatCard
            icon={<Target size={18} className="text-xp" />}
            value={totalHabitsCompleted}
            label="Habits Done"
          />
          <StatCard
            icon={<TrendingUp size={18} className="text-level" />}
            value={activeStreaks}
            label="Active Streaks"
          />
          <StatCard
            icon={<Calendar size={18} className="text-sleep" />}
            value={avgMood}
            label="7-Day Mood"
            suffix="/5"
          />
        </div>

        {/* Mood Chart */}
        <div className="fade-up bg-card border border-border rounded-xl p-4" style={{ animationDelay: "0.1s" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">7-Day Mood</p>
          <div className="flex items-end justify-between gap-1.5 h-28">
            {moodByDay.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                {day.mood ? (
                  <>
                    <span className="text-sm">{MOOD_EMOJIS[day.mood]}</span>
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        day.isToday ? "bg-primary" : "bg-secondary"
                      }`}
                      style={{ height: `${(day.mood / 5) * 70}px` }}
                    />
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground/50">—</span>
                    <div className="w-full rounded-t-md bg-secondary/30" style={{ height: "14px" }} />
                  </>
                )}
                <span className={`text-xs ${day.isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent XP History */}
        {xpEvents.length > 0 && (
          <div className="fade-up bg-card border border-border rounded-xl p-4" style={{ animationDelay: "0.15s" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Recent XP</p>
            <div className="space-y-2.5 max-h-52 overflow-y-auto scrollbar-hide">
              {xpEvents.map(ev => (
                <div key={ev.id} data-testid={`xp-event-${ev.id}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                      <Zap size={12} className="text-xp" />
                    </div>
                    <span className="text-sm text-foreground truncate max-w-44">{ev.reason}</span>
                  </div>
                  <span className="text-xp font-display text-sm font-semibold">+{ev.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habits breakdown */}
        {habits.length > 0 && (
          <div className="fade-up bg-card border border-border rounded-xl p-4" style={{ animationDelay: "0.2s" }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Habit Streaks</p>
            <div className="space-y-3">
              {habits.sort((a, b) => b.streak - a.streak).map(habit => (
                <div key={habit.id} data-testid={`stat-habit-${habit.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{habit.icon}</span>
                      <span className="text-sm text-foreground">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame size={11} className="text-streak" />
                      <span className="text-xs text-streak font-semibold">{habit.streak}d</span>
                    </div>
                  </div>
                  <div className="xp-bar-track">
                    <div
                      className="xp-bar-fill"
                      style={{
                        width: `${Math.min((habit.streak / Math.max(longestStreak, 1)) * 100, 100)}%`,
                        background: "linear-gradient(90deg, #06d6a0, #4ea8de)"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, suffix }: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-display text-3xl text-foreground leading-none">
        {value}
        {suffix && <span className="text-lg text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}
