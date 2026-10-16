import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Schedule } from '@/pages/Schedule';
import { Curriculum } from '@/pages/Curriculum';
import { Onboarding } from '@/pages/Onboarding';
import { useTheme } from '@/hooks/useTheme';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import { DevToolsDock } from '@/components/dev/DevToolsDock';

export function App() {
  const { theme } = useTheme();
  const { profiles, activeProfileId, loading } = useStudentProfiles();

  // Strict onboarding routing guard:
  // Must have at least 1 profile in DB and an active profile ID matching an existing profile.
  const hasValidActiveProfile = Boolean(
    !loading &&
    profiles.length > 0 &&
    activeProfileId &&
    profiles.some((p) => p.id === activeProfileId)
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans selection:bg-primary selection:text-canvas transition-colors duration-300">
        <Navbar />
        <div
          className={`flex-1 flex min-h-[calc(100vh-4rem)] ${
            hasValidActiveProfile ? 'pb-16 lg:pb-0' : ''
          }`}
        >
          {hasValidActiveProfile && <Sidebar />}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-6 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-text-secondary">Initializing Alpine...</p>
              </div>
            ) : hasValidActiveProfile ? (
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/curriculum" element={<Curriculum />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="*" element={<Navigate to="/onboarding" replace />} />
              </Routes>
            )}
          </main>
        </div>
        <DevToolsDock />
        <Toaster position="bottom-right" richColors theme={theme} />
      </div>
    </BrowserRouter>
  );
}

export default App;
