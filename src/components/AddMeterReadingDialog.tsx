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
import { Plus, Loader2, Zap } from "lucide-react";

interface ElectricMeter {
  id: string;
  name: string;
}

interface Props {
  onAdded: () => void;
  meters: ElectricMeter[];
}

export default function AddMeterReadingDialog({ onAdded, meters }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState("");
  const [reading, setReading] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedMeter(meters.length > 0 ? meters[0].id : "");
      setReading("");
      setDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [open, meters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reading || !selectedMeter) return;

    const readingNum = parseFloat(reading);
    if (isNaN(readingNum) || readingNum < 0) {
      toast.error("Enter a valid reading value");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("electric_readings").insert({
        meter_id: selectedMeter,
        reading: readingNum,
        reading_date: date,
        created_by: user.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("A reading already exists for this meter on this date.");
        } else {
          throw error;
        }
      } else {
        toast.success("Meter reading added!");
        setOpen(false);
        onAdded();
      }
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
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg bg-yellow-600 hover:bg-yellow-700"
        >
          <Zap className="h-6 w-6 text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Add Meter Reading
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Reading Date</Label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Electric Meter</Label>
            <Select 
              key={`meter-select-${meters.length}-${selectedMeter}`}
              value={selectedMeter} 
              onValueChange={setSelectedMeter} 
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={meters.length > 0 ? "Select meter" : "No meters found"} />
              </SelectTrigger>
              <SelectContent>
                {meters.length > 0 ? (
                  meters.map((meter) => (
                    <SelectItem key={meter.id} value={meter.id}>
                      {meter.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No meters found. Please run SQL.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Meter Reading (kWh)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0"
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder="e.g. 12450.5"
                required
                className="pr-12"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">kWh</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-yellow-600 hover:bg-yellow-700 h-11"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Add Reading
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
