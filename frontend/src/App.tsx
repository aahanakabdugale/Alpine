import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Schedule } from '@/pages/Schedule';
import { Curriculum } from '@/pages/Curriculum';
import { Onboarding } from '@/pages/Onboarding';
import { useTheme } from '@/hooks/useTheme';

export function App() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas text-text-primary flex flex-col font-sans selection:bg-primary selection:text-canvas transition-colors duration-300">
        <Navbar />
        <div className="flex-1 flex min-h-[calc(100vh-4rem)] pb-16 lg:pb-0">
          <Sidebar />
          <main className="flex-1 min-w-0">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/curriculum" element={<Curriculum />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="bottom-right" richColors theme={theme} />
      </div>
    </BrowserRouter>
  );
}

export default App;
