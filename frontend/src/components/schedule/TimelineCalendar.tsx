import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  RotateCcw,
  Flag,
  Search,
  RefreshCw,
  BookMarked,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import type { ScheduleEntryOut, TodayScheduleResponse, ExamCountdownItem } from '@/types';

type FilterTab = 'all' | 'planned' | 'overdue' | 'done' | 'review';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 24,
    },
  },
};

export function TimelineCalendar() {
  const { activeProfile } = useStudentProfiles();
  const [entries, setEntries] = useState<ScheduleEntryOut[]>([]);
  const [exams, setExams] = useState<ExamCountdownItem[]>([]);
  const [currentTodayIso, setCurrentTodayIso] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchScheduleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [schedRes, todayRes] = await Promise.all([
        apiClient.get<ScheduleEntryOut[]>('/schedule'),
        apiClient.get<TodayScheduleResponse>('/schedule/today').catch(() => null),
      ]);

      setEntries(schedRes.data);
      if (todayRes && todayRes.data) {
        setExams(todayRes.data.exam_countdowns || []);
        if (todayRes.data.date) {
          setCurrentTodayIso(String(todayRes.data.date));
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch schedule:', err);
      setError(err instanceof Error ? err.message : 'Could not fetch schedule entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<ScheduleEntryOut[]>('/schedule'),
      apiClient.get<TodayScheduleResponse>('/schedule/today').catch(() => null),
    ])
      .then(([schedRes, todayRes]) => {
        if (!cancelled) {
          setEntries(schedRes.data);
          if (todayRes && todayRes.data) {
            setExams(todayRes.data.exam_countdowns || []);
            if (todayRes.data.date) {
              setCurrentTodayIso(String(todayRes.data.date));
            }
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch schedule entries');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchScheduleData();
    };
    window.addEventListener('alpine:profile-switch', handleUpdate);
    window.addEventListener('alpine:dev-time-travel', handleUpdate);
    window.addEventListener('alpine:schedule-updated', handleUpdate);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleUpdate);
      window.removeEventListener('alpine:dev-time-travel', handleUpdate);
      window.removeEventListener('alpine:schedule-updated', handleUpdate);
    };
  }, [fetchScheduleData]);

  // Map of exam dates for milestone separators
  const examDateMap = useMemo(() => {
    const map = new Map<string, ExamCountdownItem[]>();
    for (const ex of exams) {
      const list = map.get(ex.exam_date) || [];
      list.push(ex);
      map.set(ex.exam_date, list);
    }
    return map;
  }, [exams]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Tab filter
      if (filterTab === 'planned' && (entry.status !== 'planned' || entry.is_overdue)) return false;
      if (filterTab === 'overdue' && !entry.is_overdue) return false;
      if (filterTab === 'done' && entry.status !== 'done') return false;
      if (filterTab === 'review' && !entry.is_review) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = entry.title.toLowerCase().includes(query);
        const topicMatch = entry.topic_name?.toLowerCase().includes(query);
        const subjMatch = entry.subject_name?.toLowerCase().includes(query);
        const modMatch = entry.module_name?.toLowerCase().includes(query);
        if (!titleMatch && !topicMatch && !subjMatch && !modMatch) return false;
      }

      return true;
    });
  }, [entries, filterTab, searchQuery]);

  // Earliest uncompleted task across schedule for visual focus
  const nextActionableId = useMemo(() => {
    return entries.find((e) => e.status !== 'done')?.id || null;
  }, [entries]);

  // Group by date (sorted ascending)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ScheduleEntryOut[]> = {};
    for (const entry of filteredEntries) {
      const d = entry.scheduled_date;
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(entry);
    }

    const sortedDates = Object.keys(groups).sort();
    return sortedDates.map((dateStr) => ({
      date: dateStr,
      items: groups[dateStr],
    }));
  }, [filteredEntries]);

  // Summary stats
  const totalUnits = entries.length;
  const completedCount = entries.filter((e) => e.status === 'done').length;
  const overdueCount = entries.filter((e) => e.is_overdue).length;
  const plannedCount = entries.filter((e) => e.status === 'planned' && !e.is_overdue).length;
  const reviewCount = entries.filter((e) => e.is_review).length;
  const totalHours = entries.reduce((acc, curr) => acc + (curr.est_hours || 1.0), 0);

  const todayIso = currentTodayIso;

  return (
    <div className="space-y-8">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Chronological Study Horizon</span>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">
            Schedule & Milestones
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Deterministic daily assignments generated by the CP-SAT solver, respecting university exam gateways.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchScheduleData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-soft border border-border shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover active:shadow-clay-pressed text-xs font-bold text-text-primary transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-4">
          <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
            Total Sched. Units
          </div>
          <div className="text-2xl font-black text-text-primary mt-1">
            {totalUnits}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            {totalHours.toFixed(1)} total study hours
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-4">
          <div className="text-[11px] font-bold text-status-fresh uppercase tracking-wider">
            Completed Units
          </div>
          <div className="text-2xl font-black text-status-fresh mt-1">
            {completedCount}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            {totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0}% syllabus done
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-4">
          <div className="text-[11px] font-bold text-primary uppercase tracking-wider">
            Upcoming Planned
          </div>
          <div className="text-2xl font-black text-text-primary mt-1">
            {plannedCount}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            {overdueCount > 0 ? `${overdueCount} overdue units` : 'Optimized for capacity'}
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill p-4">
          <div className="text-[11px] font-bold text-status-fading uppercase tracking-wider">
            Spaced Reviews
          </div>
          <div className="text-2xl font-black text-status-fading mt-1">
            {reviewCount}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            FSRS memory reinforcement
          </div>
        </div>
      </div>

      {/* Controls Bar: Tabs & Search */}
      <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'all', label: `All (${totalUnits})` },
              { id: 'planned', label: `Planned (${plannedCount})` },
              { id: 'overdue', label: `Overdue (${overdueCount})` },
              { id: 'done', label: `Completed (${completedCount})` },
              { id: 'review', label: `Reviews (${reviewCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                filterTab === tab.id
                  ? 'bg-primary text-canvas shadow-clay-pressed dark:shadow-clay-dark-pressed border border-primary font-black'
                  : 'bg-surface-soft text-text-secondary hover:text-text-primary shadow-clay-pill dark:shadow-clay-dark-pill border border-border/80 hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input - Recessed */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic or subject..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-surface-inset border border-border/80 shadow-clay-inset dark:shadow-clay-dark-inset text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && entries.length === 0 && (
        <div className="space-y-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-3xl bg-surface-soft border border-border shadow-clay-card dark:shadow-clay-dark-card"
            />
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-6 text-center text-rose-700 dark:text-rose-300">
          <p className="font-bold text-sm">Failed to load schedule feed</p>
          <p className="text-xs mt-1 text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && groupedByDate.length === 0 && (
        <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-12 text-center text-text-primary">
          <CalendarIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h3 className="text-base font-bold text-text-primary">No Schedule Items Found</h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No items matched your query "${searchQuery}". Try adjusting your filter.`
              : 'No study units are currently planned for this student profile.'}
          </p>
        </div>
      )}

      {/* Chronological Feed Grouped by Date with Staggered Motion */}
      {!loading && groupedByDate.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {groupedByDate.map(({ date: dateStr, items }) => {
            const isToday = dateStr === todayIso;
            const dayExams = examDateMap.get(dateStr) || [];

            const parsedDate = new Date(`${dateStr}T00:00:00`);
            const formattedDate = new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(parsedDate);

            const dayTotalHours = items.reduce((acc, curr) => acc + (curr.est_hours || 1.0), 0);
            const dayDoneCount = items.filter((it) => it.status === 'done').length;

            return (
              <motion.div key={dateStr} variants={rowVariants} className="space-y-3">
                {/* Exam Milestone Separator Banner */}
                {dayExams.length > 0 && (
                  <div className="my-4 rounded-3xl bg-surface-soft border border-border shadow-clay-card dark:shadow-clay-dark-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-text-primary">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary text-canvas flex items-center justify-center font-bold shadow-clay-pill dark:shadow-clay-dark-pill shrink-0">
                        <Flag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                            Assessment Milestone Gateway
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-status-milestone/15 text-status-milestone border border-status-milestone/30">
                            Milestone
                          </span>
                        </div>
                        <div className="text-sm font-bold text-text-primary mt-0.5">
                          {dayExams.map((e) => `${e.subject_name} (${e.exam_type})`).join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-text-secondary bg-surface px-3 py-1.5 rounded-xl border border-border self-start sm:self-auto shadow-clay-pill dark:shadow-clay-dark-pill">
                      Target Date: {dateStr}
                    </div>
                  </div>
                )}

                {/* Date Header Badge */}
                <div className="flex items-center justify-between pt-2 pb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold border shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-2 ${
                        isToday
                          ? 'bg-primary text-canvas border-primary font-black'
                          : 'bg-surface-soft text-text-primary border-border'
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                      {isToday && (
                        <span className="text-[10px] bg-canvas text-primary px-1.5 py-0.2 rounded-md uppercase font-extrabold">
                          Today
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-text-muted font-medium hidden sm:inline">
                      {items.length} {items.length === 1 ? 'task' : 'tasks'} • {dayTotalHours.toFixed(1)} hrs
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-text-secondary">
                    <span className="text-status-fresh font-bold">{dayDoneCount}</span> / {items.length} Done
                  </div>
                </div>

                {/* List of items in date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((item) => {
                    const isDone = item.status === 'done';
                    const isReview = item.is_review;
                    const hours = item.est_hours ?? 1.0;
                    const phase = item.assessment_phase || 'UT1';
                    const isNextActionable = item.id === nextActionableId;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                          isNextActionable
                            ? 'bg-surface-soft border-primary/50 ring-2 ring-primary/20 shadow-clay-card dark:shadow-clay-dark-card text-text-primary'
                            : isDone
                            ? 'bg-surface/30 border-border/40 opacity-60 hover:opacity-100 shadow-none text-text-muted'
                            : isReview
                            ? 'bg-surface border-status-fading/40 shadow-clay-pill dark:shadow-clay-dark-pill text-text-primary'
                            : 'bg-surface border-border/70 hover:bg-surface-hover/50 hover:border-border shadow-none text-text-primary'
                        }`}
                      >
                        <div>
                          {/* Subject and badges row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-bold text-text-secondary truncate max-w-[200px]">
                              {item.subject_name || 'Subject Task'}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Next Actionable Focus Pill */}
                              {isNextActionable && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-canvas uppercase tracking-wider shadow-sm animate-pulse">
                                  Next Up
                                </span>
                              )}

                              {/* UT Phase pill */}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  phase === 'UT2'
                                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                    : 'bg-surface-soft text-primary border-border'
                                }`}
                              >
                                {phase}
                              </span>

                              {/* Review Tag */}
                              {isReview && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-fading/15 text-status-fading border border-status-fading/30 flex items-center gap-1">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  Review
                                </span>
                              )}

                              {/* Overrun Past Exam Tag */}
                              {item.is_overrun && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                                  <Flag className="w-2.5 h-2.5" />
                                  Past End-Sem
                                </span>
                              )}

                              {/* Status Tag */}
                              {isDone ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-fresh/15 text-status-fresh border border-status-fresh/30 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Done
                                </span>
                              ) : item.is_overdue ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  Overdue
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-soft text-text-muted border border-border">
                                  Planned
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Topic Name */}
                          <div className={`text-sm font-bold leading-snug break-words ${isDone ? 'line-through text-text-muted opacity-75' : 'text-text-primary'}`}>
                            {item.topic_name || item.title}
                          </div>

                          {/* Subtopic if distinct */}
                          {item.subtopic_name && item.subtopic_name !== (item.topic_name || item.title) && (
                            <div className="text-[11px] text-text-secondary mt-1">
                              Unit: {item.subtopic_name}
                            </div>
                          )}

                          {/* Module name */}
                          {item.module_name && (
                            <div className="text-[11px] text-text-muted mt-1 flex items-center gap-1">
                              <BookMarked className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.module_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom stats */}
                        <div className="flex items-center justify-between text-[11px] text-text-muted mt-3 pt-2 border-t border-border">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-primary" />
                            {hours} {hours === 1 ? 'hour' : 'hours'}
                          </span>

                          <span className="font-semibold text-text-muted">
                            Diff: {item.est_difficulty ?? 3}/5
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
