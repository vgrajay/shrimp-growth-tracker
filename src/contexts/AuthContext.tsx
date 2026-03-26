import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  // `undefined` = auth not yet initialized; `null` = initialized, no session
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleFetched, setRoleFetched] = useState(false);

  // ── Effect 1: Auth state listener ────────────────────────────────────────
  // IMPORTANT: Keep this callback fully synchronous.
  // Making Supabase DB queries (await) inside onAuthStateChange causes a
  // deadlock on reload: Supabase's internal auth queue is still processing
  // the persisted-session refresh when the callback fires, so any new query
  // gets blocked behind it and never resolves → setLoading(false) never runs.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session?.user) {
          setRole(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Effect 2: Role fetching ───────────────────────────────────────────────
  // Runs in its own effect, safely outside the auth callback, keyed on the
  // user ID so it re-runs only when the logged-in user actually changes.
  useEffect(() => {
    // Wait until auth has initialized (session !== undefined)
    if (session === undefined) return;

    if (!session?.user?.id) {
      // No user: nothing to fetch, mark role as resolved
      setRoleFetched(true);
      return;
    }

    setRoleFetched(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRole(data?.role ?? "worker");
        setRoleFetched(true);
      });
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading until auth initializes AND role is resolved (if a user is present)
  const loading = session === undefined || !roleFetched;

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session: session ?? null,
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
