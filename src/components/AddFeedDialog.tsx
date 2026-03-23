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

interface FeedingTime {
  id: string;
  label: string;
  sort_order: number;
}

interface Props {
  onAdded: () => void;
}

export default function AddFeedDialog({ onAdded }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedingTimes, setFeedingTimes] = useState<FeedingTime[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [amount, setAmount] = useState("");
  const [feedSize, setFeedSize] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      supabase
        .from("feeding_times")
        .select("*")
        .order("sort_order")
        .then(({ data }) => {
          if (data) setFeedingTimes(data);
        });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTime || !amount || !feedSize) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      // Get or create daily log for this date
      let { data: log } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("date", date)
        .maybeSingle();

      if (!log) {
        const { data: newLog, error: logErr } = await supabase
          .from("daily_logs")
          .insert({ date })
          .select("id")
          .single();
        if (logErr) throw logErr;
        log = newLog;
      }

      const { error } = await supabase.from("feed_entries").insert({
        log_id: log!.id,
        feeding_time_id: selectedTime,
        amount: amountNum,
        feed_size: feedSize,
        created_by: user.id,
      });
      if (error) throw error;

      toast.success("Feed entry added!");
      setOpen(false);
      setAmount("");
      setSelectedTime("");
      setFeedSize("");
      onAdded();
    } catch (err: any) {
      toast.error(err.message);
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
          <DialogTitle className="font-heading">Add Feed Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Feeding Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime} required>
              <SelectTrigger>
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                {feedingTimes.map((ft) => (
                  <SelectItem key={ft.id} value={ft.id}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2.5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Feed Size</Label>
            <Input
              type="text"
              value={feedSize}
              onChange={(e) => setFeedSize(e.target.value)}
              placeholder="e.g. 1s, 1m, 1l, 2s"
              required
            />
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
