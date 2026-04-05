import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Crown, MessageCircle, Lock, TrendingUp, Sparkles,
  CheckCircle, ArrowLeft, Shield, Zap
} from "lucide-react";

type Profile = {
  isPro: number;
  proExpiresAt: string | null;
  handle: string;
};

const PRO_FEATURES = [
  {
    icon: MessageCircle,
    title: "Direct Messages",
    desc: "Send private messages to any community member",
    color: "#4ea8de",
  },
  {
    icon: Lock,
    title: "All Community Rooms",
    desc: "Access every room — no locked doors",
    color: "#06d6a0",
  },
  {
    icon: TrendingUp,
    title: "Advanced Stats",
    desc: "Mood trends, habit analytics, progress charts",
    color: "#ffbe0b",
  },
  {
    icon: Sparkles,
    title: "Deep Journal Prompts",
    desc: "Harder, more vulnerable prompts to go deeper",
    color: "#e85d04",
  },
  {
    icon: Crown,
    title: "Pro Badge",
    desc: "Show your commitment in the community",
    color: "#a78bfa",
  },
];

const FREE_LIMIT_ROOMS = 3;

export default function UpgradePage() {
  const [_, navigate] = useLocation();
  const [step, setStep] = useState<"landing" | "payment" | "success">("landing");
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: profile } = useQuery<Profile>({ queryKey: ["/api/profile"] });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscribe", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setStep("success");
    },
  });

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validateAndPay = () => {
    const e: Record<string, string> = {};
    if (cardNum.replace(/\s/g, "").length < 16) e.cardNum = "Enter a valid card number";
    if (expiry.length < 5) e.expiry = "Enter valid expiry";
    if (cvc.length < 3) e.cvc = "Enter valid CVC";
    if (!cardName.trim()) e.cardName = "Enter name on card";
    setErrors(e);
    if (Object.keys(e).length === 0) {
      subscribeMutation.mutate();
    }
  };

  // Already pro
  if (profile?.isPro === 1) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-2xl text-foreground">PRO</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
          <div className="w-20 h-20 rounded-full bg-level/20 border border-level/40 flex items-center justify-center">
            <Crown size={36} className="text-level" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground mb-2">YOU'RE PRO</h2>
            <p className="text-sm text-muted-foreground">
              All features are unlocked. Keep forging.
            </p>
            {profile.proExpiresAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Renews {new Date(profile.proExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          <button
            className="forge-button px-8 py-3 rounded-xl text-sm font-semibold"
            onClick={() => navigate("/")}
          >
            Back to Forge
          </button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5 pb-24">
          <div className="w-24 h-24 rounded-full bg-streak/20 border border-streak/40 flex items-center justify-center animate-pulse">
            <CheckCircle size={44} className="text-streak" />
          </div>
          <div>
            <h2 className="font-display text-3xl text-foreground mb-2">WELCOME TO PRO</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              All features are now unlocked. You're investing in yourself — that takes courage.
            </p>
          </div>
          <div className="w-full space-y-2 max-w-xs">
            {PRO_FEATURES.map(({ icon: Icon, title, color }) => (
              <div key={title} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5">
                <Icon size={16} style={{ color }} />
                <span className="text-sm font-medium text-foreground">{title}</span>
                <CheckCircle size={14} className="ml-auto text-streak" />
              </div>
            ))}
          </div>
          <button
            className="forge-button w-full max-w-xs py-3 rounded-xl text-sm font-semibold"
            onClick={() => navigate("/messages")}
          >
            Go to Messages
          </button>
        </div>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => setStep("landing")}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-2xl text-foreground">PAYMENT</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 pb-24">
          {/* Order summary */}
          <div className="bg-card border border-border rounded-xl px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-level/20 border border-level/40 flex items-center justify-center">
              <Crown size={18} className="text-level" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">Mind Forge Pro</p>
              <p className="text-xs text-muted-foreground">Monthly subscription</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg text-foreground">£3.99</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          </div>

          {/* Card form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Card number
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cardNum}
                onChange={(e) => setCardNum(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors ${errors.cardNum ? "border-red-500/60" : "border-border"}`}
              />
              {errors.cardNum && <p className="text-xs text-red-400 mt-1">{errors.cardNum}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Expiry
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors ${errors.expiry ? "border-red-500/60" : "border-border"}`}
                />
                {errors.expiry && <p className="text-xs text-red-400 mt-1">{errors.expiry}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  CVC
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors ${errors.cvc ? "border-red-500/60" : "border-border"}`}
                />
                {errors.cvc && <p className="text-xs text-red-400 mt-1">{errors.cvc}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Name on card
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Smith"
                className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors ${errors.cardName ? "border-red-500/60" : "border-border"}`}
              />
              {errors.cardName && <p className="text-xs text-red-400 mt-1">{errors.cardName}</p>}
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield size={13} />
            <span>Secured by 256-bit encryption. Cancel anytime.</span>
          </div>

          <button
            className="forge-button w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={validateAndPay}
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? (
              "Processing..."
            ) : (
              <><Zap size={16} /> Pay £3.99/month</>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            By subscribing you agree to our Terms of Service. Cancel anytime from your profile.
          </p>
        </div>
      </div>
    );
  }

  // Landing
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-2xl text-foreground">UPGRADE TO PRO</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 pb-28">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #e85d04 0%, #ffbe0b 50%, #e85d04 100%)" }}>
          <div className="px-5 py-6 text-center">
            <Crown size={40} className="text-white mx-auto mb-3" />
            <h2 className="font-display text-3xl text-white mb-1">GO PRO</h2>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="font-display text-4xl text-white">£3.99</span>
              <span className="text-white/80 text-sm">/month</span>
            </div>
            <p className="text-white/80 text-xs">Less than a coffee. Cancel anytime.</p>
          </div>
        </div>

        {/* Features */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
            Everything included
          </p>
          <div className="space-y-2.5">
            {PRO_FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={title}
                className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-4 fade-up"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compare */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider">
            <div className="px-3 py-2.5 text-muted-foreground">Feature</div>
            <div className="px-3 py-2.5 text-center text-muted-foreground">Free</div>
            <div className="px-3 py-2.5 text-center text-level">Pro</div>
          </div>
          {[
            ["Community rooms", `${FREE_LIMIT_ROOMS} rooms`, "All 7"],
            ["Journal prompts", "Basic", "Deep"],
            ["Direct messages", "—", "✓"],
            ["Advanced stats", "—", "✓"],
            ["Pro badge", "—", "✓"],
          ].map(([feat, free, pro]) => (
            <div key={feat} className="grid grid-cols-3 border-t border-border">
              <div className="px-3 py-2.5 text-xs text-foreground">{feat}</div>
              <div className="px-3 py-2.5 text-xs text-muted-foreground text-center">{free}</div>
              <div className="px-3 py-2.5 text-xs text-streak text-center font-semibold">{pro}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA sticky */}
      <div className="sticky bottom-0 px-5 py-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <button
          className="forge-button w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          onClick={() => setStep("payment")}
        >
          <Crown size={16} />
          Start Pro — £3.99/month
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Cancel anytime · Instant access
        </p>
      </div>
    </div>
  );
}
