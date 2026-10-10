import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Dashboard } from '@/pages/Dashboard';
import { Schedule } from '@/pages/Schedule';
import { Curriculum } from '@/pages/Curriculum';
import { Onboarding } from '@/pages/Onboarding';
import { useTheme } from '@/hooks/useTheme';

export function App() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F0FFF4] dark:bg-[#0E2A26] text-[#1F2937] dark:text-[#E6FFED] flex flex-col font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/curriculum" element={<Curriculum />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" richColors theme={theme} />
      </div>
    </BrowserRouter>
  );
}

export default App;
