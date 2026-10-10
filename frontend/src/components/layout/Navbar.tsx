import { NavLink, Link } from 'react-router-dom';
import { Mountain, LayoutDashboard, Calendar, BookOpen, Sparkles } from 'lucide-react';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function Navbar() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-white/95 dark:bg-[#16423C] text-teal-800 dark:text-[#E6FFED] shadow-clay-pill dark:shadow-clay-dark-pill border border-white/90 dark:border-teal-700/30'
        : 'text-teal-900/70 dark:text-[#99F6E4]/70 hover:text-[#1F2937] dark:hover:text-[#E6FFED] hover:bg-white/40 dark:hover:bg-white/5'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F0FFF4]/90 dark:bg-[#0E2A26]/90 border-b border-teal-900/10 dark:border-teal-900/40 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Left: Alpine Brand */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#E6FFED] dark:bg-[#123B35] p-1 shadow-clay-pill dark:shadow-clay-dark-pill border border-white/80 dark:border-teal-700/30 group-hover:shadow-clay-hover dark:group-hover:shadow-clay-dark-hover transition-all duration-200">
            <div className="w-full h-full bg-[#14BBA6] dark:bg-[#2DD4BF] text-white dark:text-[#0E2A26] rounded-xl flex items-center justify-center shadow-inner">
              <Mountain className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-[#1F2937] dark:text-[#E6FFED] font-sans">
                Alpine
              </span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100/70 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/50 dark:border-teal-800/40 uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                Adaptive AI
              </span>
            </div>
            <p className="text-[11px] font-medium text-teal-900/70 dark:text-[#99F6E4]/70 leading-none">
              Zero-Cloud Study Mentor
            </p>
          </div>
        </Link>

        {/* Center: Main Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#E6FFED] dark:bg-[#123B35] p-1.5 rounded-3xl border border-white/80 dark:border-teal-900/40 shadow-clay-card dark:shadow-clay-dark-card transition-colors">
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

        {/* Right: Theme Toggle + Profile Switcher */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ProfileSwitcher />
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-teal-900/10 dark:border-teal-900/40 py-2 px-3 bg-[#E6FFED] dark:bg-[#123B35]">
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
