import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Mail, IdCard, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface WorkerProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  login_id: string | null;
  created_at: string;
  role: AppRole;
  email: string | null;
}

export default function WorkersTable() {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, login_id, created_at")
        .order("created_at", { ascending: true });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setLoading(false);
        return;
      }

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      // Merge profiles with roles
      const rolesMap = new Map<string, AppRole>();
      roles?.forEach((r) => rolesMap.set(r.user_id, r.role));

      const merged: WorkerProfile[] = (profiles ?? [])
        .map((p) => ({
          ...p,
          role: rolesMap.get(p.user_id) ?? "worker",
          email: null,
        }))
        .filter((w) => w.role === "worker");

      setWorkers(merged);
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading">
          <Users className="h-5 w-5 text-primary" />
          Workers ({workers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {workers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No workers found.
          </p>
        ) : (
          workers.map((worker) => (
            <div
              key={worker.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {worker.display_name || "Unnamed"}
                  </span>
                  <Badge
                    variant={worker.role === "admin" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {worker.role}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {worker.login_id && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IdCard className="h-3 w-3" />
                      {worker.login_id}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Joined {format(new Date(worker.created_at), "dd MMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
