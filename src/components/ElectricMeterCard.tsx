import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, History, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface ElectricMeter {
  id: string;
  name: string;
  description: string;
}

export interface ElectricReading {
  id: string;
  meter_id: string;
  reading: number;
  reading_date: string;
}

interface Props {
  meter: ElectricMeter;
  readings: ElectricReading[];
  onRefresh: () => void;
}

export default function ElectricMeterCard({ meter, readings, onRefresh }: Props) {
  const { isAdmin } = useAuth();
  // Sort readings by date descending
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
  );

  const getConsumption = (index: number) => {
    if (index >= sortedReadings.length - 1) return null;
    const current = sortedReadings[index].reading;
    const previous = sortedReadings[index + 1].reading;
    return (current - previous).toFixed(1);
  };

  const latestReading = sortedReadings[0];
  const latestConsumption = getConsumption(0);

  const handleDeleteReading = async (id: string, date: string) => {
    if (!window.confirm(`Delete reading for ${date}?`)) return;

    try {
      const { error } = await supabase
        .from("electric_readings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Reading deleted");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete reading");
    }
  };

  return (
    <Card className="animate-fade-in border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex flex-row items-center justify-between bg-yellow-50/50 dark:bg-yellow-900/10">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-100 p-2 rounded-full dark:bg-yellow-900/30">
            <Zap className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <CardTitle className="text-sm font-heading font-semibold">
              {meter.name}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              {meter.description}
            </p>
          </div>
        </div>
        {latestConsumption !== null && (
          <Badge variant="outline" className="bg-white dark:bg-background border-yellow-200 text-yellow-700 dark:text-yellow-400 font-mono">
            {latestConsumption} kWh
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {sortedReadings.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground italic border-2 border-dashed rounded-lg">
            No readings recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {/* Latest Reading Highlight */}
            <div className="bg-muted/30 rounded-lg p-3 flex justify-between items-center border border-border">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Latest Reading</p>
                <p className="text-sm font-bold font-mono">
                  {latestReading.reading.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">kwh</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Date</p>
                <p className="text-xs font-medium">
                  {format(new Date(latestReading.reading_date + "T00:00:00"), "dd MMM yyyy")}
                </p>
              </div>
            </div>

            {/* Historical Readings List */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-2">
                <History className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">History</span>
              </div>
              
              {sortedReadings.slice(0, 5).map((r, i) => {
                const consumption = getConsumption(i);
                return (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0 hover:bg-muted/20 px-1 rounded transition-colors group">
                    <span className="text-muted-foreground">
                      {format(new Date(r.reading_date + "T00:00:00"), "dd/MM")}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono">{r.reading.toFixed(1)}</span>
                        {consumption !== null && (
                          <span className="font-mono text-[10px] bg-primary/5 px-1.5 py-0.5 rounded text-primary group-hover:bg-primary/10">
                            {consumption} kWh
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteReading(r.id, r.reading_date)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
