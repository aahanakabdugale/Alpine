import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ChevronDown, Check, UserPlus, Sparkles, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';

export function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfileId, loading } = useStudentProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Close on outside click or keyboard navigation
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev + 1 >= profiles.length ? 0 : prev + 1;
          return next;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev - 1 < 0 ? profiles.length - 1 : prev - 1;
          return next;
        });
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
  }, [isOpen, profiles.length]);

  // When focusedIndex changes, focus that button
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const buttons = listRef.current.querySelectorAll<HTMLButtonElement>('button[data-profile-btn]');
      if (buttons[focusedIndex]) {
        buttons[focusedIndex].focus();
      }
    }
  }, [focusedIndex, isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      const activeIdx = profiles.findIndex((p) => p.id === activeProfile?.id);
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  const progressPercent = activeProfile && activeProfile.total_units > 0
    ? Math.round((activeProfile.completed_units / activeProfile.total_units) * 100)
    : 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="group flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-surface-soft border border-border shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover active:shadow-clay-pressed dark:active:shadow-clay-dark-pressed transition-all duration-200 text-text-primary text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#143B35]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Learner profile menu"
      >
        <div className="w-8 h-8 rounded-xl bg-primary text-canvas flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
          {activeProfile?.display_name ? (
            activeProfile.display_name.charAt(0).toUpperCase()
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-text-primary leading-tight truncate max-w-[140px]">
            {activeProfile?.display_name || (loading ? 'Loading...' : 'Select Learner')}
          </div>
          <div className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-primary font-bold">
              {activeProfile ? `${activeProfile.completed_units}/${activeProfile.total_units}` : '0/0'}
            </span>
            <span>units</span>
            {activeProfile && activeProfile.total_units > 0 && (
              <span className="opacity-70">• {progressPercent}%</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : 'group-hover:text-text-primary'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="Learner profiles"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-88 max-w-[calc(100vw-1.5rem)] max-h-[min(28rem,calc(100vh-5rem))] flex flex-col rounded-3xl bg-surface border border-border shadow-clay-popover dark:shadow-clay-dark-popover z-50 overflow-hidden"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            {/* 1. Stationary Header */}
            <div
              className="shrink-0 px-4 py-3.5 border-b border-border bg-surface"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5 min-w-0">
                  <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">Learner Profiles</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-soft text-text-secondary border border-border shrink-0">
                  Local SQLite
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                Switch student persona to view tailored schedules.
              </p>
            </div>

            {/* 2. Independently Scrollable Profile List */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-1.5"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              {profiles.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-text-muted font-medium">
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
                      data-profile-btn
                      type="button"
                      role="menuitem"
                      tabIndex={0}
                      onClick={() => {
                        setActiveProfileId(profile.id);
                        setIsOpen(false);
                        triggerRef.current?.focus();
                      }}
                      className={`w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-[#143B35] ${
                        isActive
                          ? 'bg-surface-soft shadow-clay-pressed dark:shadow-clay-dark-pressed border border-primary/50 text-text-primary'
                          : 'bg-surface hover:bg-surface-hover/70 border border-transparent hover:border-border/60 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          isActive
                            ? 'bg-primary text-canvas shadow-sm'
                            : 'bg-surface-soft text-text-secondary border border-border'
                        }`}
                      >
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Learner Info & Micro Progress */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-text-primary truncate">
                            {profile.display_name}
                          </span>
                          <span className="font-mono text-[11px] font-black text-primary shrink-0">
                            {pct}%
                          </span>
                        </div>

                        {/* Micro Progress Bar */}
                        <div className="w-full bg-surface-inset h-1.5 rounded-full overflow-hidden mt-1 shadow-clay-inset dark:shadow-clay-dark-inset">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="text-[10px] text-text-muted mt-0.5">
                          {profile.completed_units} of {profile.total_units} units completed
                        </div>
                      </div>

                      {/* Selection Check Indicator */}
                      <div className="shrink-0 flex items-center pl-0.5">
                        {isActive ? (
                          <div className="w-5 h-5 rounded-full bg-primary text-canvas flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-border/80" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* 3. Stationary Footer: Create Profile Link */}
            <div
              className="shrink-0 p-3 border-t border-border bg-surface"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <Link
                to="/onboarding"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-2xl bg-surface-soft hover:bg-surface-hover border border-border text-xs font-bold text-text-primary hover:text-primary shadow-clay-pill dark:shadow-clay-dark-pill transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserPlus className="w-4 h-4 text-primary shrink-0" />
                <span>Create New Learner Profile</span>
                <Sparkles className="w-3.5 h-3.5 text-status-fading shrink-0" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
