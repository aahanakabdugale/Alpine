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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-soft text-text-muted border border-border">
          Unscheduled
        </span>
      );
    }

    switch (info.status) {
      case 'fresh':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-fresh/15 text-status-fresh border border-status-fresh/30 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-status-fresh" />
            Fresh (≥ 90%)
          </span>
        );
      case 'decaying':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-fading/15 text-status-fading border border-status-fading/30 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-status-fading animate-pulse" />
            Fading (70–89%)
          </span>
        );
      case 'review_due':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-danger/15 text-status-danger border border-status-danger/30 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-status-danger" />
            Review Due (&lt; 70%)
          </span>
        );
      case 'planned':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-soft text-text-muted border border-border">
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
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>FSRS Memory State Explorer</span>
          </div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">
            Curriculum & Retention Tree
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Hierarchical syllabus breakdown across Modules, Topics, and Subtopics with live memory retention health pills.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCurriculum}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-soft border border-border shadow-clay-pill dark:shadow-clay-dark-pill hover:shadow-clay-hover dark:hover:shadow-clay-dark-hover active:shadow-clay-pressed text-xs font-bold text-text-primary transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          <span>Refresh Tree</span>
        </button>
      </div>

      {/* Retention Health Legend & Controls Bar */}
      <div className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Retention Legend */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
            Retention Health:
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-status-fresh/15 text-status-fresh border border-status-fresh/30 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-fresh" />
            Fresh (R ≥ 90%)
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-status-fading/15 text-status-fading border border-status-fading/30 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-fading" />
            Decaying (70–89%)
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-status-danger/15 text-status-danger border border-status-danger/30 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-status-danger" />
            Review Due (&lt; 70%)
          </span>
        </div>

        {/* Expand / Collapse and Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-surface-inset border border-border/80 text-xs text-text-primary placeholder:text-text-muted shadow-clay-inset dark:shadow-clay-dark-inset focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 rounded-xl bg-surface-soft hover:bg-surface-hover text-xs font-semibold text-text-primary shadow-clay-pill dark:shadow-clay-dark-pill border border-border transition-all cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-xl bg-surface-soft hover:bg-surface-hover text-xs font-semibold text-text-primary shadow-clay-pill dark:shadow-clay-dark-pill border border-border transition-all cursor-pointer"
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
              className="h-28 rounded-3xl bg-surface-soft/60 border border-border/60 shadow-clay-card dark:shadow-clay-dark-card"
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
                className="rounded-3xl bg-surface border border-border shadow-clay-card dark:shadow-clay-dark-card overflow-hidden transition-all duration-200"
              >
                {/* Subject Header Trigger with Tactile motion */}
                <motion.button
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  whileHover={{ y: -2, scale: 1.005 }}
                  whileTap={{ y: 1, scale: 0.995 }}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-surface-hover/50 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary text-canvas flex items-center justify-center font-bold shadow-clay-pill dark:shadow-clay-dark-pill shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-text-primary truncate">
                          {subject.name}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isCore
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : isElective
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          }`}
                        >
                          {subject.category}
                        </span>
                        {subject.group_name && (
                          <span className="text-[10px] font-semibold text-text-muted">
                            ({subject.group_name})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {subject.modules.length} {subject.modules.length === 1 ? 'Module' : 'Modules'}
                      </div>
                    </div>
                  </div>

                  {/* Trailing chevron with animated rotation */}
                  <motion.div
                    animate={{ rotate: isSubjOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-text-muted"
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
                      <div className="px-5 pb-6 pt-1 space-y-3 border-t border-border">
                        {subject.modules.map((module) => {
                          const isModOpen = Boolean(expandedModules[module.id]);

                          return (
                            <div
                              key={module.id}
                              className="rounded-2xl bg-surface-soft/60 border border-border/70 overflow-hidden"
                            >
                              {/* Module Header */}
                              <button
                                type="button"
                                onClick={() => toggleModule(module.id)}
                                className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-surface-hover/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-7 h-7 rounded-xl bg-surface-soft text-text-primary border border-border flex items-center justify-center font-bold text-xs shrink-0">
                                    M{module.order_index}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-text-primary truncate">
                                      {module.name}
                                    </div>
                                    <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                                      <span className="font-semibold text-primary">
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
                                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                                        : 'bg-primary/10 text-primary border-primary/20'
                                    }`}
                                  >
                                    {module.assessment_phase}
                                  </span>

                                  <motion.div
                                    animate={{ rotate: isModOpen ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-text-muted"
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
                                    <div className="p-3 sm:p-4 bg-surface-inset/40 border-t border-border space-y-2.5">
                                      {module.topics.map((topic) => {
                                        const isTopicOpen = Boolean(expandedTopics[topic.id]);
                                        const hasSubtopics = topic.subtopics.length > 0;
                                        const topicKey = `topic:${topic.id}`;

                                        return (
                                          <div
                                            key={topic.id}
                                            className="rounded-xl bg-surface border border-border p-3.5 hover:bg-surface-hover/40 transition-colors shadow-none"
                                          >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                              <div className="flex items-start gap-2.5 min-w-0">
                                                <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <div>
                                                  <div className="text-xs font-bold text-text-primary">
                                                    {topic.name}
                                                  </div>
                                                  <div className="text-[11px] text-text-secondary flex items-center gap-3 mt-1 flex-wrap">
                                                    <span className="flex items-center gap-1 font-medium">
                                                      <Clock className="w-3 h-3 text-text-muted" />
                                                      {topic.est_hours} hrs
                                                    </span>
                                                    <span className="flex items-center gap-1 font-medium">
                                                      <Flame className="w-3 h-3 text-status-fading" />
                                                      Diff: {topic.est_difficulty}/5
                                                    </span>
                                                    {topic.depends_on.length > 0 && (
                                                      <span className="text-[10px] font-semibold text-text-muted bg-surface-soft px-1.5 py-0.5 rounded border border-border/50">
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
                                                    className="flex items-center gap-1 text-[11px] font-bold text-text-primary hover:text-primary bg-surface-soft hover:bg-surface-hover px-2 py-1 rounded-lg border border-border transition-colors cursor-pointer"
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
                                                  <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5 pl-6">
                                                    {topic.subtopics.map((subtopic) => {
                                                      const subKey = `subtopic:${subtopic.id}`;
                                                      return (
                                                        <div
                                                          key={subtopic.id}
                                                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-soft/40 border border-border/40 hover:bg-surface-soft/70 transition-colors"
                                                        >
                                                          <div className="flex items-center gap-2 min-w-0">
                                                            <FileText className="w-3 h-3 text-text-muted shrink-0" />
                                                            <span className="text-[11px] font-medium text-text-primary truncate">
                                                              {subtopic.name}
                                                            </span>
                                                            <span className="text-[10px] text-text-muted">
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
