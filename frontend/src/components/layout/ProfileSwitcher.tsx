import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ChevronDown, Check, UserPlus, Sparkles, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';

export function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfileId, loading } = useStudentProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const progressPercent = activeProfile && activeProfile.total_units > 0
    ? Math.round((activeProfile.completed_units / activeProfile.total_units) * 100)
    : 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={loading}
        className="group flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#E6FFED] dark:bg-[#123B35] border border-white/80 dark:border-teal-700/30 shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover active:shadow-clay-pressed dark:active:shadow-clay-dark-pressed transition-all duration-200 text-[#1F2937] dark:text-[#E6FFED] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-xl bg-[#14BBA6] dark:bg-[#2DD4BF] text-white dark:text-[#0E2A26] flex items-center justify-center font-bold text-xs shadow-inner">
          {activeProfile?.display_name ? (
            activeProfile.display_name.charAt(0).toUpperCase()
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-[#1F2937] dark:text-[#E6FFED] leading-tight truncate max-w-[140px]">
            {activeProfile?.display_name || (loading ? 'Loading...' : 'Select Learner')}
          </div>
          <div className="text-[11px] text-teal-900/70 dark:text-[#99F6E4]/70 flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-teal-700 dark:text-[#2DD4BF] font-semibold">
              {activeProfile ? `${activeProfile.completed_units}/${activeProfile.total_units}` : '0/0'}
            </span>
            <span>units</span>
            {activeProfile && activeProfile.total_units > 0 && (
              <span className="opacity-70">• {progressPercent}%</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-teal-900/60 dark:text-[#99F6E4]/60 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#14BBA6] dark:text-[#2DD4BF]' : 'group-hover:text-teal-950 dark:group-hover:text-white'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute right-0 mt-2.5 w-72 rounded-3xl bg-[#E6FFED] dark:bg-[#123B35] border border-white/90 dark:border-teal-900/40 shadow-clay-card dark:shadow-clay-dark-card p-2 z-50 backdrop-blur-sm"
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-teal-900/10 dark:border-teal-900/30 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900/70 dark:text-[#99F6E4]/70 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-teal-700 dark:text-[#2DD4BF]" />
                  Learner Profiles
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100/70 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/50 dark:border-teal-800/40">
                  Local SQLite
                </span>
              </div>
              <p className="text-[11px] text-teal-900/60 dark:text-[#99F6E4]/60 mt-0.5">
                Switch student persona to view tailored schedules.
              </p>
            </div>

            {/* Profile List */}
            <div className="max-h-64 overflow-y-auto space-y-1 py-1 pr-0.5">
              {profiles.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-teal-900/70 dark:text-[#99F6E4]/70">
                  No profiles found. Create one below!
                </div>
              ) : (
                profiles.map((profile) => {
                  const isActive = profile.id === activeProfile?.id;
                  const pct = profile.total_units > 0
                    ? Math.round((profile.completed_units / profile.total_units) * 100)
                    : 0;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setActiveProfileId(profile.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between transition-all duration-150 ${
                        isActive
                          ? 'bg-white/80 dark:bg-[#16423C] shadow-clay-pressed dark:shadow-clay-dark-pressed border border-[#14BBA6]/40 dark:border-teal-700/50 text-teal-950 dark:text-[#E6FFED] font-semibold'
                          : 'hover:bg-white/50 dark:hover:bg-white/5 text-[#1F2937] dark:text-[#E6FFED] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isActive
                              ? 'bg-[#14BBA6] dark:bg-[#2DD4BF] text-white dark:text-[#0E2A26] shadow-sm'
                              : 'bg-teal-100/70 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-200/50 dark:border-teal-800/40'
                          }`}
                        >
                          {profile.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs truncate">{profile.display_name}</div>
                          <div className="text-[10px] text-teal-900/70 dark:text-[#99F6E4]/70 mt-0.5 flex items-center gap-1.5">
                            <span>
                              {profile.completed_units} / {profile.total_units} units
                            </span>
                            <span className="opacity-50">•</span>
                            <span className="text-teal-700 dark:text-[#2DD4BF] font-semibold">{pct}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isActive ? (
                          <div className="w-5 h-5 rounded-full bg-[#14BBA6] dark:bg-[#2DD4BF] text-white dark:text-[#0E2A26] flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer: Create Profile Link */}
            <div className="border-t border-teal-900/10 dark:border-teal-900/30 mt-1 pt-1.5">
              <Link
                to="/onboarding"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-2xl text-xs font-semibold text-teal-700 dark:text-[#2DD4BF] hover:bg-teal-100/50 dark:hover:bg-teal-950/50 transition-colors duration-150"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New Learner Profile</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
