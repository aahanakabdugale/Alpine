import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Calendar,
  RotateCcw,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import type { DevStatusResponse } from '@/types';

const PRESETS = [
  { label: 'Jul 15 (Start)', date: '2026-07-15', desc: 'Semester kickoff & balanced baseline' },
  { label: 'Aug 20 (UT1 Eve)', date: '2026-08-20', desc: 'UT1 exam sprint prep' },
  { label: 'Sep 20 (Decay Phase)', date: '2026-09-20', desc: 'Post-UT1 spaced repetition reviews' },
  { label: 'Oct 10 (UT2 Prep)', date: '2026-10-10', desc: 'UT2 exam threshold' },
  { label: 'Nov 02 (End-Sem Crunch)', date: '2026-11-02', desc: 'End semester soft-slack triage' },
];

export function DevToolsDock() {
  const { activeProfile } = useStudentProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<DevStatusResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-07-15');
  const [autoComplete, setAutoComplete] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiClient.get<DevStatusResponse>('/dev/status');
      setStatus(res.data);
      if (res.data.simulated_date) {
        setSelectedDate(res.data.simulated_date);
      }
    } catch {
      // Backend may be reloading
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [fetchStatus, activeProfile?.id]);

  const notifyStateChange = () => {
    window.dispatchEvent(new CustomEvent('alpine:dev-time-travel'));
    fetchStatus();
  };

  const handleTimeTravel = async (targetDate: string, autoComp: boolean = autoComplete) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/dev/time-travel', {
        target_date: targetDate,
        auto_complete: autoComp,
      });
      toast.success('Simulated date updated', {
        description: `Set to ${targetDate}. ${res.data.auto_completed_units || 0} units auto-completed.`,
      });
      notifyStateChange();
    } catch (err: unknown) {
      toast.error('Time travel failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipDays = async (days: number) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/dev/skip-days', {
        days,
        auto_complete: autoComplete,
      });
      toast.success(`Skipped forward +${days} days`, {
        description: `Now at ${res.data.simulated_date}. ${res.data.auto_completed_units || 0} units achieved.`,
      });
      notifyStateChange();
    } catch (err: unknown) {
      toast.error('Skip failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSlacking = async (days: number = 14) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/dev/simulate-slacking', { days });
      toast.warning(`Simulated ${days} Days of Neglect`, {
        description: `Student skipped studying. Alpine adaptive solver replanned ${res.data.recalculated_units || 0} units!`,
      });
      notifyStateChange();
    } catch (err: unknown) {
      toast.error('Simulation failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSemester = async () => {
    if (!window.confirm('Reset this student profile back to July 15 baseline? All check-ins will be cleared.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/dev/reset-semester', {
        start_date: '2026-07-15',
      });
      toast.info('Semester Reset to Baseline', {
        description: `Study plan reset to July 15, 2026. ${res.data.baseline_units_scheduled} units scheduled.`,
      });
      notifyStateChange();
    } catch (err: unknown) {
      toast.error('Reset failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRealClock = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/dev/restore-real-clock');
      toast.success('Restored Real Clock', {
        description: `System clock reverted to ${res.data.current_date}.`,
      });
      notifyStateChange();
    } catch (err: unknown) {
      toast.error('Restore failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const displayDate = status?.simulated_date || '2026-07-15';
  const isOverrun = (status?.overrun_units_count || 0) > 0;

  return (
    <div className="fixed bottom-4 right-4 sm:right-6 z-50 flex flex-col items-end">
      {/* Expanded Control Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="mb-3 w-[calc(100vw-2rem)] sm:w-[480px] rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-5 backdrop-blur-xl text-text-primary space-y-4"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-canvas flex items-center justify-center shadow-sm">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                      Alpine Demonstration DevTools
                    </span>
                    {status?.is_simulated && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-primary/20 text-primary border border-primary/30">
                        Simulated
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Learner: <span className="font-bold text-text-primary">{status?.student_name || 'Active'}</span>
                    {' • '}
                    {status?.completed_units || 0}/{status?.total_units || 0} Units Done
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-soft text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                aria-label="Close DevTools"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Overrun Warning Alert if applicable */}
            {isOverrun && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                <span className="font-medium leading-tight">
                  <strong className="font-bold">{status?.overrun_units_count} units</strong> scheduled past End-Sem exam! Soft-slack triage active.
                </span>
              </div>
            )}

            {/* Section 1: Quick Semester Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-text-muted">
                <span>Semester Milestones</span>
                <span className="text-[10px] text-primary lowercase font-medium">click to jump</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const isActive = displayDate === p.date;
                  return (
                    <button
                      key={p.date}
                      type="button"
                      disabled={loading}
                      onClick={() => handleTimeTravel(p.date)}
                      className={`px-2.5 py-2 rounded-2xl text-left border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-canvas border-primary shadow-sm font-bold'
                          : 'bg-surface-soft hover:bg-surface-hover border-border text-text-primary hover:border-border/80'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{p.label}</div>
                      <div className={`text-[10px] ${isActive ? 'text-canvas/80' : 'text-text-muted'} truncate`}>
                        {p.date}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Custom Date Picker */}
            <div className="space-y-1.5">
              <label htmlFor="dev-date-input" className="text-[11px] font-black uppercase tracking-wider text-text-muted block">
                Jump to Custom Date
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="dev-date-input"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-2xl bg-surface-soft border border-border text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTimeTravel(selectedDate)}
                  className="h-10 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-canvas text-xs font-bold shadow-clay-pill dark:shadow-clay-dark-pill transition-all cursor-pointer shrink-0"
                >
                  Set Date
                </button>
              </div>
            </div>

            {/* Section 3: Skip Days & Auto-Complete Checkbox */}
            <div className="p-3.5 rounded-2xl bg-surface-soft border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-text-primary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoComplete}
                    onChange={(e) => setAutoComplete(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                  />
                  <span>Auto-Complete Skipped Days (FSRS Recall)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-text-muted shrink-0">Fast Forward:</span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSkipDays(1)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-primary text-center transition-all cursor-pointer shadow-sm"
                >
                  +1 Day
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSkipDays(7)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-primary text-center transition-all cursor-pointer shadow-sm"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSkipDays(14)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text-primary text-center transition-all cursor-pointer shadow-sm"
                >
                  +14 Days
                </button>
              </div>
            </div>

            {/* Section 4: Live Scenario Triggers */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block">
                Demonstration Crisis & Recovery Scenarios
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSimulateSlacking(14)}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer text-left"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Simulate 2-Week Slack</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResetSemester}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-surface-soft hover:bg-surface-hover border border-border text-text-primary text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Reset to Semester Start</span>
                </button>
              </div>
            </div>

            {/* Footer: Restore Host Real Clock */}
            <div className="flex items-center justify-between pt-2 border-t border-border/70 text-[11px]">
              <span className="text-text-muted">
                Host Date: {status?.real_date || '2026-10-11'}
              </span>
              {status?.is_simulated && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRestoreRealClock}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Restore Real Clock
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Pill Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-3 px-4 py-2.5 rounded-full border shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover transition-all duration-200 cursor-pointer ${
          status?.is_simulated
            ? 'bg-primary text-canvas border-primary font-bold'
            : 'bg-surface text-text-primary border-border hover:border-primary/50'
        }`}
        aria-label="Toggle DevTools dock"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 group-hover:rotate-45 transition-transform duration-200" />
          <span className="text-xs font-extrabold uppercase tracking-wider">
            DevTools
          </span>
        </div>

        <div className="h-4 w-px bg-current opacity-30" />

        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Calendar className="w-3.5 h-3.5 opacity-80" />
          <span>{displayDate}</span>
        </div>

        {isOverrun && (
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
        )}

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 opacity-80" />
        )}
      </button>
    </div>
  );
}
