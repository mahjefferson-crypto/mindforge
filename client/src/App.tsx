import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/dashboard";
import HabitsPage from "@/pages/habits";
import JournalPage from "@/pages/journal";
import StatsPage from "@/pages/stats";
import CommunityPage from "@/pages/community";
import MessagesPage from "@/pages/messages";
import UpgradePage from "@/pages/upgrade";
import BottomNav from "@/components/BottomNav";
import ProfileModal from "@/components/ProfileModal";
import Onboarding from "@/components/Onboarding";
import PushPrompt from "@/components/PushPrompt";
import { useState, useCallback, useEffect, useRef } from "react";
import { initAudio } from "@/lib/sounds";

type Profile = {
  onboarded: number;
  pushEnabled: number;
};

// Wrapper that renders Dashboard + opens ProfileModal
function ProfileSettingsPage() {
  return (
    <>
      <Dashboard />
      <ProfileModal onClose={() => { window.location.hash = "/"; }} />
    </>
  );
}

function AppShell() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [pushDismissed, setPushDismissed] = useState(false);
  const onboardingDecided = useRef(false);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  // Determine if onboarding is needed — run once when profile first loads
  useEffect(() => {
    if (profile === undefined) return;
    if (onboardingDecided.current) return;
    onboardingDecided.current = true;
    if (profile.onboarded === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [profile]);

  const showPush = profile !== undefined && profile.onboarded === 1 && profile.pushEnabled === 0 && !pushDismissed;

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
  }, []);

  // Unlock audio on first user interaction (required by mobile browsers)
  useEffect(() => {
    const unlock = () => {
      initAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Onboarding overlay */}
      {showOnboarding === true && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/habits" component={HabitsPage} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/upgrade" component={UpgradePage} />
        <Route path="/profile-settings" component={ProfileSettingsPage} />
      </Switch>
      <BottomNav />

      {/* Push notification prompt — shows after onboarding, on dashboard */}
      {showPush && <PushPrompt onDismiss={() => setPushDismissed(true)} />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppShell />
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}
