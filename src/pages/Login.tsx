import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Shell, Loader2, User, Mail, Lock, IdCard } from "lucide-react";

export default function Login() {
  // Login fields
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up fields
  const [signUpLoginId, setSignUpLoginId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEmail = (input: string) => input.includes("@");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let emailToUse = loginInput.trim();

      // If input looks like an email, use it directly
      // Otherwise, it's a User ID — look up the email via RPC
      if (!isEmail(emailToUse)) {
        const { data: emailResult, error: lookupError } = await supabase
          .rpc("get_email_by_login_id", { _login_id: emailToUse });

        if (lookupError) {
          console.error("RPC lookup error:", lookupError);
          throw new Error("Failed to look up User ID. Make sure the database migration has been run.");
        }
        if (!emailResult) {
          throw new Error("User ID not found. Please check and try again.");
        }
        emailToUse = emailResult;
      }

      // Sign in with email + password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
      if (signInError) throw signInError;

      toast.success("Logged in successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      // Use a dedicated demo account with limited "worker" permissions
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: "demo@gmail.com",
        password: "demo123456",
      });
      if (signInError) throw signInError;
      toast.success("Logged in as Guest successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message + " (Please ensure demo account is created in Supabase)");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (signUpPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      setLoading(false);
      return;
    }

    const idRegex = /^[a-zA-Z0-9_.\-]+$/;
    if (!idRegex.test(signUpLoginId.trim())) {
      toast.error("User ID can only contain letters, numbers, dots, hyphens, and underscores.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: signUpPassword,
        options: {
          data: {
            display_name: displayName.trim() || email.trim(),
            login_id: signUpLoginId.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Account created! You can now sign in with your User ID or Gmail.");
      setIsSignUp(false);
      setLoginInput(signUpLoginId.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
            {isSignUp
              ? "Create your account with Gmail"
              : "Sign in with User ID or Gmail"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            /* ─── SIGN UP FORM ─── */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signUpLoginId">User ID</Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signUpLoginId"
                    required
                    value={signUpLoginId}
                    onChange={(e) => setSignUpLoginId(e.target.value)}
                    placeholder="e.g. worker01"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose a unique ID (letters, numbers, dots, hyphens, underscores)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Gmail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signUpPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signUpPassword"
                    type="password"
                    required
                    minLength={6}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          ) : (
            /* ─── LOGIN FORM ─── */
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
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
