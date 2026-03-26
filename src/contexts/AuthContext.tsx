import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the current user ID so we skip redundant role fetches on
  // TOKEN_REFRESHED events (same user, new token — role hasn't changed).
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    /**
     * Fetch the user's role from the DB.  This is intentionally a standalone
     * function called via setTimeout — never awaited inside onAuthStateChange.
     */
    async function fetchRole(userId: string) {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (mounted) setRole(data?.role ?? "worker");
      } catch {
        // Fallback: if the query fails (RLS, network, etc.), default to worker
        // so the app doesn't stay stuck on the loading screen.
        if (mounted) setRole("worker");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // ── Auth state listener ───────────────────────────────────────────────
    //
    // CRITICAL: This callback MUST stay fully synchronous.
    //
    // On page reload, Supabase restores the persisted session and holds an
    // internal auth-queue lock while doing so.  If we `await` a DB query
    // inside this callback, that query gets enqueued behind the lock and
    // never resolves — causing an infinite loading state.
    //
    // The fix: set React state synchronously, then kick off the async role
    // fetch via `setTimeout(fn, 0)` which runs on the next microtask,
    // *after* the auth lock has been released.
    //
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          // Only fetch the role when the user actually changes.
          // TOKEN_REFRESHED fires with the same user — no need to re-query.
          if (newSession.user.id !== currentUserIdRef.current) {
            currentUserIdRef.current = newSession.user.id;
            setLoading(true);
            setTimeout(() => {
              if (mounted) fetchRole(newSession.user.id);
            }, 0);
          } else {
            // Same user, just a token refresh — make sure loading is off.
            setLoading(false);
          }
        } else {
          // Signed out or no session
          currentUserIdRef.current = null;
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Let onAuthStateChange handle all state cleanup via the SIGNED_OUT event.
    // We only call the Supabase API here.
    const { error } = await supabase.auth.signOut();

    // Safety net: if signOut errors (e.g. network issue, expired refresh token)
    // force-clear client state so the user isn't trapped on the dashboard.
    if (error) {
      currentUserIdRef.current = null;
      setSession(null);
      setRole(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        isAdmin: role === "admin",
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
