import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import DailyLogCard from "@/components/DailyLogCard";
import AddFeedDialog from "@/components/AddFeedDialog";
import GrowthChart from "@/components/GrowthChart";
import AdminFeedingTimes from "@/components/AdminFeedingTimes";
import FarmsTable from "@/components/FarmsTable";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface FeedEntry {
  id: string;
  amount: number;
  feed_size: string | null;
  feeding_time_id: string;
  feeding_times: { label: string; sort_order: number } | null;
}

interface DailyLog {
  id: string;
  date: string;
  abw: number | null;
  notes: string | null;
  farm_id: string;
  feed_entries: FeedEntry[];
}

interface Farm {
  id: string;
  name: string;
  doc: string | null;
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [editingDoc, setEditingDoc] = useState(false);
  const [docValue, setDocValue] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from("farms")
        .select("id, name, doc")
        .order("name");

      if (error) {
        console.error("Error fetching farms:", error);
        toast.error("Failed to load farms");
        setFarms([]);
      } else if (data) {
        setFarms(data);
        // Set default to first farm if available
        if (data.length > 0 && !selectedFarmId) {
          setSelectedFarmId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      toast.error("Failed to load farms");
      setFarms([]);
    }
  };

  const fetchLogs = useCallback(async () => {
    if (!selectedFarmId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("daily_logs")
      .select("*, feed_entries(*, feeding_times(label, sort_order))")
      .eq("farm_id", selectedFarmId)
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
    } else {
      setLogs((data as DailyLog[]) ?? []);
    }
    setLoading(false);
  }, [selectedFarmId]);

  const handleSaveDoc = async () => {
    if (!selectedFarmId) return;
    const docDate = new Date(docValue);
    if (isNaN(docDate.getTime())) {
      toast.error("Enter a valid date");
      return;
    }
    const { error } = await supabase
      .from("farms")
      .update({ doc: docValue })
      .eq("id", selectedFarmId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("DOC updated");
      setEditingDoc(false);
      fetchFarms();
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      fetchLogs();
    }
  }, [selectedFarmId, fetchLogs]);

  const chartData = [...logs]
    .reverse()
    .map((l) => ({ date: l.date, abw: l.abw }));

  // Calculate total cumulative feed
  const totalCumulativeFeed = logs.reduce((total, log) => {
    return total + log.feed_entries.reduce((sum, entry) => sum + entry.amount, 0);
  }, 0);

  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-lg mx-auto px-4 py-4 pb-24 space-y-4">
        {/* Total Cumulative Feed and DOC */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Cumulative Feed
              </h3>
              <p className="text-2xl font-bold font-mono text-primary">
                {totalCumulativeFeed.toFixed(1)} kg
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                DOC
              </h3>
              {selectedFarm?.doc ? (
                isAdmin && editingDoc ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="date"
                      value={docValue}
                      onChange={(e) => setDocValue(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-1 justify-center">
                      <Button size="sm" variant="default" className="text-xs px-2" onClick={handleSaveDoc}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs px-2" onClick={() => setEditingDoc(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-lg font-bold font-mono text-primary">
                      {format(new Date(selectedFarm.doc + "T00:00:00"), "dd/MM/yyyy")}
                    </p>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="text-xs px-2 h-6" onClick={() => {
                        setDocValue(selectedFarm.doc);
                        setEditingDoc(true);
                      }}>
                        Edit
                      </Button>
                    )}
                  </div>
                )
              ) : isAdmin && selectedFarm ? (
                editingDoc ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      type="date"
                      value={docValue}
                      onChange={(e) => setDocValue(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-1 justify-center">
                      <Button size="sm" variant="default" className="text-xs px-2" onClick={handleSaveDoc}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs px-2" onClick={() => setEditingDoc(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingDoc(true)}
                    className="text-lg font-bold font-mono text-primary hover:text-primary/80 cursor-pointer"
                  >
                    Set DOC
                  </button>
                )
              ) : (
                <p className="text-lg font-bold font-mono text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Growth chart */}
        {isAdmin && <GrowthChart data={chartData} />}

        {/* Admin: feeding times config */}
        {isAdmin && <AdminFeedingTimes />}

        {/* Farms Table */}
        <FarmsTable />

        {/* Farm Selection */}
        <div className="space-y-2">
          <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
            Select Farm
          </h2>
          <div className="flex gap-2 flex-wrap">
            {farms.map((farm) => (
              <Button
                key={farm.id}
                variant={selectedFarmId === farm.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFarmId(farm.id)}
              >
                {farm.name}
              </Button>
            ))}
          </div>
        </div>

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
              
              // Calculate cumulative feed up to and including this day
              // Since logs are ordered by date descending (newest first),
              // we need to sum from the end of the array up to this index
              const cumulativeUpToThisDay = logs
                .slice(i) // Get this log and all older logs (since array is descending)
                .reduce((sum, l) => sum + l.feed_entries.reduce((feedSum, e) => feedSum + e.amount, 0), 0);
              
              return (
                <DailyLogCard
                  key={log.id}
                  log={log}
                  previousAbw={prevWithAbw?.abw ?? null}
                  onRefresh={fetchLogs}
                  totalCumulativeFeed={cumulativeUpToThisDay}
                  farmDoc={selectedFarm?.doc ?? null}
                />
              );
            })}
          </div>
        )}

        {/* FAB */}
        {isAdmin && <AddFeedDialog onAdded={fetchLogs} defaultFarmId={selectedFarmId} />}
      </main>
    </div>
  );
}
