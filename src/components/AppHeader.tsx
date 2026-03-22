import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shell, LogOut } from "lucide-react";

export default function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <Shell className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-heading font-bold text-foreground">ShrimpGrowthPro</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
            {isAdmin ? "Admin" : "Worker"}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
