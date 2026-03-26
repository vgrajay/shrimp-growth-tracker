import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  User,
  IdCard,
  Mail,
  Calendar,
  Settings,
  Shield,
  Trash2,
} from "lucide-react";
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
}

export default function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [showWorkers, setShowWorkers] = useState(false);

  const displayName =
    user?.user_metadata?.display_name || user?.email || "User";
  const loginId = user?.user_metadata?.login_id || user?.email?.split("@")[0] || "";

  useEffect(() => {
    if (isAdmin) {
      fetchWorkers();
    }
  }, [isAdmin]);

  const fetchWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, login_id, created_at")
        .order("created_at", { ascending: true });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map<string, AppRole>();
      roles?.forEach((r) => rolesMap.set(r.user_id, r.role));

      const merged: WorkerProfile[] = (profiles ?? [])
        .map((p) => ({
          ...p,
          role: rolesMap.get(p.user_id) ?? "worker",
        }))
        .filter((w) => w.role === "worker");

      setWorkers(merged);
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handlePromoteWorker = async (worker: WorkerProfile) => {
    if (!window.confirm(`Are you sure you want to promote ${worker.display_name || 'this worker'} to an Admin?`)) return;
    
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", worker.user_id);
        
      if (error) throw error;
      
      toast.success(`${worker.display_name || 'Worker'} is now an Admin!`);
      // Update local state by removing them from the "worker" list
      setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to promote worker");
    }
  };

  const handleRemoveWorker = async (worker: WorkerProfile) => {
    if (!window.confirm(`Are you sure you want to completely remove ${worker.display_name || 'this worker'} from the farm system? They will lose all access.`)) return;
    
    try {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", worker.user_id);
      if (roleError) throw roleError;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", worker.id);
      if (profileError) throw profileError;

      toast.success(`${worker.display_name || 'Worker'} has been removed.`);
      setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to remove worker");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <img
            src="/decoders.png"
            alt="Decoders logo"
            className="h-8 w-8 object-cover rounded-full border border-primary/20 shadow-sm"
          />
          <h1 className="text-lg font-heading font-bold text-foreground">
            Shrimp Track
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isAdmin ? "default" : "secondary"}
            className="text-xs"
          >
            {isAdmin ? "Admin" : "Worker"}
          </Badge>

          {/* ─── Menu Sheet ─── */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 flex flex-col">
              <SheetHeader className="pb-4 border-b border-border">
                <SheetTitle className="text-left font-heading">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto space-y-6 py-4">
                {/* ─── Profile Info ─── */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Profile
                  </h3>
                  <div className="space-y-2 bg-muted/40 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {loginId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">
                        {user?.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isAdmin ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {isAdmin ? "Admin" : "Worker"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* ─── Settings ─── */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Settings className="h-3.5 w-3.5 inline mr-1" />
                    Settings
                  </h3>
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {theme === "dark" ? (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">Dark Mode</span>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={toggleTheme}
                    />
                  </div>
                </div>

                {/* ─── Workers (Admin Only) ─── */}
                {isAdmin && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setShowWorkers(!showWorkers);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Workers ({workers.length})
                      <span className="ml-auto text-[10px]">
                        {showWorkers ? "▲" : "▼"}
                      </span>
                    </button>

                    {showWorkers && (
                      <div className="space-y-2">
                        {loadingWorkers ? (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            Loading...
                          </p>
                        ) : workers.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            No workers found.
                          </p>
                        ) : (
                          workers.map((w) => (
                            <div
                              key={w.id}
                              className="bg-muted/40 rounded-lg p-3 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {w.display_name || "Unnamed"}
                                  </span>
                                  <Badge
                                    variant={
                                      w.role === "admin"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {w.role}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                    title="Promote to Admin"
                                    onClick={() => handlePromoteWorker(w)}
                                  >
                                    <Shield className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Remove Worker"
                                    onClick={() => handleRemoveWorker(w)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {w.login_id && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <IdCard className="h-3 w-3" />
                                    {w.login_id}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(
                                    new Date(w.created_at),
                                    "dd MMM yyyy"
                                  )}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Sign Out ─── */}
              <div className="border-t border-border pt-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
