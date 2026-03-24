import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Weight, TrendingUp, Calendar } from "lucide-react";

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
  feed_entries: FeedEntry[];
}

interface Props {
  log: DailyLog;
  previousAbw: number | null;
  onRefresh: () => void;
  totalCumulativeFeed: number;
  farmDoc?: string | null;
}

export default function DailyLogCard({ log, previousAbw, onRefresh, totalCumulativeFeed, farmDoc }: Props) {
  const { isAdmin } = useAuth();
  const [editingAbw, setEditingAbw] = useState(false);
  const [abwValue, setAbwValue] = useState(log.abw?.toString() ?? "");

  const adg = log.abw && previousAbw ? ((log.abw - previousAbw) / 7).toFixed(3) : null;
  const totalFeed = log.feed_entries.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate days since DOC
  const daysFromDoc = farmDoc 
    ? differenceInDays(new Date(log.date + "T00:00:00"), new Date(farmDoc + "T00:00:00")) + 1
    : null;

  const handleSaveAbw = async () => {
    const val = parseFloat(abwValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a valid ABW value");
      return;
    }
    const { error } = await supabase
      .from("daily_logs")
      .update({ abw: val })
      .eq("id", log.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("ABW updated");
      setEditingAbw(false);
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this log and all feed entries?")) return;
    const { error } = await supabase.from("daily_logs").delete().eq("id", log.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Log deleted");
      onRefresh();
    }
  };

  const sortedEntries = [...log.feed_entries].sort(
    (a, b) => (a.feeding_times?.sort_order ?? 0) - (b.feeding_times?.sort_order ?? 0)
  );

  return (
    <Card className="animate-fade-in border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-heading font-semibold text-foreground">
            {format(new Date(log.date + "T00:00:00"), "dd/MM/yyyy")}
          </CardTitle>
          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(log.date + "T00:00:00"), "EEEE")}
            </p>
            {daysFromDoc !== null && (
              <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                <Calendar className="h-3 w-3 mr-1" />
                Day {daysFromDoc}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalFeed > 0 && (
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="text-xs font-mono">
                Day: {totalFeed.toFixed(1)} kg
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                Cumulative: {totalCumulativeFeed.toFixed(1)} kg
              </Badge>
            </div>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Feed entries */}
        {sortedEntries.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-muted rounded-md px-3 py-1.5 text-sm"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground">{entry.feeding_times?.label ?? "Unknown"}</span>
                  {entry.feed_size && (
                    <span className="text-xs text-muted-foreground">Size: {entry.feed_size}</span>
                  )}
                </div>
                <span className="font-mono font-medium text-foreground">{entry.amount} kg</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No feed entries yet</p>
        )}

        {/* ABW & ADG - Admin only */}
        {isAdmin && (
        <div className="flex items-center gap-3 pt-1 border-t border-border">
          <div className="flex items-center gap-1.5 flex-1">
            <Weight className="h-3.5 w-3.5 text-primary" />
            {editingAbw && isAdmin ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.01"
                  value={abwValue}
                  onChange={(e) => setAbwValue(e.target.value)}
                  className="h-7 w-20 text-xs"
                />
                <Button size="sm" variant="default" className="h-7 text-xs px-2" onClick={handleSaveAbw}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingAbw(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => isAdmin && setEditingAbw(true)}
                className={`text-xs font-medium ${isAdmin ? "cursor-pointer hover:text-primary" : ""}`}
              >
                ABW: {log.abw ? `${log.abw}g` : "—"}
              </button>
            )}
          </div>
          {adg && isAdmin && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-mono text-success">ADG: {adg}g</span>
            </div>
          )}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
