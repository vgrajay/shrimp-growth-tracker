import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Farm {
  id: string;
  name: string;
  doc: string | null;
}

export default function FarmsTable() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFarms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("farms")
        .select("id, name, doc")
        .order("name")
        .limit(3);

      if (error) {
        console.error("Error fetching farms:", error);
        setFarms([]);
      } else {
        setFarms(data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch farms:", err);
      setFarms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">Farms Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading farms...</p>
        </CardContent>
      </Card>
    );
  }

  if (farms.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">Farms Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No farms found. Create one in admin settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading">Farms Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Farm No</TableHead>
                <TableHead className="font-semibold text-xs">DOC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farms.map((farm) => (
                <TableRow key={farm.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm font-medium">{farm.name}</TableCell>
                  <TableCell className="text-sm">
                    {farm.doc
                      ? format(new Date(farm.doc + "T00:00:00"), "dd/MM/yyyy")
                      : "Not Set"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
