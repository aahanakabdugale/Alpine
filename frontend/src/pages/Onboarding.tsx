import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  BookOpen,
  Award,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type {
  SubjectsGrouped,
  StudentCreateResponse,
  StudentOnboardRequest,
  StudentOnboardResponse,
  DailyAvailabilityItem,
} from '@/types';

const DAYS_OF_WEEK = [
  { day: 0, name: 'Monday', short: 'Mon' },
  { day: 1, name: 'Tuesday', short: 'Tue' },
  { day: 2, name: 'Wednesday', short: 'Wed' },
  { day: 3, name: 'Thursday', short: 'Thu' },
  { day: 4, name: 'Friday', short: 'Fri' },
  { day: 5, name: 'Saturday', short: 'Sat' },
  { day: 6, name: 'Sunday', short: 'Sun' },
];

export function Onboarding() {
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state
  const [displayName, setDisplayName] = useState<string>('');
  const [selectedElectiveId, setSelectedElectiveId] = useState<string>('');
  const [selectedHonorsId, setSelectedHonorsId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('2026-09-01');

  // 7-day availability: default reasonable hours
  const [availability, setAvailability] = useState<Record<number, number>>({
    0: 2.5, // Mon
    1: 2.5, // Tue
    2: 2.0, // Wed
    3: 2.5, // Thu
    4: 2.0, // Fri
    5: 4.0, // Sat
    6: 3.5, // Sun
  });

  // Curriculum options fetched from backend
  const [groupedSubjects, setGroupedSubjects] = useState<SubjectsGrouped>({
    core: [],
    electives: [],
    honors: [],
  });

  // Fetch subjects from backend
  useEffect(() => {
    async function loadSubjects() {
      setLoadingSubjects(true);
      try {
        const response = await apiClient.get<SubjectsGrouped>('/curriculum/subjects');
        setGroupedSubjects(response.data);

        // Pre-select first elective if available
        if (response.data.electives.length > 0) {
          setSelectedElectiveId(response.data.electives[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to load curriculum subjects:', err);
        toast.error('Failed to load curriculum subjects from backend');
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjects();
  }, []);

  const totalWeeklyHours = Object.values(availability).reduce((acc, h) => acc + h, 0);

  const handleHourChange = (dayIndex: number, hours: number) => {
    setAvailability((prev) => ({
      ...prev,
      [dayIndex]: hours,
    }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!displayName.trim()) {
        toast.error('Please enter a student display name');
        return;
      }
    }
    if (currentStep === 2) {
      if (!selectedElectiveId) {
        toast.error('Please select an elective course');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Create student in SQLite
      const createRes = await apiClient.post<StudentCreateResponse>('/students', {
        display_name: displayName.trim(),
      });
      const newStudentId = createRes.data.id;

      // 2. Format 7-day availability matrix
      const availabilityList: DailyAvailabilityItem[] = DAYS_OF_WEEK.map((d) => ({
        day_of_week: d.day,
        hours_available: availability[d.day] || 0.0,
      }));

      // 3. Submit onboarding payload to generate CP-SAT schedule
      const onboardPayload: StudentOnboardRequest = {
        student_id: newStudentId,
        elective_id: selectedElectiveId,
        honors_id: selectedHonorsId,
        availability: availabilityList,
        start_date: startDate,
      };

      const onboardRes = await apiClient.post<StudentOnboardResponse>(
        '/student/onboard',
        onboardPayload
      );

      // 4. Save active student ID to localStorage
      localStorage.setItem('active_student_id', newStudentId);
      window.dispatchEvent(new CustomEvent('alpine:profile-switch', { detail: newStudentId }));

      toast.success(`Welcome to Alpine, ${displayName.trim()}!`, {
        description: `Generated study plan with ${onboardRes.data.total_scheduled_units} units.`,
      });

      // 5. Navigate to Dashboard
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Onboarding failed:', err);
      toast.error('Onboarding failed', {
        description: err instanceof Error ? err.message : 'Please check backend logs',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Identity', icon: User },
    { number: 2, title: 'Elective', icon: BookOpen },
    { number: 3, title: 'Honors', icon: Award },
    { number: 4, title: 'Availability', icon: Clock },
  ];

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      {/* Top Wizard Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 shadow-clay-pill">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Profile Onboarding Wizard</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Create Your Learner Profile
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Configure your academic semester track and study availability. Alpine's constraint solver will construct a personalized, exam-aligned study calendar.
        </p>
      </div>

      {/* Step Indicator Bar */}
      <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-4">
        <div className="flex items-center justify-between relative">
          {/* Progress track behind */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200/80 -z-0" />
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-300 -z-0"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 88}%` }}
          />

          {steps.map((s) => {
            const Icon = s.icon;
            const isDone = currentStep > s.number;
            const isCurrent = currentStep === s.number;

            return (
              <div key={s.number} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all duration-200 border ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-clay-pressed scale-105'
                      : isDone
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-clay-pill'
                      : 'bg-[#f0f4f9] text-slate-500 border-white/80 shadow-clay-pill'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-[11px] font-bold mt-1.5 transition-colors ${
                    isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Content Card */}
      <div className="rounded-3xl bg-[#f0f4f9] border border-white/80 shadow-clay-card p-6 sm:p-8 min-h-[380px] flex flex-col justify-between">
        {/* STEP 1: Name / Identity */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">What is your learner name?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your student or persona name. This will be stored locally in SQLite (`alpine.db`).
              </p>
            </div>

            <div className="space-y-3">
              <label htmlFor="student-name-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Display Name
              </label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                  {displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : '?'}
                </div>
                <input
                  id="student-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="e.g. Jordan (Diligent), Chris (Exam Crammer)..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-white/90 shadow-clay-pressed text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                />
              </div>
            </div>

            {/* Quick-Pick Suggestions */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                Quick persona templates:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Jordan (Balanced)',
                  'Taylor (Fast Track)',
                  'Dev (Part-Time)',
                  'Morgan (Deep Learner)',
                ].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDisplayName(name)}
                    className="px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white text-xs font-medium text-slate-700 border border-white/80 shadow-clay-pill transition-all"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Elective Selection */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Select Your Open Elective</h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose the university open elective subject to include in your semester schedule.
              </p>
            </div>

            {loadingSubjects ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : groupedSubjects.electives.length === 0 ? (
              <p className="text-xs text-slate-500">No elective courses found in curriculum database.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedSubjects.electives.map((elective) => {
                  const isSelected = selectedElectiveId === elective.id;

                  return (
                    <button
                      key={elective.id}
                      type="button"
                      onClick={() => setSelectedElectiveId(elective.id)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-white shadow-clay-pressed border-indigo-500 ring-2 ring-indigo-400/30'
                          : 'bg-white/60 border-white/80 shadow-clay-pill hover:bg-white/90'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">{elective.name}</div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Category: <span className="font-semibold uppercase">{elective.category}</span>
                        </div>
                      </div>

                      <div className="shrink-0 mt-0.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Honors Selection */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Select Honors Track (Optional)</h2>
              <p className="text-xs text-slate-500 mt-1">
                You can enroll in an optional Honors curriculum or opt out for a standard load.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* None Option */}
              <button
                type="button"
                onClick={() => setSelectedHonorsId(null)}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                  selectedHonorsId === null
                    ? 'bg-white shadow-clay-pressed border-indigo-500 ring-2 ring-indigo-400/30'
                    : 'bg-white/60 border-white/80 shadow-clay-pill hover:bg-white/90'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">No Honors Track</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Standard semester curriculum load (Core + Elective only).
                  </div>
                </div>

                <div className="shrink-0 mt-0.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      selectedHonorsId === null
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {selectedHonorsId === null && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {/* Honors Options from API */}
              {groupedSubjects.honors.map((honors) => {
                const isSelected = selectedHonorsId === honors.id;

                return (
                  <button
                    key={honors.id}
                    type="button"
                    onClick={() => setSelectedHonorsId(honors.id)}
                    className={`text-left p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-white shadow-clay-pressed border-indigo-500 ring-2 ring-indigo-400/30'
                        : 'bg-white/60 border-white/80 shadow-clay-pill hover:bg-white/90'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{honors.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Advanced Specialized Honors track
                      </div>
                    </div>

                    <div className="shrink-0 mt-0.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: 7-Day Availability Sliders */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900">7-Day Study Availability</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust your study hours per day. Alpine uses this capacity budget to schedule tasks without overload.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-indigo-700 shadow-sm shrink-0">
                Weekly Budget: <span className="font-mono text-sm">{totalWeeklyHours.toFixed(1)}</span> hrs
              </div>
            </div>

            {/* Availability Sliders */}
            <div className="space-y-3">
              {DAYS_OF_WEEK.map((d) => {
                const val = availability[d.day] || 0.0;

                return (
                  <div
                    key={d.day}
                    className="flex items-center gap-4 bg-white/70 p-3 rounded-2xl border border-white/90 shadow-sm"
                  >
                    <div className="w-24 text-xs font-bold text-slate-700">
                      {d.name}
                    </div>

                    <input
                      type="range"
                      min="0.0"
                      max="8.0"
                      step="0.5"
                      value={val}
                      onChange={(e) => handleHourChange(d.day, parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />

                    <div className="w-16 text-right font-mono text-xs font-bold text-indigo-700">
                      {val.toFixed(1)} hrs
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Semester Start Date Picker */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
              <label htmlFor="start-date-input" className="text-xs font-bold text-slate-700">Semester Study Start Date:</label>
              <input
                id="start-date-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200/60 mt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              currentStep === 1
                ? 'opacity-0 pointer-events-none'
                : 'bg-white/80 text-slate-700 border border-white/90 shadow-clay-pill hover:bg-white active:shadow-clay-pressed'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-clay-pill active:shadow-clay-pressed transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs font-bold shadow-clay-pill active:shadow-clay-pressed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Solving CP-SAT Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Adaptive Plan & Finish</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
