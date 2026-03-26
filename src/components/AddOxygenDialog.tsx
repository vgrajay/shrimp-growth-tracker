import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface Farm {
  id: string;
  name: string;
}

interface Props {
  onAdded: () => void;
  defaultFarmId?: string;
}

export default function AddOxygenDialog({ onAdded, defaultFarmId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  const [startTime, setStartTime] = useState("");
  const [offTime, setOffTime] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStartTime("");
      setOffTime("");
      setDate(format(new Date(), "yyyy-MM-dd"));

      supabase
        .from("farms")
        .select("*")
        .order("name")
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching farms:", error);
            toast.error("Failed to load farms");
          } else if (data) {
            setFarms(data);
            if (defaultFarmId) {
              setSelectedFarm(defaultFarmId);
            } else if (data.length > 0) {
              setSelectedFarm(data[0].id);
            }
          }
        });
    }
  }, [open, defaultFarmId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFarm || !startTime || !offTime) return;

    setLoading(true);
    try {
      let { data: log } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("date", date)
        .eq("farm_id", selectedFarm)
        .maybeSingle();

      if (!log) {
        const { data: newLog, error: logErr } = await supabase
          .from("daily_logs")
          .insert({ date, farm_id: selectedFarm })
          .select("id")
          .single();
        if (logErr) throw logErr;
        log = newLog;
      }

      const { error } = await supabase.from("oxygen_entries").insert({
        log_id: log!.id,
        start_time: startTime + ":00",
        off_time: offTime + ":00",
        created_by: user.id,
      });
      if (error) throw error;

      toast.success("Oxygen entry added!");
      setOpen(false);
      setStartTime("");
      setOffTime("");
      setSelectedFarm(defaultFarmId || (farms.length > 0 ? farms[0].id : ""));
      onAdded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Oxygen Motor Log</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Farm</Label>
            <Select key={`farm-${farms.length}`} value={selectedFarm} onValueChange={setSelectedFarm} required>
              <SelectTrigger>
                <SelectValue placeholder="Select farm" />
              </SelectTrigger>
              <SelectContent>
                {farms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Off Time</Label>
              <Input
                type="time"
                value={offTime}
                onChange={(e) => setOffTime(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Entry
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
