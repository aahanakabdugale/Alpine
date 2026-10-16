import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Check, UserPlus, Sparkles, Compass, User, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';

interface PersonaMeta {
  shortName: string;
  badge: string;
  desc: string;
  badgeClass: string;
}

const DEMO_PERSONAS: Record<string, PersonaMeta> = {
  'demo-alex': {
    shortName: 'Alex',
    badge: 'Diligent Strong',
    desc: 'Consistent 3-4h daily • Ahead of syllabus schedule',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  'demo-maya': {
    shortName: 'Maya',
    badge: 'Steady Average',
    desc: 'Balanced 2h daily • On-track for exams',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  'demo-sam': {
    shortName: 'Sam',
    badge: 'Crammer',
    desc: 'Backloaded sprint • Triggers Academic Triage alert',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
};

export function ProfileSwitcher() {
  const navigate = useNavigate();
  const { profiles, activeProfile, setActiveProfileId, loading, refreshProfiles } = useStudentProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const demoProfiles = profiles.filter((p) => p.id.startsWith('demo-'));
  const customProfiles = profiles.filter((p) => !p.id.startsWith('demo-'));

  const isCurrentDemo = activeProfile?.id.startsWith('demo-');
  const currentDemoMeta = activeProfile ? DEMO_PERSONAS[activeProfile.id] : null;

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
        setFocusedIndex((prev) => (prev + 1 >= profiles.length ? 0 : prev + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 < 0 ? profiles.length - 1 : prev - 1));
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

  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    setIsOpen(false);
    triggerRef.current?.focus();
    if (window.location.pathname === '/onboarding') {
      navigate('/dashboard');
    }
  };

  const handleSelectNewProfile = () => {
    setActiveProfileId(null);
    setIsOpen(false);
    navigate('/onboarding');
  };

  const handleDeleteProfile = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Are you sure you want to delete profile "${name}"?\nAll associated schedule entries, availability, and mastery ratings will be permanently removed from SQLite.`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/students/${id}`);
      toast.success(`Profile "${name}" deleted`);
      if (activeProfile?.id === id) {
        const fallback = demoProfiles[0] || profiles.find((p) => p.id !== id);
        if (fallback) {
          setActiveProfileId(fallback.id);
        }
      }
      refreshProfiles();
    } catch (err: unknown) {
      toast.error('Failed to delete profile', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="relative inline-flex items-center shrink-0" ref={dropdownRef}>
      {/* 1. Unified Split Button: "New Profile" by default OR Active Profile + Side Dropdown (down arrow head) */}
      <div
        className={`inline-flex items-center h-10 rounded-2xl transition-all duration-200 shrink-0 ${
          activeProfile
            ? 'bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover'
            : 'bg-primary text-canvas shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover'
        }`}
      >
        {/* Left Action Button: "New Profile" (Default) or Active Profile */}
        {activeProfile ? (
          <Link
            to="/dashboard"
            id="nav-create-profile-btn"
            className="flex items-center gap-2 h-full pl-3 pr-2 sm:pr-2.5 rounded-l-2xl text-xs font-bold text-text-primary hover:bg-surface-hover/70 transition-colors cursor-pointer"
            title={`Active profile: ${activeProfile.display_name}. Click to view dashboard.`}
          >
            <div className="w-6 h-6 rounded-full bg-primary text-canvas flex items-center justify-center font-bold text-[11px] shadow-inner shrink-0">
              {activeProfile.display_name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[100px] sm:max-w-[130px]">
              {currentDemoMeta ? `Demo: ${currentDemoMeta.shortName}` : activeProfile.display_name}
            </span>
            {isCurrentDemo && (
              <span className="hidden md:inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-surface-soft border border-border text-text-secondary">
                Demo
              </span>
            )}
          </Link>
        ) : (
          <Link
            to="/onboarding"
            id="nav-create-profile-btn"
            className="flex items-center gap-1.5 sm:gap-2 h-full px-3.5 sm:px-4 rounded-l-2xl font-extrabold text-xs hover:bg-primary-hover active:scale-[0.98] transition-all duration-150 cursor-pointer text-canvas"
            title="Create a new learner profile via onboarding wizard (Default)"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            <span className="tracking-tight">New Profile</span>
          </Link>
        )}

        {/* Vertical Divider */}
        <div
          className={`w-[1px] h-5 shrink-0 ${
            activeProfile ? 'bg-border/80' : 'bg-canvas/30'
          }`}
        />

        {/* Right Action: Side Dropdown Trigger (Down Arrow Head) */}
        <button
          ref={triggerRef}
          type="button"
          id="demo-profile-dropdown-btn"
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center justify-center h-full px-2.5 rounded-r-2xl transition-all cursor-pointer focus:outline-none focus-visible:ring-2 ${
            activeProfile
              ? 'text-text-muted hover:text-text-primary hover:bg-surface-hover/70 focus-visible:ring-primary'
              : 'text-canvas/90 hover:text-canvas hover:bg-primary-hover focus-visible:ring-canvas'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Load demo profile data dropdown"
          title="Load profile data from alpine.db (Alex, Maya, Sam)"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* 2. Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="Learner profiles"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[min(32rem,calc(100vh-5rem))] flex flex-col rounded-3xl bg-surface border border-border shadow-clay-popover dark:shadow-clay-dark-popover z-50 overflow-hidden backdrop-blur-md"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            {/* Header */}
            <div
              className="shrink-0 px-4 py-3.5 border-b border-border bg-surface"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                    Profile Data & Personas
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  alpine.db
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                Load preset demo personas already in database or start fresh.
              </p>
            </div>

            {/* Default Primary Action: New Profile Option */}
            <div
              className="p-2 border-b border-border/60 bg-surface shrink-0"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <button
                type="button"
                onClick={handleSelectNewProfile}
                className={`w-full p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer ${
                  !activeProfile
                    ? 'bg-primary/10 border border-primary/40 text-primary font-black shadow-sm'
                    : 'bg-surface hover:bg-surface-hover/80 border border-transparent hover:border-border/60 text-text-primary font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      !activeProfile
                        ? 'bg-primary text-canvas shadow-sm'
                        : 'bg-surface-soft border border-border text-primary'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold">New Learner Profile (Default)</div>
                    <div className="text-[10px] text-text-muted">Start fresh with Onboarding Wizard</div>
                  </div>
                </div>
                {!activeProfile && (
                  <div className="w-5 h-5 rounded-full bg-primary text-canvas flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {/* Scrollable Profile List */}
            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 space-y-3 scrollbar-thin scrollbar-thumb-sky-500/20 scrollbar-track-transparent"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              {/* Section 1: Demo Personas (Already in alpine.db) */}
              <div>
                <div className="px-2 pb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span>Load Demo Profiles (In Database)</span>
                </div>
                <div className="space-y-1.5">
                  {demoProfiles.map((profile) => {
                    const isActive = profile.id === activeProfile?.id;
                    const meta = DEMO_PERSONAS[profile.id] || {
                      shortName: profile.display_name,
                      badge: 'Demo',
                      desc: 'Preset test persona in alpine.db',
                      badgeClass: 'bg-primary/10 text-primary border-primary/20',
                    };

                    return (
                      <button
                        key={profile.id}
                        data-profile-btn
                        type="button"
                        role="menuitem"
                        tabIndex={0}
                        onClick={() => handleSelectProfile(profile.id)}
                        className={`w-full text-left p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                          isActive
                            ? 'bg-surface-soft shadow-clay-pressed dark:shadow-clay-dark-pressed border border-primary/50 text-text-primary'
                            : 'bg-surface hover:bg-surface-hover/70 border border-transparent hover:border-border/60 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {/* Left: Avatar initial box */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isActive
                              ? 'bg-primary text-canvas shadow-sm'
                              : 'bg-surface-soft text-text-secondary border border-border'
                          }`}
                        >
                          {meta.shortName.charAt(0).toUpperCase()}
                        </div>

                        {/* Center: Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary">
                              {meta.shortName}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full border ${meta.badgeClass}`}
                            >
                              {meta.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted truncate mt-0.5">
                            {meta.desc}
                          </p>
                        </div>

                        {/* Right: Radio/Check Indicator */}
                        <div className="shrink-0 flex items-center">
                          {isActive ? (
                            <div className="w-5 h-5 rounded-full bg-primary text-canvas flex items-center justify-center shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-border/80" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Custom Profiles (if any created) */}
              {customProfiles.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="px-2 pb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-text-muted">
                    <User className="w-3 h-3 text-text-muted" />
                    <span>Your Custom Profiles</span>
                  </div>
                  <div className="space-y-1.5">
                    {customProfiles.map((profile) => {
                      const isActive = profile.id === activeProfile?.id;

                      return (
                        <div
                          key={profile.id}
                          className="flex items-center gap-1.5 group/custom"
                        >
                          <button
                            data-profile-btn
                            type="button"
                            role="menuitem"
                            tabIndex={0}
                            onClick={() => handleSelectProfile(profile.id)}
                            className={`flex-1 text-left p-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                              isActive
                                ? 'bg-surface-soft shadow-clay-pressed dark:shadow-clay-dark-pressed border border-primary/50 text-text-primary'
                                : 'bg-surface hover:bg-surface-hover/70 border border-transparent hover:border-border/60 text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                isActive
                                  ? 'bg-primary text-canvas shadow-sm'
                                  : 'bg-surface-soft text-text-secondary border border-border'
                              }`}
                            >
                              {profile.display_name.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-text-primary block truncate">
                                {profile.display_name}
                              </span>
                              <span className="text-[10px] text-text-muted block">
                                Custom Learner Profile
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center">
                              {isActive ? (
                                <div className="w-5 h-5 rounded-full bg-primary text-canvas flex items-center justify-center shadow-sm">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-border/80" />
                              )}
                            </div>
                          </button>

                          {/* Delete Custom Profile Action */}
                          <button
                            type="button"
                            title={`Delete profile "${profile.display_name}"`}
                            onClick={(e) => handleDeleteProfile(profile.id, profile.display_name, e)}
                            className="p-2.5 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer shrink-0 opacity-70 hover:opacity-100"
                            aria-label={`Delete ${profile.display_name}`}
                          >
                            <Trash2 className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action: Direct Onboarding Link */}
            <div
              className="shrink-0 p-3 border-t border-border bg-surface"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleSelectNewProfile}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-2xl bg-surface-soft hover:bg-surface-hover border border-border text-xs font-bold text-text-primary hover:text-primary shadow-clay-pill dark:shadow-clay-dark-pill transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-primary shrink-0" />
                <span>+ Create Another Profile</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
