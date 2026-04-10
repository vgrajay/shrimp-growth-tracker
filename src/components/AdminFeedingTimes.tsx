import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Clock } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeedingTime {
  id: string;
  label: string;
  sort_order: number;
  farm_id?: string | null;
}

interface Farm {
  id: string;
  name: string;
}

export default function AdminFeedingTimes() {
  const [times, setTimes] = useState<FeedingTime[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");
  const [newLabel, setNewLabel] = useState("");

  const fetchFarms = async () => {
    const { data } = await supabase.from("farms").select("id, name").order("name");
    if (data) setFarms(data);
  };

  const fetchTimes = async () => {
    const { data } = await supabase
      .from("feeding_times")
      .select("*")
      .order("sort_order");
    if (data) setTimes(data as FeedingTime[]);
  };

  useEffect(() => {
    fetchFarms();
    fetchTimes();
  }, []);

  // Derived: Filtered times based on selection
  const filteredTimes = times.filter((t) => {
    if (selectedFarmId === "all") return !t.farm_id;
    return t.farm_id === selectedFarmId;
  });

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const nextOrder = times.length > 0 ? Math.max(...times.map((t) => t.sort_order)) + 1 : 1;
    
    const insertData: any = { 
      label: newLabel.trim(), 
      sort_order: nextOrder 
    };
    
    if (selectedFarmId !== "all") {
      insertData.farm_id = selectedFarmId;
    }

    const { error } = await supabase
      .from("feeding_times")
      .insert(insertData);

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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Schedules
          </CardTitle>
          
          <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
            <SelectTrigger className="h-8 w-[140px] text-[10px] uppercase font-semibold">
              <SelectValue placeholder="Select farm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Global Times</SelectItem>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-2">
          {selectedFarmId === "all" ? "Common Schedule" : "Farm Specific Times"}
        </p>
        <div className="space-y-2">
          {filteredTimes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No times defined for this selection.</p>
          ) : (
            filteredTimes.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-muted/50 border border-border rounded-md px-3 py-2 text-sm shadow-sm">
                <span className="font-medium">{t.label}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
        
        <div className="flex gap-2 pt-2 border-t border-border mt-4">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New time (e.g. 05:00)"
            className="text-xs h-9"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} className="h-9 w-9 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
