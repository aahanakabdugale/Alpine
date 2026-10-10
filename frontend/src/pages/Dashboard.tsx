import { TodayFocus } from '@/components/dashboard/TodayFocus';

export function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      <TodayFocus />
    </div>
  );
}

export default Dashboard;

