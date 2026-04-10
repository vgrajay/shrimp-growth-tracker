import { useEffect, useState, useCallback } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import DailyLogCard from "@/components/DailyLogCard";
import OxygenLogCard from "@/components/OxygenLogCard";
import AddFeedDialog from "@/components/AddFeedDialog";
import AddOxygenDialog from "@/components/AddOxygenDialog";
import GrowthChart from "@/components/GrowthChart";
import AdminFeedingTimes from "@/components/AdminFeedingTimes";
import FarmsTable from "@/components/FarmsTable";
import { Loader2, StickyNote, Send, FileText, Wind, Calendar, Zap, AlertCircle } from "lucide-react";
import ElectricMeterCard, { ElectricMeter, ElectricReading } from "@/components/ElectricMeterCard";
import AddMeterReadingDialog from "@/components/AddMeterReadingDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface FeedEntry {
  id: string;
  amount: number;
  feed_size: string | null;
  feeding_time_id: string;
  feeding_times: { label: string; sort_order: number } | null;
}

interface OxygenEntry {
  id: string;
  start_time: string;
  off_time: string;
}

interface DailyLog {
  id: string;
  date: string;
  abw: number | null;
  notes: string | null;
  farm_id: string;
  feed_entries: FeedEntry[];
  oxygen_entries: OxygenEntry[];
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
  const [activeTab, setActiveTab] = useState("feed");

  // Electric state
  const [meters, setMeters] = useState<ElectricMeter[]>([]);
  const [readings, setReadings] = useState<ElectricReading[]>([]);
  const [electricLoading, setElectricLoading] = useState(false);

  // Notes state
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

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
      .select("*, feed_entries(*, feeding_times(label, sort_order)), oxygen_entries(*)")
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
      toast.error("Enter a valid full date and time");
      return;
    }
    
    if (!window.confirm("Are you sure you want to change the DOC?")) {
      return;
    }
    
    const { error } = await supabase
      .from("farms")
      .update({ doc: docDate.toISOString() })
      .eq("id", selectedFarmId);
      
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("DOC updated");
      setEditingDoc(false);
      fetchFarms();
    }
  };

  const handleSaveNotes = async (logId: string) => {
    const { error } = await supabase
      .from("daily_logs")
      .update({ notes: notesValue.trim() || null })
      .eq("id", logId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Notes updated");
      setEditingNotes(null);
      fetchLogs();
    }
  };

  const fetchElectricData = useCallback(async () => {
    setElectricLoading(true);
    try {
      const { data: meterData } = await supabase.from("electric_meters").select("*").order("name");
      const { data: readingData } = await supabase.from("electric_readings").select("*").order("reading_date", { ascending: false });
      
      if (meterData) setMeters(meterData);
      if (readingData) setReadings(readingData);
    } catch (err) {
      console.error("Error fetching electric data:", err);
    } finally {
      setElectricLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarms();
    fetchElectricData();
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      fetchLogs();
    }
  }, [selectedFarmId, fetchLogs]);

  const chartData = [...logs]
    .reverse()
    .map((l) => ({ date: l.date, abw: l.abw }));

  const today = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs.find((l) => l.date === today);
  const todayFeed = todayLog?.feed_entries
    ? todayLog.feed_entries.reduce((sum, e) => sum + e.amount, 0)
    : 0;
  const todayOxygenLogsCount = todayLog?.oxygen_entries?.length || 0;

  const totalCumulativeFeed = logs.reduce((total, log) => {
    return total + (log.feed_entries?.reduce((sum, entry) => sum + entry.amount, 0) || 0);
  }, 0);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  // Safe parse doc logic
  const getParsedDocTime = (docStr: string | null): Date | null => {
    if (!docStr) return null;
    if (docStr.length === 10) return new Date(docStr + "T00:00:00"); 
    const parsed = new Date(docStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const parsedDoc = getParsedDocTime(selectedFarm?.doc || null);
  const daysFromDoc = parsedDoc ? differenceInCalendarDays(new Date(), parsedDoc) : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-lg mx-auto px-4 py-4 pb-24 space-y-4 shadow-inner min-h-screen">
        
        {/* Farm Selection Top Section */}
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

        {/* Global Summary Card */}
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base font-heading">
              <span>Farm Overview</span>
              <Badge variant="outline" className="font-mono text-xs">
                {format(new Date(), "dd/MM/yyyy")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-primary/5 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Today / Total Feed
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <p className="text-lg font-bold font-mono text-primary flex items-baseline">
                    {todayFeed.toFixed(1)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground font-mono">
                    / {totalCumulativeFeed.toFixed(1)}
                  </p>
                  <span className="text-xs text-muted-foreground ml-0.5">kg</span>
                </div>
              </div>
              <div className="bg-primary/5 rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  DOC Day
                </p>
                <p className="text-lg font-bold font-mono text-primary">
                  {daysFromDoc ?? "—"}
                </p>
              </div>
            </div>

            {isAdmin && selectedFarm && (
              <div className="flex items-center gap-2 text-sm justify-center border-t border-border pt-3">
                <span className="text-muted-foreground text-xs">DOC Time:</span>
                {editingDoc ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="datetime-local"
                      value={docValue}
                      onChange={(e) => setDocValue(e.target.value)}
                      className="h-7 text-xs w-[140px]"
                    />
                    <Button size="sm" className="h-7 text-xs px-2" onClick={handleSaveDoc}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingDoc(false)}>
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const initialValue = parsedDoc ? format(parsedDoc, "yyyy-MM-dd'T'HH:mm") : "";
                      setDocValue(initialValue);
                      setEditingDoc(true);
                    }}
                    className="text-xs text-primary hover:underline font-mono"
                  >
                    {parsedDoc
                      ? format(parsedDoc, "dd/MM/yyyy h:mm a")
                      : "Set DOC"}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-12">
            <TabsTrigger value="feed" className="flex flex-col gap-1 items-center justify-center">
              Feed
            </TabsTrigger>
            <TabsTrigger value="oxygen" className="flex flex-col gap-1 items-center justify-center relative">
              Oxygen
              {todayOxygenLogsCount > 0 && (
                <span className="absolute top-1.5 right-2 flex h-2 w-2 rounded-full bg-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="electric" className="flex flex-col gap-1 items-center justify-center">
              Electric
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex flex-col gap-1 items-center justify-center">
              Notes
            </TabsTrigger>
          </TabsList>

          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="py-12 text-center flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-4">No logs available for this farm yet.</p>
            </div>
          )}

          {/* ────── FEED TAB (YOUR FEED HISTORY) ────── */}
          <TabsContent value="feed" className="space-y-4 mt-0 animate-in fade-in zoom-in-95 duration-200">
            {isAdmin && logs.length > 0 && <GrowthChart data={chartData} />}
            {isAdmin && <AdminFeedingTimes />}
            
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                Feed History
              </h2>
              <Badge variant="secondary" className="font-mono">
                Total: {totalCumulativeFeed.toFixed(1)}kg
              </Badge>
            </div>

            <div className="space-y-3">
              {logs.map((log, i) => {
                const prevWithAbw = logs.slice(i + 1).find((l) => l.abw !== null);
                const cumulativeUpToThisDay = logs
                  .slice(i)
                  .reduce(
                    (sum, l) =>
                      sum + (l.feed_entries?.reduce((feedSum, e) => feedSum + e.amount, 0) || 0),
                    0
                  );

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
          </TabsContent>

          {/* ────── OXYGEN TAB ────── */}
          <TabsContent value="oxygen" className="space-y-4 mt-0 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
              Oxygen Logs History
            </h2>
            <div className="space-y-3">
              {logs
                .filter(log => log.oxygen_entries && log.oxygen_entries.length > 0)
                .map((log) => (
                <OxygenLogCard
                  key={log.id}
                  log={log}
                  onRefresh={fetchLogs}
                  farmDoc={selectedFarm?.doc ?? null}
                />
              ))}

              {logs.filter(log => log.oxygen_entries && log.oxygen_entries.length > 0).length === 0 && (
                <Card className="border-dashed bg-card/40">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                    <Wind className="w-8 h-8 opacity-20 mb-2" />
                    No oxygen motor logs found yet.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ────── ELECTRIC TAB ────── */}
          <TabsContent value="electric" className="space-y-4 mt-0 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                Electric Meter Tracking
              </h2>
              <Badge variant="outline" className="flex items-center gap-1 border-yellow-200 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/10">
                <Zap className="h-3 w-3" />
                Live Monitoring
              </Badge>
            </div>

            {electricLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {meters.length > 0 ? (
                  meters.map((meter) => (
                    <ElectricMeterCard
                      key={meter.id}
                      meter={meter}
                      readings={readings.filter((r) => r.meter_id === meter.id)}
                      onRefresh={fetchElectricData}
                    />
                  ))
                ) : (
                  <Card className="border-dashed bg-card/40">
                    <CardContent className="py-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                       <AlertCircle className="w-8 h-8 opacity-20" />
                       <p>No meters found in database.</p>
                       <p className="text-[10px]">Please run the SQL migration.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ────── NOTES TAB ────── */}
          <TabsContent value="notes" className="space-y-4 mt-0 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">
              All Notes
            </h2>
            
            <div className="space-y-4">
              {logs
                .filter((log) => log.notes || isAdmin)
                .map((log) => (
                  <Card key={`note-${log.id}`} className="shadow-sm border-border overflow-hidden">
                    <CardHeader className="py-2.5 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-semibold">
                          {format(new Date(log.date + "T00:00:00"), "dd MMM yyyy")}
                        </CardTitle>
                      </div>
                      {isAdmin && editingNotes !== log.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2 hover:bg-muted"
                          onClick={() => {
                            setNotesValue(log.notes || "");
                            setEditingNotes(log.id);
                          }}
                        >
                          <StickyNote className="w-3 h-3 mr-1" />
                          {log.notes ? "Edit" : "Add Note"}
                        </Button>
                      )}
                    </CardHeader>
                    
                    <CardContent className="p-4 bg-card">
                      {isAdmin && editingNotes === log.id ? (
                        <div className="space-y-3 animate-fade-in">
                          <Textarea
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder={`Notes for ${format(new Date(log.date + "T00:00:00"), "MMMM do, yyyy")}...`}
                            className="min-h-[100px] text-sm font-normal resize-y"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setEditingNotes(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" className="text-xs h-8" onClick={() => handleSaveNotes(log.id)}>
                              <Send className="h-3 w-3 mr-1" />
                              Save Note
                            </Button>
                          </div>
                        </div>
                      ) : log.notes ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {log.notes}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No notes recorded for this date.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dynamic FABs based on active tab */}
        {isAdmin && activeTab === "feed" && <AddFeedDialog onAdded={fetchLogs} defaultFarmId={selectedFarmId} />}
        {isAdmin && activeTab === "oxygen" && <AddOxygenDialog onAdded={fetchLogs} defaultFarmId={selectedFarmId} />}
        {isAdmin && activeTab === "electric" && <AddMeterReadingDialog onAdded={fetchElectricData} meters={meters} />}
        <FarmsTable />
      </main>
    </div>
  );
}
