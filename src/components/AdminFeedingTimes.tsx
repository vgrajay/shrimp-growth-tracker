import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Clock } from "lucide-react";

interface FeedingTime {
  id: string;
  label: string;
  sort_order: number;
}

export default function AdminFeedingTimes() {
  const [times, setTimes] = useState<FeedingTime[]>([]);
  const [newLabel, setNewLabel] = useState("");

  const fetchTimes = async () => {
    const { data } = await supabase
      .from("feeding_times")
      .select("*")
      .order("sort_order");
    if (data) setTimes(data);
  };

  useEffect(() => { fetchTimes(); }, []);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const nextOrder = times.length > 0 ? Math.max(...times.map((t) => t.sort_order)) + 1 : 1;
    const { error } = await supabase
      .from("feeding_times")
      .insert({ label: newLabel.trim(), sort_order: nextOrder });
    if (error) toast.error(error.message);
    else {
      toast.success("Feeding time added");
      setNewLabel("");
      fetchTimes();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("feeding_times").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      fetchTimes();
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Feeding Times
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {times.map((t) => (
          <div key={t.id} className="flex items-center justify-between bg-muted rounded-md px-3 py-2 text-sm">
            <span>{t.label}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(t.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Night (21:00)"
            className="text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
