import { NavLink, Link } from 'react-router-dom';
import { Mountain, LayoutDashboard, Calendar, BookOpen, Sparkles } from 'lucide-react';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';

export function Navbar() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-white/90 text-indigo-700 shadow-clay-pill border border-white/80'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#e8eef6]/90 border-b border-white/70 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left: Alpine Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-indigo-400 p-0.5 shadow-clay-pill group-hover:shadow-clay-hover transition-all duration-200">
            <div className="w-full h-full bg-[#f0f4f9] rounded-[14px] flex items-center justify-center">
              <Mountain className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 font-sans">
                Alpine
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                Adaptive AI
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-none">
              Zero-Cloud Study Mentor
            </p>
          </div>
        </Link>

        {/* Center: Main Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#f0f4f9]/80 p-1.5 rounded-3xl border border-white/80 shadow-clay-card">
          <NavLink to="/dashboard" className={navLinkClass}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/schedule" className={navLinkClass}>
            <Calendar className="w-4 h-4" />
            <span>Schedule</span>
          </NavLink>
          <NavLink to="/curriculum" className={navLinkClass}>
            <BookOpen className="w-4 h-4" />
            <span>Curriculum</span>
          </NavLink>
        </nav>

        {/* Right: Profile Switcher */}
        <div className="flex items-center gap-3">
          <ProfileSwitcher />
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200/50 py-2 px-3 bg-[#f0f4f9]/90">
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/schedule" className={navLinkClass}>
          <Calendar className="w-4 h-4" />
          <span>Schedule</span>
        </NavLink>
        <NavLink to="/curriculum" className={navLinkClass}>
          <BookOpen className="w-4 h-4" />
          <span>Curriculum</span>
        </NavLink>
      </div>
    </header>
  );
}

