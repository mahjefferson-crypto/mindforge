import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, User, Eye, EyeOff, Crown, CheckCircle } from "lucide-react";

type Profile = {
  id: number;
  visitorId: string;
  username: string | null;
  showUsername: number;
  isPro: number;
  proSince: string | null;
  proExpiresAt: string | null;
  createdAt: string;
  handle: string;
};

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const [username, setUsername] = useState("");
  const [showUsername, setShowUsername] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setShowUsername(profile.showUsername === 1);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/profile", {
        username: username.trim(),
        showUsername: showUsername ? 1 : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const displayName = profile
    ? showUsername && username.trim()
      ? username.trim()
      : profile.handle
    : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-card border-t border-border rounded-t-2xl z-10 p-5 pb-8 fade-up">
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-xl text-foreground">YOUR IDENTITY</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control how you appear in the community
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="font-display text-xl text-xp animate-pulse text-center py-8">LOADING...</div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="bg-secondary/50 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold text-primary">
                {displayName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Appearing as</p>
                <p className="font-semibold text-sm text-foreground">{displayName}</p>
              </div>
              {profile?.isPro === 1 && (
                <div className="ml-auto flex items-center gap-1.5 bg-level/15 border border-level/30 rounded-full px-2.5 py-1">
                  <Crown size={12} className="text-level" />
                  <span className="text-xs font-semibold text-level">PRO</span>
                </div>
              )}
            </div>

            {/* Username field */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Username (optional)
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.slice(0, 24))}
                  placeholder="Choose a username..."
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {24 - username.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Letters, numbers, no spaces. Leave blank to stay anonymous.
              </p>
            </div>

            {/* Show username toggle */}
            <button
              className="w-full flex items-center justify-between bg-secondary/50 border border-border rounded-xl px-4 py-3 hover:border-primary/40 transition-all"
              onClick={() => setShowUsername(!showUsername)}
            >
              <div className="flex items-center gap-3">
                {showUsername ? (
                  <Eye size={16} className="text-primary" />
                ) : (
                  <EyeOff size={16} className="text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {showUsername ? "Showing username" : "Staying anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {showUsername
                      ? "Your username appears in community rooms"
                      : "Your handle is shown instead"}
                  </p>
                </div>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${
                  showUsername ? "bg-primary" : "bg-secondary border border-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
                    showUsername ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </button>

            {/* Anonymous handle info */}
            {!showUsername && (
              <div className="bg-secondary/30 rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted-foreground">
                  Your anonymous handle:{" "}
                  <span className="text-foreground font-semibold">{profile?.handle}</span>
                  {" "}— unique to you, consistent across rooms.
                </p>
              </div>
            )}

            {/* Save button */}
            <button
              className="forge-button w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saved ? (
                <><CheckCircle size={16} /> Saved!</>
              ) : saveMutation.isPending ? (
                "Saving..."
              ) : (
                "Save Identity"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
