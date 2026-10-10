import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  BookOpen,
  Layers,
  FileText,
  Search,
  RefreshCw,
  ShieldCheck,
  Clock,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { useStudentProfiles } from '@/hooks/useStudentProfiles';
import type { SubjectTree, ScheduleEntryOut } from '@/types';

type RetentionStatus = 'fresh' | 'decaying' | 'review_due' | 'planned';

interface UnitRetentionInfo {
  status: RetentionStatus;
  label: string;
  isDone: boolean;
  isReview: boolean;
}

const accordionTransition = {
  duration: 0.28,
  ease: [0.04, 0.62, 0.23, 0.98] as const,
};

export function MasteryTree() {
  const { activeProfile } = useStudentProfiles();
  const [treeData, setTreeData] = useState<SubjectTree[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntryOut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded accordion states
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchCurriculum = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [treeRes, schedRes] = await Promise.all([
        apiClient.get<SubjectTree[]>('/curriculum/tree'),
        apiClient.get<ScheduleEntryOut[]>('/schedule').catch(() => ({ data: [] as ScheduleEntryOut[] })),
      ]);

      const subjects = treeRes.data;
      setTreeData(subjects);
      setScheduleEntries(schedRes.data || []);

      if (subjects.length > 0) {
        setExpandedSubjects({ [subjects[0].id]: true });
        if (subjects[0].modules.length > 0) {
          setExpandedModules({ [subjects[0].modules[0].id]: true });
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load curriculum tree:', err);
      setError(err instanceof Error ? err.message : 'Could not load syllabus hierarchy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.get<SubjectTree[]>('/curriculum/tree'),
      apiClient.get<ScheduleEntryOut[]>('/schedule').catch(() => ({ data: [] as ScheduleEntryOut[] })),
    ])
      .then(([treeRes, schedRes]) => {
        if (!cancelled) {
          const subjects = treeRes.data;
          setTreeData(subjects);
          setScheduleEntries(schedRes.data || []);
          if (subjects.length > 0) {
            setExpandedSubjects({ [subjects[0].id]: true });
            if (subjects[0].modules.length > 0) {
              setExpandedModules({ [subjects[0].modules[0].id]: true });
            }
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load syllabus hierarchy');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  useEffect(() => {
    const handleProfileSwitch = () => {
      fetchCurriculum();
    };
    window.addEventListener('alpine:profile-switch', handleProfileSwitch);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleProfileSwitch);
    };
  }, [fetchCurriculum]);

  // Map topic / subtopic IDs to schedule entry status for retention health
  const statusLookup = useMemo(() => {
    const map = new Map<string, UnitRetentionInfo>();
    const now = new Date();

    for (const e of scheduleEntries) {
      const key = e.subtopic_id ? `subtopic:${e.subtopic_id}` : `topic:${e.topic_id}`;
      const isDone = e.status === 'done';
      const isReview = e.is_review;

      if (isDone) {
        const schedDate = new Date(`${e.scheduled_date}T00:00:00`);
        const daysElapsed = Math.max(0, Math.floor((now.getTime() - schedDate.getTime()) / (1000 * 3600 * 24)));

        if (daysElapsed <= 3) {
          map.set(key, { status: 'fresh', label: 'Fresh (R ≥ 90%)', isDone: true, isReview: false });
        } else if (daysElapsed <= 10) {
          map.set(key, { status: 'decaying', label: 'Decaying (R ~ 75%)', isDone: true, isReview: false });
        } else {
          map.set(key, { status: 'review_due', label: 'Review Due (R < 70%)', isDone: true, isReview: false });
        }
      } else if (isReview) {
        map.set(key, { status: 'review_due', label: 'Review Due', isDone: false, isReview: true });
      } else {
        map.set(key, { status: 'planned', label: 'Planned', isDone: false, isReview: false });
      }
    }

    return map;
  }, [scheduleEntries]);

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const newSubjects: Record<string, boolean> = {};
    const newModules: Record<string, boolean> = {};
    const newTopics: Record<string, boolean> = {};

    for (const s of treeData) {
      newSubjects[s.id] = true;
      for (const m of s.modules) {
        newModules[m.id] = true;
        for (const t of m.topics) {
          newTopics[t.id] = true;
        }
      }
    }
    setExpandedSubjects(newSubjects);
    setExpandedModules(newModules);
    setExpandedTopics(newTopics);
  };

  const collapseAll = () => {
    setExpandedSubjects({});
    setExpandedModules({});
    setExpandedTopics({});
  };

  const renderRetentionPill = (unitKey: string) => {
    const info = statusLookup.get(unitKey);
    if (!info) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50/80 dark:bg-[#0E2A26]/80 text-teal-800 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
          Unscheduled
        </span>
      );
    }

    switch (info.status) {
      case 'fresh':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Fresh
          </span>
        );
      case 'decaying':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Decaying
          </span>
        );
      case 'review_due':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-700/50 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Review Due
          </span>
        );
      case 'planned':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 border border-teal-200/50 dark:border-teal-700/40">
            Planned
          </span>
        );
    }
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return treeData;
    const q = searchQuery.toLowerCase();

    return treeData
      .map((s) => {
        const matchingModules = s.modules
          .map((m) => {
            const matchingTopics = m.topics.filter((t) => {
              const matchT = t.name.toLowerCase().includes(q);
              const matchSub = t.subtopics.some((st) => st.name.toLowerCase().includes(q));
              return matchT || matchSub;
            });
            return {
              ...m,
              topics: matchingTopics,
            };
          })
          .filter((m) => m.name.toLowerCase().includes(q) || m.topics.length > 0);

        return {
          ...s,
          modules: matchingModules,
        };
      })
      .filter((s) => s.name.toLowerCase().includes(q) || s.modules.length > 0);
  }, [treeData, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>FSRS Memory State Explorer</span>
          </div>
          <h1 className="text-3xl font-black text-[#1F2937] dark:text-[#E6FFED] tracking-tight">
            Curriculum & Retention Tree
          </h1>
          <p className="text-sm text-teal-900/70 dark:text-[#99F6E4]/70 mt-1">
            Hierarchical syllabus breakdown across Modules, Topics, and Subtopics with live memory retention health pills.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCurriculum}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E6FFED] dark:bg-[#123B35] border border-white/80 dark:border-teal-700/30 shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover active:shadow-clay-pressed text-xs font-bold text-teal-900 dark:text-[#E6FFED] transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#14BBA6] dark:text-[#2DD4BF]' : ''}`} />
          <span>Refresh Tree</span>
        </button>
      </div>

      {/* Retention Health Legend & Controls Bar */}
      <div className="rounded-3xl bg-[#E6FFED] dark:bg-[#123B35] border border-white/80 dark:border-teal-900/40 shadow-clay-card dark:shadow-clay-dark-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Retention Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-teal-900/70 dark:text-[#99F6E4]/70 uppercase tracking-wide">
            Retention Health:
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Fresh (R ≥ 85%)
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Decaying (70% ≤ R &lt; 85%)
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-700/50 shadow-clay-pill dark:shadow-clay-dark-pill flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Review Due (R &lt; 70%)
          </span>
        </div>

        {/* Expand / Collapse and Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-teal-900/50 dark:text-[#99F6E4]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#0E2A26] border border-white/80 dark:border-teal-900/30 text-xs text-[#1F2937] dark:text-[#E6FFED] placeholder-teal-900/40 dark:placeholder-teal-200/40 shadow-clay-pressed dark:shadow-clay-dark-pressed focus:outline-none focus:ring-2 focus:ring-[#14BBA6]/50"
            />
          </div>
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 rounded-xl bg-[#E6FFED] dark:bg-[#174841] hover:bg-white dark:hover:bg-[#1c554d] text-xs font-semibold text-teal-900 dark:text-[#E6FFED] shadow-clay-pill dark:shadow-clay-dark-pill border border-white/80 dark:border-teal-700/30 transition-all"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-xl bg-[#E6FFED] dark:bg-[#174841] hover:bg-white dark:hover:bg-[#1c554d] text-xs font-semibold text-teal-900 dark:text-[#E6FFED] shadow-clay-pill dark:shadow-clay-dark-pill border border-white/80 dark:border-teal-700/30 transition-all"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && treeData.length === 0 && (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-3xl bg-[#E6FFED]/60 dark:bg-[#123B35]/60 border border-white/60 dark:border-teal-900/30 shadow-clay-card dark:shadow-clay-dark-card"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-6 text-center text-rose-700 dark:text-rose-300">
          <p className="font-bold text-sm">Failed to load curriculum tree</p>
          <p className="text-xs mt-1 text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Hierarchical Accordion View */}
      {!loading && (
        <div className="space-y-4">
          {filteredTree.map((subject) => {
            const isSubjOpen = Boolean(expandedSubjects[subject.id]);
            const isCore = subject.category === 'core';
            const isElective = subject.category === 'elective';

            return (
              <div
                key={subject.id}
                className="rounded-3xl bg-[#E6FFED] dark:bg-[#123B35] border border-white/80 dark:border-teal-900/40 shadow-clay-card dark:shadow-clay-dark-card overflow-hidden transition-all duration-200"
              >
                {/* Subject Header Trigger with Tactile motion */}
                <motion.button
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  whileHover={{ y: -2, scale: 1.005 }}
                  whileTap={{ y: 1, scale: 0.995 }}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-white/40 dark:hover:bg-white/5 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#14BBA6] dark:bg-[#2DD4BF] text-white dark:text-[#0E2A26] flex items-center justify-center font-bold shadow-clay-pill dark:shadow-clay-dark-pill shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-[#1F2937] dark:text-[#E6FFED] truncate">
                          {subject.name}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isCore
                              ? 'bg-teal-100/80 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border-teal-200/50 dark:border-teal-800/40'
                              : isElective
                              ? 'bg-purple-100/80 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40'
                              : 'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
                          }`}
                        >
                          {subject.category}
                        </span>
                        {subject.group_name && (
                          <span className="text-[10px] font-semibold text-teal-900/60 dark:text-[#99F6E4]/60">
                            ({subject.group_name})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-teal-900/70 dark:text-[#99F6E4]/70 mt-0.5">
                        {subject.modules.length} {subject.modules.length === 1 ? 'Module' : 'Modules'}
                      </div>
                    </div>
                  </div>

                  {/* Trailing chevron with animated rotation */}
                  <motion.div
                    animate={{ rotate: isSubjOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-teal-900/50 dark:text-[#99F6E4]/70"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                </motion.button>

                {/* Modules Container with Fluid AnimatePresence */}
                <AnimatePresence initial={false}>
                  {isSubjOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={accordionTransition}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-5 pb-6 pt-1 space-y-3 border-t border-teal-600/10 dark:border-teal-400/15">
                        {subject.modules.map((module) => {
                          const isModOpen = Boolean(expandedModules[module.id]);

                          return (
                            <div
                              key={module.id}
                              className="rounded-2xl bg-white/60 dark:bg-[#0E2A26]/50 border border-white/80 dark:border-teal-900/30 shadow-clay-pill dark:shadow-clay-dark-pill overflow-hidden"
                            >
                              {/* Module Header */}
                              <button
                                type="button"
                                onClick={() => toggleModule(module.id)}
                                className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-7 h-7 rounded-xl bg-teal-100/80 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                                    M{module.order_index}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-[#1F2937] dark:text-[#E6FFED] truncate">
                                      {module.name}
                                    </div>
                                    <div className="text-[11px] text-teal-900/70 dark:text-[#99F6E4]/70 flex items-center gap-2 mt-0.5">
                                      <span className="font-semibold text-teal-700 dark:text-teal-300">
                                        {module.assessment_phase} Phase
                                      </span>
                                      <span>•</span>
                                      <span>{module.topics.length} topics</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      module.assessment_phase === 'UT2'
                                        ? 'bg-purple-100/80 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40'
                                        : 'bg-teal-100/80 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-200/50 dark:border-teal-800/40'
                                    }`}
                                  >
                                    {module.assessment_phase}
                                  </span>

                                  <motion.div
                                    animate={{ rotate: isModOpen ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-teal-900/50 dark:text-[#99F6E4]/70"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </motion.div>
                                </div>
                              </button>

                              {/* Topics List with AnimatePresence */}
                              <AnimatePresence initial={false}>
                                {isModOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={accordionTransition}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <div className="p-3 sm:p-4 bg-teal-50/40 dark:bg-[#0E2A26]/70 border-t border-teal-600/10 dark:border-teal-400/15 space-y-2.5">
                                      {module.topics.map((topic) => {
                                        const isTopicOpen = Boolean(expandedTopics[topic.id]);
                                        const hasSubtopics = topic.subtopics.length > 0;
                                        const topicKey = `topic:${topic.id}`;

                                        return (
                                          <div
                                            key={topic.id}
                                            className="rounded-xl bg-white/80 dark:bg-[#123B35] border border-white/80 dark:border-teal-900/30 p-3 shadow-clay-pill dark:shadow-clay-dark-pill"
                                          >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                              <div className="flex items-start gap-2.5 min-w-0">
                                                <Layers className="w-4 h-4 text-[#14BBA6] dark:text-[#2DD4BF] shrink-0 mt-0.5" />
                                                <div>
                                                  <div className="text-xs font-bold text-[#1F2937] dark:text-[#E6FFED]">
                                                    {topic.name}
                                                  </div>
                                                  <div className="text-[11px] text-teal-900/70 dark:text-[#99F6E4]/70 flex items-center gap-3 mt-1 flex-wrap">
                                                    <span className="flex items-center gap-1 font-medium">
                                                      <Clock className="w-3 h-3 text-teal-900/50 dark:text-[#99F6E4]/60" />
                                                      {topic.est_hours} hrs
                                                    </span>
                                                    <span className="flex items-center gap-1 font-medium">
                                                      <Flame className="w-3 h-3 text-amber-500" />
                                                      Diff: {topic.est_difficulty}/5
                                                    </span>
                                                    {topic.depends_on.length > 0 && (
                                                      <span className="text-[10px] font-semibold text-teal-900/60 dark:text-[#99F6E4]/60 bg-teal-50 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                        Prereqs: {topic.depends_on.length}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                                {!hasSubtopics && renderRetentionPill(topicKey)}

                                                {hasSubtopics && (
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleTopic(topic.id)}
                                                    className="flex items-center gap-1 text-[11px] font-bold text-teal-800 dark:text-teal-200 hover:text-teal-950 dark:hover:text-white bg-teal-50 dark:bg-teal-900/40 px-2 py-1 rounded-lg border border-teal-200/50 dark:border-teal-700/50"
                                                  >
                                                    <span>{topic.subtopics.length} Subtopics</span>
                                                    <motion.div
                                                      animate={{ rotate: isTopicOpen ? 90 : 0 }}
                                                      transition={{ duration: 0.18 }}
                                                    >
                                                      <ChevronRight className="w-3 h-3" />
                                                    </motion.div>
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            {/* Subtopics Nested View with AnimatePresence */}
                                            <AnimatePresence initial={false}>
                                              {hasSubtopics && isTopicOpen && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                  style={{ overflow: 'hidden' }}
                                                >
                                                  <div className="mt-3 pt-2.5 border-t border-teal-600/10 dark:border-teal-400/10 space-y-1.5 pl-6">
                                                    {topic.subtopics.map((subtopic) => {
                                                      const subKey = `subtopic:${subtopic.id}`;
                                                      return (
                                                        <div
                                                          key={subtopic.id}
                                                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-teal-50/50 dark:bg-[#0E2A26]/40 hover:bg-teal-100/50 dark:hover:bg-[#0E2A26]/70 transition-colors"
                                                        >
                                                          <div className="flex items-center gap-2 min-w-0">
                                                            <FileText className="w-3 h-3 text-teal-900/50 dark:text-[#99F6E4]/60 shrink-0" />
                                                            <span className="text-[11px] font-medium text-[#1F2937] dark:text-[#E6FFED] truncate">
                                                              {subtopic.name}
                                                            </span>
                                                            <span className="text-[10px] text-teal-900/60 dark:text-[#99F6E4]/60">
                                                              ({subtopic.est_hours}h)
                                                            </span>
                                                          </div>

                                                          <div className="shrink-0">
                                                            {renderRetentionPill(subKey)}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
