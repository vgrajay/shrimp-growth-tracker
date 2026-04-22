import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Shell, Loader2, User, Mail, Lock, IdCard, Building2, KeyRound, ChevronLeft } from "lucide-react";

type Mode = "login" | "register-owner" | "register-worker";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);

  // ── Login fields ──────────────────────────────────
  const [loginInput, setLoginInput]   = useState("");
  const [password,   setPassword]     = useState("");

  // ── Farm Owner (admin) registration ──────────────
  const [ownerOrgName,    setOwnerOrgName]    = useState("");
  const [ownerName,       setOwnerName]       = useState("");
  const [ownerEmail,      setOwnerEmail]      = useState("");
  const [ownerPassword,   setOwnerPassword]   = useState("");
  const [ownerConfirm,    setOwnerConfirm]    = useState("");

  // ── Worker registration (via invite code) ─────────
  const [workerInvite,    setWorkerInvite]    = useState("");
  const [workerName,      setWorkerName]      = useState("");
  const [workerLoginId,   setWorkerLoginId]   = useState("");
  const [workerEmail,     setWorkerEmail]     = useState("");
  const [workerPassword,  setWorkerPassword]  = useState("");
  const [workerConfirm,   setWorkerConfirm]   = useState("");

  const isEmail = (s: string) => s.includes("@");

  // ── Handlers ──────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let emailToUse = loginInput.trim();

      if (!isEmail(emailToUse)) {
        const { data: emailResult, error: lookupError } = await supabase
          .rpc("get_email_by_login_id", { _login_id: emailToUse });

        if (lookupError) throw new Error("Failed to look up User ID. Make sure the database migration has been run.");
        if (!emailResult)  throw new Error("User ID not found. Please check and try again.");
        emailToUse = emailResult;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (error) throw error;
      toast.success("Logged in successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "demo@gmail.com",
        password: "demo123456",
      });
      if (error) throw error;
      toast.success("Logged in as Guest!");
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "An error") + " (Ensure demo account exists in Supabase)");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPassword !== ownerConfirm) {
      toast.error("Passwords do not match!");
      return;
    }
    if (!ownerOrgName.trim()) {
      toast.error("Please enter your farm / organization name.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: ownerEmail.trim(),
        password: ownerPassword,
        options: {
          data: {
            display_name: ownerName.trim() || ownerEmail.trim(),
            org_name: ownerOrgName.trim(),   // triggers org creation in handle_new_user
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Farm account created! You can now sign in.");
      setMode("login");
      setLoginInput(ownerEmail.trim());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workerPassword !== workerConfirm) {
      toast.error("Passwords do not match!");
      return;
    }
    if (!workerInvite.trim()) {
      toast.error("Please enter the invite code your farm owner gave you.");
      return;
    }
    const idRegex = /^[a-zA-Z0-9_.\-]+$/;
    if (!idRegex.test(workerLoginId.trim())) {
      toast.error("User ID can only contain letters, numbers, dots, hyphens, and underscores.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: workerEmail.trim(),
        password: workerPassword,
        options: {
          data: {
            display_name: workerName.trim() || workerEmail.trim(),
            login_id:     workerLoginId.trim(),
            invite_code:  workerInvite.trim(), // triggers org membership in handle_new_user
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Worker account created! You can now sign in with your User ID.");
      setMode("login");
      setLoginInput(workerLoginId.trim());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shell className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-heading font-bold text-foreground">
              ShrimpGrowthPro
            </CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            {mode === "login"           && "Sign in with User ID or Gmail"}
            {mode === "register-owner"  && "Register your farm"}
            {mode === "register-worker" && "Join your farm with an invite code"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* ─── Back button ─── */}
          {mode !== "login" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </button>
          )}

          {/* ─── LOGIN FORM ─── */}
          {mode === "login" && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginInput">User ID or Gmail</Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="loginInput"
                      required
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="User ID or Mail ID"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                Guest / Demo Access
              </Button>

              {/* Registration links */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-9 gap-1.5"
                  onClick={() => setMode("register-owner")}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Register Farm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-9 gap-1.5"
                  onClick={() => setMode("register-worker")}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Join with Code
                </Button>
              </div>
            </>
          )}

          {/* ─── FARM OWNER REGISTRATION ─── */}
          {mode === "register-owner" && (
            <form onSubmit={handleRegisterOwner} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerOrgName">Farm / Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerOrgName"
                    required
                    value={ownerOrgName}
                    onChange={(e) => setOwnerOrgName(e.target.value)}
                    placeholder="e.g. Coastal Shrimp Farm"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Your workers will join under this organization.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerName">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerEmail"
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerPassword"
                    type="password"
                    required
                    minLength={6}
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerConfirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ownerConfirm"
                    type="password"
                    required
                    minLength={6}
                    value={ownerConfirm}
                    onChange={(e) => setOwnerConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Farm Account
              </Button>
            </form>
          )}

          {/* ─── WORKER REGISTRATION ─── */}
          {mode === "register-worker" && (
            <form onSubmit={handleRegisterWorker} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workerInvite">Invite Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerInvite"
                    required
                    value={workerInvite}
                    onChange={(e) => setWorkerInvite(e.target.value)}
                    placeholder="Ask your farm owner for this"
                    className="pl-10 font-mono tracking-widest"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your farm owner can find this code in their menu → Invite Code.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerLoginId">User ID (for login)</Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerLoginId"
                    required
                    value={workerLoginId}
                    onChange={(e) => setWorkerLoginId(e.target.value)}
                    placeholder="e.g. ravi01"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Letters, numbers, dots, hyphens, underscores only.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerName">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerName"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerEmail"
                    type="email"
                    required
                    value={workerEmail}
                    onChange={(e) => setWorkerEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerPassword"
                    type="password"
                    required
                    minLength={6}
                    value={workerPassword}
                    onChange={(e) => setWorkerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workerConfirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="workerConfirm"
                    type="password"
                    required
                    minLength={6}
                    value={workerConfirm}
                    onChange={(e) => setWorkerConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Farm
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
