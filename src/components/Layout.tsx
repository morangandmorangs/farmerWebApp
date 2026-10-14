import { FileText, LogOut, Sprout, Tractor } from "lucide-react";
import { NavLink, Navigate, Outlet } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Farm", icon: Tractor, end: true },
  { to: "/crops", label: "Crops", icon: Sprout, end: false },
  { to: "/documents", label: "Documents", icon: FileText, end: false },
];

export default function Layout() {
  const { farmer, loading, signOut } = useAuth();

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!farmer) return <Navigate to="/login" replace />;

  return (
    <div className="mx-auto min-h-svh max-w-4xl p-4">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="text-lg font-semibold">Local Mart Farmer</div>
          <div className="text-sm text-muted-foreground">{farmer.name}</div>
        </div>
        <Badge variant={farmer.profileStatus === "approved" ? "default" : "secondary"}>{farmer.profileStatus}</Badge>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </header>
      <nav className="mb-6 flex gap-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm", isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted")
            }>
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      {farmer.reviewNote && farmer.profileStatus !== "approved" && (
        <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm">Reviewer note: {farmer.reviewNote}</div>
      )}
      <Outlet />
    </div>
  );
}
