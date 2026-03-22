import { useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return session ? <Dashboard /> : <Login />;
}
