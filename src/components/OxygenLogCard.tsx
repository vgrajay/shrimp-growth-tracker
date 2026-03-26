import { format, differenceInCalendarDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Calendar, Wind } from "lucide-react";

interface OxygenEntry {
  id: string;
  start_time: string;
  off_time: string;
}

interface DailyLog {
  id: string;
  date: string;
  oxygen_entries: OxygenEntry[];
}

interface Props {
  log: DailyLog;
  onRefresh: () => void;
  farmDoc?: string | null;
}

export default function OxygenLogCard({ log, onRefresh, farmDoc }: Props) {
  const { isAdmin } = useAuth();
  
  const parsedFarmDoc = farmDoc 
    ? new Date(farmDoc.length === 10 ? farmDoc + "T00:00:00" : farmDoc)
    : null;
  const daysFromDoc = parsedFarmDoc 
    ? differenceInCalendarDays(new Date(log.date + "T00:00:00"), parsedFarmDoc)
    : null;

  const handleDeleteOxygenEntry = async (entryId: string) => {
    if (!confirm("Delete this oxygen motor log?")) return;
    const { error } = await supabase
      .from("oxygen_entries")
      .delete()
      .eq("id", entryId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Oxygen log deleted");
      onRefresh();
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch {
      return timeStr;
    }
  };

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
      </CardHeader>
      <CardContent className="space-y-3">
        {log.oxygen_entries && log.oxygen_entries.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            {log.oxygen_entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm group"
              >
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-mono text-foreground font-medium">
                      {formatTime(entry.start_time)} - {formatTime(entry.off_time)}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => handleDeleteOxygenEntry(entry.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No oxygen logs yet</p>
        )}
      </CardContent>
    </Card>
  );
}
