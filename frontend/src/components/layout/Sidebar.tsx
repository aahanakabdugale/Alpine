import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Sparkles,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';

interface NavItem {
  name: string;
  to: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Schedule', to: '/schedule', icon: Calendar },
  { name: 'Curriculum Tree', to: '/curriculum', icon: BookOpen },
];

export function Sidebar() {
  const { activeProfile } = useStudentProfiles();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alpine_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('alpine_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const progressPct =
    activeProfile && activeProfile.total_units > 0
      ? Math.round((activeProfile.completed_units / activeProfile.total_units) * 100)
      : 0;

  return (
    <>
      {/* Desktop Left Navigation Rail (w-64 expanded, w-20 collapsed) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-border bg-sidebar transition-all duration-300 ease-in-out justify-between ${
          isCollapsed ? 'w-20 p-2.5' : 'w-64 p-4'
        }`}
      >
        <div className="space-y-6">
          {/* Navigation Section Title & Collapse Toggle */}
          <div>
            <div
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } mb-3`}
            >
              {!isCollapsed && (
                <span className="px-2 text-[11px] font-black uppercase tracking-wider text-text-muted select-none">
                  Navigation
                </span>
              )}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={isCollapsed ? item.name : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center ${
                        isCollapsed
                          ? 'justify-center w-full px-0 py-2.5'
                          : 'justify-between px-3.5 py-2.5'
                      } rounded-2xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-surface-soft text-primary shadow-clay-pill dark:shadow-clay-dark-pill border border-border font-extrabold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={`flex items-center ${
                            isCollapsed ? 'justify-center' : 'gap-3'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                              isActive
                                ? 'text-primary'
                                : 'text-text-muted group-hover:text-text-primary'
                            }`}
                          />
                          {!isCollapsed && <span>{item.name}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface dark:bg-surface-soft border border-border text-text-muted shrink-0">
                            {item.badge}
                          </span>
                        )}

                        {isActive && !item.badge && !isCollapsed && (
                          <motion.div
                            layoutId="active-nav-indicator"
                            className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Quick Academic Roadmap Pill (Expanded view only) */}
          {!isCollapsed && (
            <div className="rounded-2xl p-3.5 bg-surface-soft/80 border border-border shadow-clay-card dark:shadow-clay-dark-card space-y-2 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Active Track
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                  Adaptive
                </span>
              </div>
              <div className="text-xs font-bold text-text-primary leading-tight">
                {activeProfile?.enrolled_subjects_count
                  ? `${activeProfile.enrolled_subjects_count} Active Subjects`
                  : 'Adaptive Study Queue'}
              </div>
              <div className="text-[10px] text-text-secondary">
                Smart pacing to keep you ahead of exams.
              </div>
            </div>
          )}
        </div>

        {/* Bottom Learner Summary Card / Avatar Badge */}
        <div className="pt-3 border-t border-border">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div
                title={`${activeProfile?.display_name || 'Learner'}: ${progressPct}% completed (${activeProfile?.completed_units ?? 0}/${activeProfile?.total_units ?? 0} units)`}
                className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill cursor-default group"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs uppercase">
                  {activeProfile?.display_name
                    ? activeProfile.display_name.charAt(0)
                    : 'L'}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[18px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-black text-canvas shadow-sm">
                  {progressPct}%
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-3 bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-text-primary truncate max-w-[120px]">
                  {activeProfile?.display_name || 'Learner'}
                </span>
                <span className="font-mono text-[11px] font-extrabold text-primary">
                  {progressPct}%
                </span>
              </div>
              <div className="w-full bg-surface-soft h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-text-muted mt-1.5">
                <span>
                  {activeProfile
                    ? `${activeProfile.completed_units}/${activeProfile.total_units} units`
                    : '0/0 units'}
                </span>
                <Award className="w-3 h-3 text-primary" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile/Tablet Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 dark:bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around py-2 px-2 shadow-clay-card dark:shadow-clay-dark-card"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
                  isActive
                    ? 'text-primary bg-surface-soft border border-border shadow-clay-pill dark:shadow-clay-dark-pill'
                    : 'text-text-muted hover:text-text-primary'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
