import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  Lock,
  Copy,
  Check,
  Building2,
  Plus,
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
  const { user, isAdmin, orgId, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [workers, setWorkers]           = useState<WorkerProfile[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [showWorkers, setShowWorkers]   = useState(false);
  const [inviteCode, setInviteCode]     = useState<string | null>(null);
  const [codeCopied, setCodeCopied]     = useState(false);

  // Add Farm state
  const [showAddFarm, setShowAddFarm]   = useState(false);
  const [newFarmName, setNewFarmName]   = useState("");
  const [addingFarm, setAddingFarm]     = useState(false);

  const displayName =
    user?.user_metadata?.display_name || user?.email || "User";
  const loginId = user?.user_metadata?.login_id || user?.email?.split("@")[0] || "";

  useEffect(() => {
    if (isAdmin) {
      fetchWorkers();
      fetchInviteCode();
    }
  }, [isAdmin, orgId]);

  const fetchInviteCode = async () => {
    try {
      const { data } = await supabase.rpc("get_my_invite_code");
      if (data) setInviteCode(data);
    } catch (err) {
      console.error("Failed to fetch invite code:", err);
    }
  };

  const fetchWorkers = async () => {
    if (!orgId) return;
    setLoadingWorkers(true);
    try {
      // Fetch org members (workers only) via org_members
      const { data: members } = await supabase
        .from("org_members")
        .select("user_id, role, created_at")
        .eq("org_id", orgId)
        .eq("role", "worker");

      if (!members || members.length === 0) {
        setWorkers([]);
        return;
      }

      const userIds = members.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, login_id, created_at")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      const merged: WorkerProfile[] = members.map((m) => {
        const p = profileMap.get(m.user_id);
        return {
          id:           p?.id ?? m.user_id,
          user_id:      m.user_id,
          display_name: p?.display_name ?? null,
          login_id:     p?.login_id ?? null,
          created_at:   p?.created_at ?? m.created_at,
          role:         m.role,
        };
      });

      setWorkers(merged);
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy manually.");
    }
  };

  const handleAddFarm = async () => {
    if (!newFarmName.trim()) return;
    setAddingFarm(true);
    try {
      const { error } = await supabase.rpc("create_farm", { _name: newFarmName.trim() });
      if (error) throw error;
      toast.success(`Farm "${newFarmName.trim()}" created!`);
      setNewFarmName("");
      setShowAddFarm(false);
      // Reload the page so dashboard picks up the new farm
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to create farm");
    } finally {
      setAddingFarm(false);
    }
  };

  const handleRemoveWorker = async (worker: WorkerProfile) => {
    if (!window.confirm(`Remove ${worker.display_name || "this worker"} from your farm? They will lose access.`)) return;
    if (!orgId) return;

    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", orgId)
        .eq("user_id", worker.user_id);

      if (error) throw error;
      toast.success(`${worker.display_name || "Worker"} has been removed.`);
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

                  {/* Theme Switch */}
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

                  {/* Change Password Section */}
                  <ChangePasswordSection />
                </div>

                {/* ─── Admin-Only Section ─── */}
                {isAdmin && (
                  <div className="space-y-4">

                    {/* Invite Code */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Worker Invite Code
                      </h3>
                      <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Share this code with workers so they can register and join your farm.
                        </p>
                        {inviteCode ? (
                          <div className="flex items-center gap-2 mt-2">
                            <code className="flex-1 text-sm font-mono font-bold tracking-widest bg-background border border-border rounded px-2 py-1 select-all text-primary">
                              {inviteCode}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={handleCopyCode}
                            >
                              {codeCopied
                                ? <Check className="h-3.5 w-3.5 text-green-500" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Loading...</p>
                        )}
                      </div>
                    </div>

                    {/* Add Farm */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Farms
                      </h3>
                      {showAddFarm ? (
                        <div className="space-y-2 bg-muted/40 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Input
                            placeholder="Farm name (e.g. Farm 4)"
                            value={newFarmName}
                            onChange={(e) => setNewFarmName(e.target.value)}
                            className="h-8 text-xs"
                            onKeyDown={(e) => e.key === "Enter" && handleAddFarm()}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={handleAddFarm}
                              disabled={addingFarm}
                            >
                              {addingFarm && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Create
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => { setShowAddFarm(false); setNewFarmName(""); }}
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8 gap-1.5"
                          onClick={() => setShowAddFarm(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add New Farm
                        </Button>
                      )}
                    </div>

                    {/* Workers List */}
                    <div className="space-y-3">
                      <button
                        onClick={() => { setShowWorkers(!showWorkers); }}
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
                            <div className="text-center py-4 space-y-1">
                              <p className="text-xs text-muted-foreground">No workers yet.</p>
                              <p className="text-[10px] text-muted-foreground/70">
                                Share your invite code with workers to get started.
                              </p>
                            </div>
                          ) : (
                            workers.map((w) => (
                              <div
                                key={w.id}
                                className="bg-muted/40 rounded-lg p-3 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium truncate">
                                    {w.display_name || "Unnamed"}
                                  </span>
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
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {w.login_id && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <IdCard className="h-3 w-3" />
                                      {w.login_id}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(w.created_at), "dd MMM yyyy")}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

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

function ChangePasswordSection() {
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [showForm,        setShowForm]        = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs h-8"
        onClick={() => setShowForm(!showForm)}
      >
        <Lock className="h-3 w-3 mr-1.5" />
        {showForm ? "Cancel" : "Change Password"}
      </Button>

      {showForm && (
        <form
          onSubmit={handleUpdatePassword}
          className="space-y-2 bg-muted/40 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase text-left block">
              New Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              className="h-8 text-xs font-mono"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase text-left block">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              className="h-8 text-xs font-mono"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full h-8 text-xs font-semibold" disabled={loading}>
            {loading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            Update Password
          </Button>
        </form>
      )}
    </div>
  );
}
