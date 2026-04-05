import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bell, BellOff, X } from "lucide-react";

// VAPID key placeholder — user replaces this with their own from a push service
// For now we use the browser's built-in Push API which works without VAPID for testing
const VAPID_PUBLIC_KEY = "";

export default function PushPrompt({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [permState, setPermState] = useState<string>("default");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    const perm = Notification.permission;
    setPermState(perm);
    // Only show prompt if permission hasn't been decided
    if (perm === "default") {
      const timer = setTimeout(() => setVisible(true), 3000); // Delay to not overwhelm
      return () => clearTimeout(timer);
    }
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermState(permission);

      if (permission !== "granted") {
        throw new Error("Permission denied");
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Subscribe to push (basic, no VAPID for now)
      let subscription;
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // applicationServerKey would go here with a real VAPID key
        });
      } catch {
        // If push manager fails (e.g. no VAPID key), just save the notification pref
        subscription = { endpoint: "local-notifications-only", keys: {} };
      }

      // Save to backend
      await apiRequest("POST", "/api/push/subscribe", { subscription });

      // Show a test notification
      if (permission === "granted") {
        new Notification("Mind Forge 🔥", {
          body: "Notifications are on. We'll remind you to check in daily.",
          icon: "/icon-192.png",
        });
      }

      return subscription;
    },
    onSuccess: () => {
      setVisible(false);
      onDismiss();
    },
    onError: () => {
      setVisible(false);
      onDismiss();
    },
  });

  if (!visible || permState !== "default") return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 fade-up">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-xp" />
          </div>

          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground mb-0.5">
              Stay on track
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get a daily reminder to check in, log habits, and keep your streak alive.
            </p>
          </div>

          <button
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            onClick={() => { setVisible(false); onDismiss(); }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
            onClick={() => { setVisible(false); onDismiss(); }}
          >
            Not now
          </button>
          <button
            className="flex-1 forge-button py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? "Enabling..." : (
              <><Bell size={12} /> Enable reminders</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
