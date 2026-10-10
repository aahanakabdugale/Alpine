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
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import type { ScheduleEntryOut, TodayScheduleResponse, ExamCountdownItem } from '@/types';

type FilterTab = 'all' | 'planned' | 'done' | 'review';

export function TimelineCalendar() {
  const { activeProfile } = useStudentProfiles();
  const [entries, setEntries] = useState<ScheduleEntryOut[]>([]);
  const [exams, setExams] = useState<ExamCountdownItem[]>([]);
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
    const handleProfileSwitch = () => {
      fetchScheduleData();
    };
    window.addEventListener('alpine:profile-switch', handleProfileSwitch);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleProfileSwitch);
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
      if (filterTab === 'planned' && entry.status !== 'planned') return false;
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
  const plannedCount = entries.filter((e) => e.status === 'planned').length;
  const reviewCount = entries.filter((e) => e.is_review).length;
  const totalHours = entries.reduce((acc, curr) => acc + (curr.est_hours || 1.0), 0);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Chronological Study Horizon</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Schedule & Milestones
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Deterministic daily assignments generated by the CP-SAT solver, respecting university exam gateways.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchScheduleData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#f0f4f9] border border-white/80 shadow-clay-pill hover:shadow-clay-hover active:shadow-clay-pressed text-xs font-bold text-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Sched. Units
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalUnits}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalHours.toFixed(1)} total study hours
          </div>
        </div>

        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-4">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Completed Units
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {completedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0}% syllabus done
          </div>
        </div>

        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-4">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
            Upcoming Planned
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {plannedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Optimized for capacity
          </div>
        </div>

        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-4">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Spaced Reviews
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {reviewCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            FSRS memory reinforcement
          </div>
        </div>
      </div>

      {/* Controls Bar: Tabs & Search */}
      <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'all', label: `All (${totalUnits})` },
              { id: 'planned', label: `Planned (${plannedCount})` },
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
                  ? 'bg-indigo-600 text-white shadow-clay-pressed border border-indigo-700'
                  : 'bg-white/70 text-slate-700 shadow-clay-pill border border-white/90 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic or subject..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white/80 border border-white/90 shadow-clay-pressed text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && entries.length === 0 && (
        <div className="space-y-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-3xl bg-slate-200/60 border border-white/60 shadow-clay-card"
            />
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-3xl bg-rose-50 border border-rose-200 p-6 text-center text-rose-700">
          <p className="font-bold text-sm">Failed to load schedule feed</p>
          <p className="text-xs mt-1 text-rose-600">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && groupedByDate.length === 0 && (
        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Schedule Items Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No items matched your query "${searchQuery}". Try adjusting your filter.`
              : 'No study units are currently planned for this student profile.'}
          </p>
        </div>
      )}

      {/* Chronological Feed Grouped by Date */}
      {!loading && groupedByDate.length > 0 && (
        <div className="space-y-8">
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
              <div key={dateStr} className="space-y-3">
                {/* Exam Milestone Separator Banner */}
                {dayExams.length > 0 && (
                  <div className="my-4 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-clay-card">
                    <div className="bg-[#f0f4f9] rounded-[22px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-clay-pill">
                          <Flag className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                              Assessment Milestone Gateway
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700">
                              Milestone
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">
                            {dayExams.map((e) => `${e.subject_name} (${e.exam_type})`).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 self-start sm:self-auto">
                        Target Date: {dateStr}
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Header Badge */}
                <div className="flex items-center justify-between pt-2 pb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold border shadow-clay-pill flex items-center gap-2 ${
                        isToday
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white/80 text-slate-800 border-white/90'
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                      {isToday && (
                        <span className="text-[10px] bg-white text-indigo-700 px-1.5 py-0.2 rounded-md uppercase font-extrabold">
                          Today
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      {items.length} {items.length === 1 ? 'task' : 'tasks'} • {dayTotalHours.toFixed(1)} hrs
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    <span className="text-emerald-600 font-bold">{dayDoneCount}</span> / {items.length} Done
                  </div>
                </div>

                {/* List of items in date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {items.map((item) => {
                    const isDone = item.status === 'done';
                    const isReview = item.is_review;
                    const hours = item.est_hours ?? 1.0;
                    const phase = item.assessment_phase || 'UT1';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                          isDone
                            ? 'bg-emerald-50/50 border-emerald-200/70 shadow-clay-pill'
                            : isReview
                            ? 'bg-amber-50/50 border-amber-200/70 shadow-clay-pill hover:shadow-clay-hover'
                            : 'bg-[#f0f4f9] border-white/90 shadow-clay-card hover:shadow-clay-hover'
                        }`}
                      >
                        <div>
                          {/* Subject and badges row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">
                              {item.subject_name || 'Subject Task'}
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  phase === 'UT2'
                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                    : 'bg-blue-100 text-blue-700 border-blue-200'
                                }`}
                              >
                                {phase}
                              </span>

                              {isReview && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  Review
                                </span>
                              )}

                              {isDone ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Done
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  Planned
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Topic Name */}
                          <div className="text-sm font-bold text-slate-900 leading-snug">
                            {item.topic_name || item.title}
                          </div>

                          {/* Subtopic if distinct */}
                          {item.subtopic_name && item.subtopic_name !== (item.topic_name || item.title) && (
                            <div className="text-[11px] text-slate-500 mt-1">
                              Unit: {item.subtopic_name}
                            </div>
                          )}

                          {/* Module name */}
                          {item.module_name && (
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <BookMarked className="w-3 h-3" />
                              <span className="truncate">{item.module_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Bottom stats */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200/50">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {hours} {hours === 1 ? 'hour' : 'hours'}
                          </span>

                          <span className="font-semibold text-slate-400">
                            Diff: {item.est_difficulty ?? 3}/5
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
