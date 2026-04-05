import { useLocation, Link } from "wouter";
import { Flame, Dumbbell, BookOpen, Users, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toggleMute, isMuted, playTap } from "@/lib/sounds";

const navItems = [
  { href: "/", icon: Flame, label: "Forge" },
  { href: "/habits", icon: Dumbbell, label: "Habits" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
];

export default function BottomNav() {
  const [location] = useLocation();
  const [muted, setMuted] = useState(isMuted());

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/dm/unread"],
    refetchInterval: 30000,
    staleTime: 10000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const handleMuteToggle = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
    if (!nowMuted) playTap();
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-border bg-card/95 backdrop-blur-sm z-40">
      <div className="flex items-center justify-around px-1 py-1.5 pb-safe">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          const isMessages = href === "/messages";
          const showBadge = isMessages && unreadCount > 0;

          return (
            <Link key={href} href={href}>
              <div
                data-testid={`nav-${label.toLowerCase()}`}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none relative ${
                  isActive ? "active text-primary" : "text-muted-foreground"
                }`}
                onClick={() => playTap()}
              >
                <div className="relative">
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                  {showBadge && (
                    <div className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-xp flex items-center justify-center px-0.5">
                      <span className="text-[9px] font-bold text-white leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </div>
            </Link>
          );
        })}
        {/* Mute toggle */}
        <button
          onClick={handleMuteToggle}
          data-testid="mute-toggle"
          className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none ${
            muted ? "text-muted-foreground" : "text-muted-foreground"
          }`}
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? <VolumeX size={17} strokeWidth={1.75} /> : <Volume2 size={17} strokeWidth={1.75} />}
          <span className="text-[10px] font-medium leading-tight">{muted ? "Muted" : "Sound"}</span>
        </button>
      </div>
    </nav>
  );
}
