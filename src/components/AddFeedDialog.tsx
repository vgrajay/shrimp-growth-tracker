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
import { Plus, Loader2, Copy, Check, X } from "lucide-react";

interface FeedingTime {
  id: string;
  label: string;
  sort_order: number;
}

interface Farm {
  id: string;
  name: string;
}

interface Props {
  onAdded: () => void;
  defaultFarmId?: string;
}

export default function AddFeedDialog({ onAdded, defaultFarmId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedingTimes, setFeedingTimes] = useState<FeedingTime[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedFarm, setSelectedFarm] = useState("");
  const [amount, setAmount] = useState("");
  const [feedSize, setFeedSize] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  // Bulk fill state
  const [applyToAll, setApplyToAll] = useState(false);
  const [alreadyFilledSlots, setAlreadyFilledSlots] = useState<string[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form state when dialog opens
      setSelectedTime("");
      setSelectedFarm("");
      setAmount("");
      setFeedSize("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setApplyToAll(false);
      setAlreadyFilledSlots([]);

      // Fetch feeding times
      supabase
        .from("feeding_times")
        .select("*")
        .order("sort_order")
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching feeding times:", error);
            toast.error("Failed to load feeding times");
          } else if (data) {
            setFeedingTimes(data);
          }
        });

      // Fetch farms
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
            // Set default farm if provided
            if (defaultFarmId) {
              setSelectedFarm(defaultFarmId);
            } else if (data.length > 0) {
              setSelectedFarm(data[0].id);
            }
          }
        });
    }
  }, [open, defaultFarmId]);

  // Check which slots are already filled when date or farm changes
  useEffect(() => {
    if (!date || !selectedFarm || !open) return;

    const checkExistingSlots = async () => {
      setCheckingSlots(true);
      try {
        // Find the daily log for this date + farm
        const { data: log } = await supabase
          .from("daily_logs")
          .select("id")
          .eq("date", date)
          .eq("farm_id", selectedFarm)
          .maybeSingle();

        if (log) {
          // Get existing feed entries for this log
          const { data: entries } = await supabase
            .from("feed_entries")
            .select("feeding_time_id")
            .eq("log_id", log.id);

          if (entries) {
            setAlreadyFilledSlots(entries.map((e) => e.feeding_time_id));
          } else {
            setAlreadyFilledSlots([]);
          }
        } else {
          setAlreadyFilledSlots([]);
        }
      } catch {
        setAlreadyFilledSlots([]);
      } finally {
        setCheckingSlots(false);
      }
    };

    checkExistingSlots();
  }, [date, selectedFarm, open]);

  // Slots that would be filled by "apply to all"
  const remainingSlots = feedingTimes.filter(
    (ft) => !alreadyFilledSlots.includes(ft.id)
  );

  // When "apply to all" is on, we don't need the user to pick a specific time slot
  const effectiveSelectedTime = applyToAll ? "all" : selectedTime;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !feedSize || !selectedFarm) return;
    if (!applyToAll && !selectedTime) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Get or create daily log for this date and farm
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

      if (applyToAll) {
        // Bulk insert for all remaining (unfilled) slots
        const slotsToFill = remainingSlots;
        if (slotsToFill.length === 0) {
          toast.error("All time slots are already filled for this date");
          setLoading(false);
          return;
        }

        const entries = slotsToFill.map((ft) => ({
          log_id: log!.id,
          feeding_time_id: ft.id,
          amount: amountNum,
          feed_size: feedSize,
          created_by: user.id,
        }));

        const { error } = await supabase.from("feed_entries").insert(entries);
        if (error) throw error;

        toast.success(
          `Feed entries added for ${slotsToFill.length} time slot${slotsToFill.length > 1 ? "s" : ""}!`
        );
      } else {
        // Single entry
        if (alreadyFilledSlots.includes(selectedTime)) {
          toast.error("This time slot is already filled for this date");
          setLoading(false);
          return;
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
      }

      setOpen(false);
      setAmount("");
      setSelectedTime("");
      setFeedSize("");
      setApplyToAll(false);
      setSelectedFarm(defaultFarmId || (farms.length > 0 ? farms[0].id : ""));
      onAdded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
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
          <DialogTitle className="font-heading">Add Feed Entry</DialogTitle>
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

          {/* Amount & Feed Size BEFORE time selection */}
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

          {/* Apply to all toggle */}
          <div
            className={`rounded-lg border-2 p-3 transition-all cursor-pointer ${applyToAll
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/40"
              }`}
            onClick={() => setApplyToAll(!applyToAll)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Apply same amount to all time slots
                </span>
              </div>
              <div
                className={`flex items-center justify-center h-5 w-5 rounded-md border-2 transition-all ${applyToAll
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30"
                  }`}
              >
                {applyToAll && <Check className="h-3 w-3" />}
              </div>
            </div>

            {/* Show slot details when "apply to all" is toggled on */}
            {applyToAll && (
              <div className="mt-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {checkingSlots ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking existing entries...
                  </div>
                ) : (
                  <>
                    {remainingSlots.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          Will fill {remainingSlots.length} slot{remainingSlots.length > 1 ? "s" : ""}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {feedingTimes.map((ft) => {
                            const isFilled = alreadyFilledSlots.includes(ft.id);
                            return (
                              <span
                                key={ft.id}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-mono ${isFilled
                                    ? "bg-muted text-muted-foreground line-through"
                                    : "bg-primary/10 text-primary font-medium"
                                  }`}
                              >
                                {isFilled ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                {ft.label}
                              </span>
                            );
                          })}
                        </div>
                        {alreadyFilledSlots.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1 italic">
                            Slots with ✕ are already filled and will be skipped
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-destructive font-medium">
                        All time slots are already filled for this date!
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Show single time slot selector only if NOT applying to all */}
          {!applyToAll && (
            <div className="space-y-2">
              <Label>Feeding Time</Label>
              <Select key={`time-${feedingTimes.length}`} value={selectedTime} onValueChange={setSelectedTime} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {feedingTimes.map((ft) => {
                    const isFilled = alreadyFilledSlots.includes(ft.id);
                    return (
                      <SelectItem
                        key={ft.id}
                        value={ft.id}
                        disabled={isFilled}
                        className={isFilled ? "opacity-50" : ""}
                      >
                        {ft.label}
                        {isFilled && " ✓ filled"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              (applyToAll && remainingSlots.length === 0) ||
              (!applyToAll && !selectedTime)
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {applyToAll
              ? `Add to ${remainingSlots.length} Time Slot${remainingSlots.length !== 1 ? "s" : ""}`
              : "Add Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
