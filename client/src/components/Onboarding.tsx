import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowRight, Flame, CheckCircle, Zap, Clock } from "lucide-react";

const FOCUS_OPTIONS = [
  { id: "anxiety", emoji: "🌊", label: "Anxiety", desc: "Worry, overthinking, panic" },
  { id: "depression", emoji: "🌑", label: "Depression", desc: "Low mood, numbness, motivation" },
  { id: "social", emoji: "🤝", label: "Social Skills", desc: "Loneliness, dating, connecting" },
  { id: "anger", emoji: "🔥", label: "Anger & Stress", desc: "Pressure, frustration, rage" },
  { id: "purpose", emoji: "🎯", label: "Purpose", desc: "Direction, identity, meaning" },
  { id: "relationships", emoji: "💬", label: "Relationships", desc: "Family, partners, boundaries" },
];

const TIME_OPTIONS = [
  { value: 5, label: "5 min", desc: "Quick daily check-in" },
  { value: 10, label: "10 min", desc: "Habits + check-in" },
  { value: 15, label: "15 min", desc: "Full routine + journal" },
  { value: 20, label: "20+", desc: "Deep work + community" },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (overrideMinutes?: number) => {
      const res = await apiRequest("POST", "/api/onboarding", {
        displayName: name.trim(),
        focusAreas: selectedFocus.join(","),
        dailyMinutes: overrideMinutes ?? dailyMinutes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onComplete();
    },
  });

  const toggleFocus = (id: string) => {
    setSelectedFocus((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Step 0: Name
  if (step === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-md mx-auto w-full">
          {/* Logo / branding */}
          <div className="w-20 h-20 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-8">
            <Flame size={40} className="text-xp" />
          </div>

          <h1 className="font-display text-3xl text-foreground text-center mb-2">MIND FORGE</h1>
          <p className="text-sm text-muted-foreground text-center mb-10 max-w-xs">
            Build mental strength daily. Track habits, journal, and level up your mind.
          </p>

          <div className="w-full space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                What should we call you?
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="Your name or alias..."
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) setStep(1);
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                This is how you'll appear in the community. You can stay anonymous later.
              </p>
            </div>

            <button
              className="forge-button w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              disabled={!name.trim()}
              onClick={() => setStep(1)}
            >
              Continue <ArrowRight size={16} />
            </button>

            <button
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep(1)}
            >
              Skip — stay anonymous
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 mt-10">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full transition-all ${
                  s === step ? "bg-primary w-12" : s < step ? "bg-primary/50" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Focus areas
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-6">
            <Zap size={30} className="text-xp" />
          </div>

          <h1 className="font-display text-2xl text-foreground text-center mb-2">
            WHAT ARE YOU WORKING ON?
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
            Pick everything that applies. We'll personalise your experience.
          </p>

          <div className="w-full grid grid-cols-2 gap-2.5 mb-6">
            {FOCUS_OPTIONS.map(({ id, emoji, label, desc }) => {
              const selected = selectedFocus.includes(id);
              return (
                <button
                  key={id}
                  className={`text-left rounded-xl px-3.5 py-3.5 border transition-all ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                  onClick={() => toggleFocus(id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{emoji}</span>
                    {selected && <CheckCircle size={14} className="text-primary" />}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </button>
              );
            })}
          </div>

          <button
            className="forge-button w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            disabled={selectedFocus.length === 0}
            onClick={() => setStep(2)}
          >
            Continue <ArrowRight size={16} />
          </button>

          <button
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            onClick={() => setStep(2)}
          >
            Skip this step
          </button>

          <div className="flex gap-2 mt-8">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full transition-all ${
                  s === step ? "bg-primary w-12" : s < step ? "bg-primary/50" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Daily commitment
  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-6">
          <Clock size={30} className="text-xp" />
        </div>

        <h1 className="font-display text-2xl text-foreground text-center mb-2">
          HOW MUCH TIME PER DAY?
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          Even 5 minutes a day builds real momentum. Be honest with yourself.
        </p>

        <div className="w-full space-y-2.5 mb-6">
          {TIME_OPTIONS.map(({ value, label, desc }) => {
            const selected = dailyMinutes === value;
            return (
              <button
                key={value}
                className={`w-full text-left rounded-xl px-4 py-4 border flex items-center gap-4 transition-all ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
                onClick={() => setDailyMinutes(value)}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-display text-lg flex-shrink-0 ${
                    selected ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{desc}</p>
                  <p className="text-xs text-muted-foreground">
                    {value === 5 && "Start small, build consistency"}
                    {value === 10 && "The sweet spot for most people"}
                    {value === 15 && "Serious about growth"}
                    {value === 20 && "All in — maximum progress"}
                  </p>
                </div>
                {selected && <CheckCircle size={18} className="ml-auto text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          className="forge-button w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
          disabled={!dailyMinutes || saveMutation.isPending}
          onClick={() => saveMutation.mutate(undefined)}
        >
          {saveMutation.isPending ? "Setting up..." : (
            <><Flame size={16} /> Start Forging</>
          )}
        </button>

        <button
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
          onClick={() => { setDailyMinutes(10); saveMutation.mutate(10); }}
        >
          Skip — I'll figure it out
        </button>

        <div className="flex gap-2 mt-8">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full transition-all ${
                s === step ? "bg-primary w-12" : s < step ? "bg-primary/50" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
