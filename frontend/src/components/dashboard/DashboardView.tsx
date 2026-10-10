import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
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
    let cancelled = false;
    Promise.all([
      apiClient.get<TodayScheduleResponse>('/schedule/today'),
      apiClient.get<ScheduleEntryOut[]>('/schedule').catch(() => ({ data: [] as ScheduleEntryOut[] })),
    ])
      .then(([todayRes, allSchedRes]) => {
        if (cancelled) return;
        setTodayData(todayRes.data);
        setAllEntries(allSchedRes.data || []);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Could not fetch dashboard metrics');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  useEffect(() => {
    const handleProfileSwitch = () => {
      fetchDashboardData();
    };
    window.addEventListener('alpine:profile-switch', handleProfileSwitch);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleProfileSwitch);
    };
  }, [fetchDashboardData]);

  // Derived metrics from real schedule data
  const todayTasks = todayData?.tasks || [];
  const completedTodayTasks = todayTasks.filter((t) => t.status === 'done').length;
  const totalTodayTasks = todayTasks.length;
  const nextPendingUnit = todayTasks.find((t) => t.status !== 'done') || null;

  // Real Mastery and Reviews metrics
  const topicsMastered = useMemo(() => {
    const doneTopicIds = new Set(
      allEntries.filter((e) => e.status === 'done').map((e) => e.topic_id)
    );
    return doneTopicIds.size;
  }, [allEntries]);

  const reviewsDue = useMemo(() => {
    return allEntries.filter((e) => e.is_review && e.status !== 'done').length;
  }, [allEntries]);

  // Real Consecutive Day Streak
  const dayStreak = useMemo(() => {
    if (allEntries.length === 0) return 0;

    const doneDates = Array.from(
      new Set(allEntries.filter((e) => e.status === 'done').map((e) => e.scheduled_date))
    ).sort();

    if (doneDates.length === 0) return 0;

    const todayIso = new Date().toISOString().slice(0, 10);
    const hasDoneToday = doneDates.includes(todayIso);

    // Calculate backwards consecutive days
    let streak = 0;
    const checkDate = new Date();
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
  }, [allEntries]);

  // Real Monday–Sunday Study Hours
  const weeklyDays = useMemo<DayStudyStat[]>(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);

    // Find Monday of the current week
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 for Mon, 6 for Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);

    // Check if student has entries in the current calendar week
    const mondayIso = monday.toISOString().slice(0, 10);
    const sundayDate = new Date(monday);
    sundayDate.setDate(monday.getDate() + 6);
    const sundayIso = sundayDate.toISOString().slice(0, 10);

    const hasEntriesThisWeek = allEntries.some(
      (e) => e.scheduled_date >= mondayIso && e.scheduled_date <= sundayIso
    );

    // If current week has no entries, find the active schedule date window (e.g. for pre-seeded test learners like Alex)
    let anchorMonday = monday;
    if (!hasEntriesThisWeek && allEntries.length > 0) {
      const firstDateStr = allEntries[0].scheduled_date;
      const parsedFirst = new Date(`${firstDateStr}T00:00:00`);
      const offset = (parsedFirst.getDay() + 6) % 7;
      anchorMonday = new Date(parsedFirst);
      anchorMonday.setDate(parsedFirst.getDate() - offset);
    }

    const result: DayStudyStat[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(anchorMonday);
      d.setDate(anchorMonday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const dayEntries = allEntries.filter((e) => e.scheduled_date === iso);
      const dayHours = dayEntries.reduce((acc, curr) => acc + (curr.est_hours ?? 1.0), 0);
      const completedCount = dayEntries.filter((e) => e.status === 'done').length;

      result.push({
        dayName: dayNames[i],
        fullDate: iso,
        hours: Math.round(dayHours * 10) / 10,
        isToday: iso === todayIso,
        completedCount,
      });
    }

    return result;
  }, [allEntries]);

  // Real Memory Health Counts (Preserving existing FSRS retention thresholds)
  const { freshCount, fadingCount, reviewCount } = useMemo(() => {
    const now = new Date();
    let fresh = 0;
    let fading = 0;
    let review = 0;

    for (const e of allEntries) {
      if (e.status === 'done') {
        const schedDate = new Date(`${e.scheduled_date}T00:00:00`);
        const daysElapsed = Math.max(0, Math.floor((now.getTime() - schedDate.getTime()) / (1000 * 3600 * 24)));

        if (daysElapsed <= 3) {
          fresh++;
        } else if (daysElapsed <= 10) {
          fading++;
        } else {
          review++;
        }
      } else if (e.is_review) {
        review++;
      }
    }

    return { freshCount: fresh, fadingCount: fading, reviewCount: review };
  }, [allEntries]);

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
          reviewsDue={reviewsDue}
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
