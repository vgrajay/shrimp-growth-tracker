import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import DailyLogCard from "@/components/DailyLogCard";
import AddFeedDialog from "@/components/AddFeedDialog";
import GrowthChart from "@/components/GrowthChart";
import AdminFeedingTimes from "@/components/AdminFeedingTimes";
import { Loader2 } from "lucide-react";

interface FeedEntry {
  id: string;
  amount: number;
  feeding_time_id: string;
  feeding_times: { label: string; sort_order: number } | null;
}

interface DailyLog {
  id: string;
  date: string;
  abw: number | null;
  notes: string | null;
  feed_entries: FeedEntry[];
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*, feed_entries(*, feeding_times(label, sort_order))")
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
    } else {
      setLogs((data as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const chartData = [...logs]
    .reverse()
    .map((l) => ({ date: l.date, abw: l.abw }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-lg mx-auto px-4 py-4 pb-24 space-y-4">
        {/* Growth chart */}
        <GrowthChart data={chartData} />

        {/* Admin: feeding times config */}
        {isAdmin && <AdminFeedingTimes />}

        {/* Daily logs */}
        <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
          Daily Logs
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            No logs yet. Tap + to add your first feed entry!
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => {
              // Find previous log with ABW for ADG calculation (7 days prior concept)
              const prevWithAbw = logs.slice(i + 1).find((l) => l.abw !== null);
              return (
                <DailyLogCard
                  key={log.id}
                  log={log}
                  previousAbw={prevWithAbw?.abw ?? null}
                  onRefresh={fetchLogs}
                />
              );
            })}
          </div>
        )}

        {/* FAB */}
        <AddFeedDialog onAdded={fetchLogs} />
      </main>
    </div>
  );
}
