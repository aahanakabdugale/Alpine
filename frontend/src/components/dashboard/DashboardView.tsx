import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { AcademicTriageBanner } from '@/components/dashboard/AcademicTriageBanner';
import { DailyProgressCard } from '@/components/dashboard/DailyProgressCard';
import { TodayFocusCard } from '@/components/dashboard/TodayFocusCard';
import { WeeklyBarChart, type DayStudyStat } from '@/components/dashboard/WeeklyBarChart';
import { UpNextTimeline } from '@/components/dashboard/UpNextTimeline';
import { MemoryHealthBar } from '@/components/dashboard/MemoryHealthBar';
import type { TodayScheduleResponse, ScheduleEntryOut } from '@/types';

export function DashboardView() {
  const { activeProfile } = useStudentProfiles();
  const [todayData, setTodayData] = useState<TodayScheduleResponse | null>(null);
  const [allEntries, setAllEntries] = useState<ScheduleEntryOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayRes, allSchedRes] = await Promise.all([
        apiClient.get<TodayScheduleResponse>('/schedule/today'),
        apiClient.get<ScheduleEntryOut[]>('/schedule').catch(() => ({ data: [] as ScheduleEntryOut[] })),
      ]);

      setTodayData(todayRes.data);
      setAllEntries(allSchedRes.data || []);
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Could not fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [activeProfile?.id, fetchDashboardData]);

  useEffect(() => {
    const handleDevUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('alpine:dev-time-travel', handleDevUpdate);
    window.addEventListener('alpine:schedule-updated', handleDevUpdate);
    return () => {
      window.removeEventListener('alpine:dev-time-travel', handleDevUpdate);
      window.removeEventListener('alpine:schedule-updated', handleDevUpdate);
    };
  }, [fetchDashboardData]);

  // Derived metrics from real schedule data
  const todayTasks = todayData?.tasks || [];
  const completedTodayTasks = todayTasks.filter((t) => t.status === 'done').length;
  const totalTodayTasks = todayTasks.length;
  const nextPendingUnit = todayTasks.find((t) => t.status === 'planned') || null;

  // Real Mastery and Reviews metrics
  const topicsMastered = useMemo(() => {
    const doneTopicIds = new Set(
      allEntries.filter((e) => e.status === 'done').map((e) => e.topic_id)
    );
    return doneTopicIds.size;
  }, [allEntries]);

  // Calendar review tasks scheduled specifically for today
  const todayReviewTasksCount = useMemo(() => {
    return todayTasks.filter((e) => e.is_review && e.status !== 'done').length;
  }, [todayTasks]);

  // Real Consecutive Day Streak relative to active simulated date
  const dayStreak = useMemo(() => {
    if (allEntries.length === 0) return 0;

    const doneDates = Array.from(
      new Set(allEntries.filter((e) => e.status === 'done').map((e) => e.scheduled_date))
    ).sort();

    if (doneDates.length === 0) return 0;

    const refDateStr = todayData?.date ? String(todayData.date) : new Date().toISOString().slice(0, 10);
    const hasDoneToday = doneDates.includes(refDateStr);

    let streak = 0;
    const checkDate = new Date(`${refDateStr}T00:00:00`);
    if (!hasDoneToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (doneDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [allEntries, todayData?.date]);

  // Real Monday–Sunday Study Hours anchored to active simulated date
  const weeklyDays = useMemo<DayStudyStat[]>(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const refDateStr = todayData?.date ? String(todayData.date) : new Date().toISOString().slice(0, 10);
    const refDate = new Date(`${refDateStr}T00:00:00`);

    // Find Monday of the current active week
    const currentDayOfWeek = (refDate.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - currentDayOfWeek);

    const result: DayStudyStat[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const dayEntries = allEntries.filter((e) => e.scheduled_date === iso);
      const dayHours = dayEntries.reduce((acc, curr) => acc + (curr.est_hours ?? 1.0), 0);
      const completedCount = dayEntries.filter((e) => e.status === 'done').length;

      result.push({
        dayName: dayNames[i],
        fullDate: iso,
        hours: Math.round(dayHours * 10) / 10,
        isToday: iso === refDateStr,
        completedCount,
      });
    }

    return result;
  }, [allEntries, todayData?.date]);

  // Real FSRS Memory Health Counts provided directly by backend mastery retention engine
  const { freshCount, fadingCount, reviewCount } = useMemo(() => {
    if (todayData?.memory_health) {
      return {
        freshCount: todayData.memory_health.fresh_count,
        fadingCount: todayData.memory_health.fading_count,
        reviewCount: todayData.memory_health.review_count,
      };
    }

    // Fallback if todayData is not yet loaded: completed entries are fresh by default
    const doneEntries = allEntries.filter((e) => e.status === 'done');
    return {
      freshCount: doneEntries.length,
      fadingCount: 0,
      reviewCount: 0,
    };
  }, [todayData?.memory_health, allEntries]);

  const handleContinueStudying = () => {
    const targetElement = document.getElementById('up-next-section');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const nextUpcomingExam = todayData?.exam_countdowns?.[0] || null;

  if (loading && !todayData) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-44 rounded-3xl bg-surface-soft border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-64 rounded-3xl bg-surface-soft border border-border" />
          <div className="lg:col-span-5 h-64 rounded-3xl bg-surface-soft border border-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <HeroBanner
        displayName={activeProfile?.display_name || 'Active Learner'}
        upcomingExam={nextUpcomingExam}
      />

      {/* Academic Triage Warning Banner */}
      {todayData?.triage_warning && (
        <AcademicTriageBanner
          overrunUnitsCount={todayData.overrun_units_count || 0}
          message={todayData.triage_message}
        />
      )}

      {/* Error Notice */}
      {error && (
        <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-5 flex items-center justify-between text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-3 text-xs font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface text-rose-700 dark:text-rose-300 text-xs font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Responsive 12-Column Grid: Daily Progress (Cols 1–7) & Today's Focus (Cols 8–12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Cols 1–7: Daily Progress Gauge & Summary */}
        <div className="lg:col-span-7">
          <DailyProgressCard
            completedTasks={completedTodayTasks}
            totalTasks={totalTodayTasks}
            scheduledHours={todayData?.scheduled_hours ?? 0.0}
            availableHours={todayData?.available_hours ?? 0.0}
            dayStreak={dayStreak}
            onContinueStudying={handleContinueStudying}
          />
        </div>

        {/* Cols 8–12: Today's Focus Priority Unit */}
        <div className="lg:col-span-5">
          <TodayFocusCard
            task={nextPendingUnit}
            onCheckInSuccess={fetchDashboardData}
          />
        </div>
      </div>

      {/* 3. Weekly Progress & Stat Pills */}
      <div>
        <WeeklyBarChart
          days={weeklyDays}
          topicsMastered={topicsMastered}
          reviewsDue={todayReviewTasksCount}
          dayStreak={dayStreak}
        />
      </div>

      {/* 4. Up Next Today (Sequential Timeline) */}
      <div id="up-next-section">
        <UpNextTimeline
          tasks={todayTasks}
          onCheckInSuccess={fetchDashboardData}
        />
      </div>

      {/* 5. Memory Health Segmented Bar */}
      <div>
        <MemoryHealthBar
          freshCount={freshCount}
          fadingCount={fadingCount}
          reviewCount={reviewCount}
        />
      </div>
    </div>
  );
}
