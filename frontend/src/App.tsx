import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/Navbar';
import { Dashboard } from '@/pages/Dashboard';
import { Schedule } from '@/pages/Schedule';
import { Curriculum } from '@/pages/Curriculum';
import { Onboarding } from '@/pages/Onboarding';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#e8eef6] text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
        <Toaster position="bottom-right" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
