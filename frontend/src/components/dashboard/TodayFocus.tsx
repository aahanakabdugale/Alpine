import { useState, useEffect, useCallback } from 'react';
import { Calendar, Target, Clock, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { ClayStudyCard } from '@/components/dashboard/ClayStudyCard';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import type { TodayScheduleResponse } from '@/types';

export function TodayFocus() {
  const { activeProfile } = useStudentProfiles();
  const [data, setData] = useState<TodayScheduleResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaySchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<TodayScheduleResponse>('/schedule/today');
      setData(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch today schedule:', err);
      setError(err instanceof Error ? err.message : 'Could not fetch today’s focus items');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when mounted or active student changes
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<TodayScheduleResponse>('/schedule/today')
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch today’s focus items');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  // Listen to profile switch custom event
  useEffect(() => {
    const handleProfileSwitch = () => {
      fetchTodaySchedule();
    };
    window.addEventListener('alpine:profile-switch', handleProfileSwitch);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleProfileSwitch);
    };
  }, [fetchTodaySchedule]);

  const handleCheckInSuccess = () => {
    fetchTodaySchedule();
  };

  const tasks = data?.tasks || [];
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayFormatted}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Today's Focus
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Adaptive study queue for{' '}
            <span className="font-semibold text-slate-900">
              {activeProfile?.display_name || 'Active Learner'}
            </span>
            . Rate your recall confidence after reviewing to dynamically adjust your schedule.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTodaySchedule}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#f0f4f9] border border-white/80 shadow-clay-pill hover:shadow-clay-hover active:shadow-clay-pressed text-xs font-bold text-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh Plan</span>
        </button>
      </div>

      {/* Daily Metrics & Capacity Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Planned Hours */}
        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Planned Study
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {data ? `${data.scheduled_hours.toFixed(1)} hrs` : '0.0 hrs'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Calculated by CP-SAT solver
            </div>
          </div>
        </div>

        {/* Available Capacity */}
        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 shadow-inner">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Daily Target / Budget
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {data ? `${data.available_hours.toFixed(1)} hrs` : '0.0 hrs'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Weekly availability capacity
            </div>
          </div>
        </div>

        {/* Task Completion Progress */}
        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tasks Completed
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5 flex items-baseline gap-2">
              <span>{completedTasks} / {totalTasks}</span>
              <span className="text-xs font-bold text-emerald-600">({progressPct}%)</span>
            </div>
            <div className="w-full bg-slate-200/80 h-2 rounded-full mt-2 overflow-hidden shadow-inner">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exam Countdown Badges Section */}
      {data && data.exam_countdowns.length > 0 && (
        <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Upcoming Exam Milestones & Deadlines
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.exam_countdowns.map((exam) => {
              const isUrgent = exam.days_remaining <= 7;
              const isMedium = exam.days_remaining <= 14;

              return (
                <div
                  key={`${exam.subject_id}-${exam.exam_type}`}
                  className="rounded-2xl bg-white/70 border border-white/90 shadow-clay-pill p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {exam.subject_name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-indigo-700 uppercase">
                        {exam.exam_type}
                      </span>
                      <span>•</span>
                      <span>{exam.exam_date}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-black shadow-inner ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : isMedium
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {exam.days_remaining === 0 ? 'Today!' : `${exam.days_remaining}d left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Assigned Study Units for Today
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target units generated by Alpine's CP-SAT solver respecting prerequisite DAG constraints.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 shadow-clay-pill">
            {tasks.length} {tasks.length === 1 ? 'Unit' : 'Units'}
          </span>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 rounded-3xl bg-slate-200/60 border border-white/60 shadow-clay-card"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-3xl bg-rose-50 border border-rose-200 p-6 text-center text-rose-700">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <h3 className="font-bold text-sm">Failed to Load Today's Focus</h3>
            <p className="text-xs mt-1 text-rose-600">{error}</p>
            <button
              type="button"
              onClick={fetchTodaySchedule}
              className="mt-4 px-4 py-2 rounded-2xl bg-white shadow-clay-pill text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty Tasks State */}
        {!loading && !error && tasks.length === 0 && (
          <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-clay-pill">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No Study Tasks Scheduled Today!
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              You are completely up to date with your syllabus milestones, or this is a scheduled rest day according to your weekly availability matrix.
            </p>
          </div>
        )}

        {/* Tasks Grid */}
        {!loading && tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <ClayStudyCard
                key={task.id}
                task={task}
                onCheckInSuccess={handleCheckInSuccess}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
