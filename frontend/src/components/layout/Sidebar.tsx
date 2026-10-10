import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  UserPlus,
  Sparkles,
  Award,
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
  { name: 'New Profile', to: '/onboarding', icon: UserPlus, badge: 'Setup' },
];

export function Sidebar() {
  const { activeProfile } = useStudentProfiles();

  const progressPct =
    activeProfile && activeProfile.total_units > 0
      ? Math.round((activeProfile.completed_units / activeProfile.total_units) * 100)
      : 0;

  return (
    <>
      {/* Desktop Left Navigation Rail (~232px) */}
      <aside className="hidden lg:flex flex-col w-[232px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] p-4 border-r border-border bg-sidebar transition-colors duration-300 justify-between">
        <div className="space-y-6">
          {/* Navigation Section Title */}
          <div>
            <div className="px-3 text-[11px] font-black uppercase tracking-wider text-text-muted mb-2">
              Navigation
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-surface-soft text-primary shadow-clay-pill dark:shadow-clay-dark-pill border border-border font-extrabold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                              isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>

                        {item.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface dark:bg-surface-soft border border-border text-text-muted">
                            {item.badge}
                          </span>
                        )}

                        {isActive && !item.badge && (
                          <motion.div
                            layoutId="active-nav-indicator"
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Quick Academic Roadmap Pill */}
          <div className="rounded-2xl p-3.5 bg-surface-soft/80 border border-border shadow-clay-card dark:shadow-clay-dark-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Active Track
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                FSRS v4
              </span>
            </div>
            <div className="text-xs font-bold text-text-primary leading-tight">
              {activeProfile?.enrolled_subjects_count
                ? `${activeProfile.enrolled_subjects_count} Active Subjects`
                : 'Adaptive Study Queue'}
            </div>
            <div className="text-[10px] text-text-secondary">
              CP-SAT solver optimizes daily units for zero cramming.
            </div>
          </div>
        </div>

        {/* Bottom Learner Summary Card */}
        <div className="pt-3 border-t border-border">
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
                {activeProfile ? `${activeProfile.completed_units}/${activeProfile.total_units} units` : '0/0 units'}
              </span>
              <Award className="w-3 h-3 text-primary" />
            </div>
          </div>
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
