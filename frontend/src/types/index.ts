/**
 * Alpine TypeScript Data Types & API Models
 */

export interface StudentSummary {
  id: string;
  display_name: string;
  enrolled_subjects_count: number;
  completed_units: number;
  total_units: number;
  created_at: string;
}

export interface StudentCreate {
  display_name: string;
}

export interface StudentCreateResponse {
  id: string;
  display_name: string;
  message: string;
}

export interface DailyAvailabilityItem {
  day_of_week: number; // 0=Monday, ..., 6=Sunday
  hours_available: number;
}

export interface StudentOnboardRequest {
  student_id?: string;
  elective_id: string;
  honors_id?: string | null;
  availability: DailyAvailabilityItem[];
  start_date?: string; // YYYY-MM-DD
}

export interface StudentOnboardResponse {
  message: string;
  student_id: string;
  total_scheduled_units: number;
}

export interface SubjectMinimal {
  id: string;
  name: string;
  category: string;
  group_name: string | null;
}

export interface StudentProfileOut {
  id: string;
  display_name: string;
  created_at: string;
  enrolled_subjects: SubjectMinimal[];
  availability: DailyAvailabilityItem[];
}

export interface SubjectOut {
  id: string;
  name: string;
  category: 'core' | 'elective' | 'honors' | string;
  group_name: string | null;
}

export interface SubjectsGrouped {
  core: SubjectOut[];
  electives: SubjectOut[];
  honors: SubjectOut[];
}

export interface SubtopicTree {
  id: string;
  name: string;
  order_index: number;
  est_hours: number;
}

export interface TopicTree {
  id: string;
  name: string;
  order_index: number;
  est_difficulty: number;
  est_hours: number;
  depends_on: string[];
  subtopics: SubtopicTree[];
}

export interface ModuleTree {
  id: string;
  name: string;
  order_index: number;
  assessment_phase: 'UT1' | 'UT2' | string;
  topics: TopicTree[];
}

export interface SubjectTree {
  id: string;
  name: string;
  category: string;
  group_name: string | null;
  modules: ModuleTree[];
}

export interface ScheduleEntryOut {
  id: string;
  student_id: string;
  topic_id: string;
  subtopic_id: string | null;
  scheduled_date: string; // YYYY-MM-DD
  status: 'planned' | 'done' | 'skipped' | string;
  is_review: boolean;
  title: string;
  topic_name: string | null;
  subtopic_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  module_id?: string | null;
  module_name?: string | null;
  assessment_phase?: string | null;
  est_hours: number | null;
  est_difficulty: number | null;
  is_overrun?: boolean;
}

export interface ExamCountdownItem {
  subject_id: string;
  subject_name: string;
  exam_type: 'UT1' | 'UT2' | 'end_sem' | string;
  exam_date: string;
  days_remaining: number;
}

export interface MemoryHealthStats {
  fresh_count: number;
  fading_count: number;
  review_count: number;
}

export interface TodayScheduleResponse {
  date: string;
  scheduled_hours: number;
  available_hours: number;
  tasks: ScheduleEntryOut[];
  exam_countdowns: ExamCountdownItem[];
  triage_warning?: boolean;
  overrun_units_count?: number;
  triage_message?: string | null;
  memory_health?: MemoryHealthStats;
}

export interface DevStatusResponse {
  simulated_date: string;
  real_date: string;
  is_simulated: boolean;
  student_id: string;
  student_name: string;
  total_units: number;
  completed_units: number;
  planned_units: number;
  overrun_units_count: number;
  triage_warning: boolean;
}

export interface CheckInRequest {
  unit_id: string;
  status: 'done' | string;
  confidence_rating: number; // 1 to 5
}

export interface CheckInResponse {
  message: string;
  unit_id: string;
  stability_days: number;
  retrievability: number;
  recalculated_units_count: number;
}

export interface ProgressSubjectStats {
  subject_id: string;
  subject_name: string;
  completed_units: number;
  total_units: number;
  completion_percentage: number;
}

export interface ProgressResponse {
  overall_completed_units: number;
  overall_total_units: number;
  overall_completion_percentage: number;
  subjects: ProgressSubjectStats[];
}

