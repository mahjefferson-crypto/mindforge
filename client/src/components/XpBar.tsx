import type { User } from "@shared/schema";

interface XpBarProps {
  user: User;
  compact?: boolean;
}

export default function XpBar({ user, compact }: XpBarProps) {
  const progress = Math.min((user.xp / user.xpToNextLevel) * 100, 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="xp-bar-track flex-1">
          <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
          {user.xp}/{user.xpToNextLevel}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="level-badge w-8 h-8 text-sm text-white font-bold">
            {user.level}
          </div>
          <div>
            <p className="font-display text-lg leading-none text-level">{user.title}</p>
            <p className="text-xs text-muted-foreground">Level {user.level}</p>
          </div>
        </div>
        <span className="text-xs text-xp font-semibold">
          {user.xp} / {user.xpToNextLevel} XP
        </span>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
