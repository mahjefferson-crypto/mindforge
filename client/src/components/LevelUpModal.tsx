import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface LevelUpModalProps {
  newLevel: number;
  title: string;
  onClose: () => void;
}

function createParticles(container: HTMLElement) {
  const colors = ["#e85d04", "#ffbe0b", "#06d6a0", "#7b5ea7", "#4ea8de"];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${50 + Math.random() * 30}%;
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 0.5}s;
      animation-duration: ${1 + Math.random()}s;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

const LEVEL_TITLES = [
  "Recruit", "Initiate", "Challenger", "Steadfast", "Iron Will",
  "Focused", "Disciplined", "Grounded", "Resilient", "Forged",
  "Unshakeable", "Battle-Hardened", "Sovereign", "Apex", "Legend"
];

export default function LevelUpModal({ newLevel, title, onClose }: LevelUpModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      createParticles(containerRef.current);
      const t = setInterval(() => {
        if (containerRef.current) createParticles(containerRef.current);
      }, 800);
      return () => clearInterval(t);
    }
  }, []);

  return (
    <div className="level-up-overlay" data-testid="level-up-modal">
      <div ref={containerRef} className="relative w-full max-w-sm mx-4">
        <div className="level-up-card bg-card border-2 border-primary rounded-2xl p-8 text-center glow-xp relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 opacity-10"
            style={{ background: "radial-gradient(circle at 50% 50%, #e85d04, transparent 70%)" }} />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="close-level-up"
          >
            <X size={20} />
          </button>

          <div className="relative z-10">
            <div className="text-6xl mb-2">⚡</div>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-2">LEVEL UP</p>
            <div className="font-display text-8xl text-xp glow-text-xp mb-1">{newLevel}</div>
            <div className="font-display text-2xl text-level mb-4">{title}</div>
            <p className="text-muted-foreground text-sm mb-6">
              You've forged a stronger mind.<br />Keep building the discipline.
            </p>
            <button
              onClick={onClose}
              className="forge-button w-full py-3 text-base"
              data-testid="continue-after-levelup"
            >
              LET'S GO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
