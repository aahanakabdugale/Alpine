import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ChevronDown, Check, UserPlus, Sparkles, GraduationCap } from 'lucide-react';
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
        className="group flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#f0f4f9] border border-white/80 shadow-clay-pill hover:shadow-clay-hover active:shadow-clay-pressed transition-all duration-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
          {activeProfile?.display_name ? (
            activeProfile.display_name.charAt(0).toUpperCase()
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>

        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
            {activeProfile?.display_name || (loading ? 'Loading...' : 'Select Learner')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-indigo-600 font-semibold">
              {activeProfile ? `${activeProfile.completed_units}/${activeProfile.total_units}` : '0/0'}
            </span>
            <span>units</span>
            {activeProfile && activeProfile.total_units > 0 && (
              <span className="text-slate-400">• {progressPercent}%</span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : 'group-hover:text-slate-600'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2.5 w-72 rounded-3xl bg-[#f0f4f9] border border-white/90 shadow-clay-card p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-sm"
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-slate-200/60 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                Learner Profiles
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Local SQLite
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Switch student persona to view tailored schedules.
            </p>
          </div>

          {/* Profile List */}
          <div className="max-h-64 overflow-y-auto space-y-1 py-1 pr-0.5">
            {profiles.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
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
                        ? 'bg-white/80 shadow-clay-pressed border border-indigo-200/80 text-indigo-950 font-semibold'
                        : 'hover:bg-white/50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs truncate">{profile.display_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>
                            {profile.completed_units} / {profile.total_units} units
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-indigo-600 font-semibold">{pct}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
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
          <div className="border-t border-slate-200/60 mt-1 pt-1.5">
            <Link
              to="/onboarding"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-2xl text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/70 transition-colors duration-150"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New Learner Profile</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

