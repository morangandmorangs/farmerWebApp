import { LogOut, Sprout, Tractor } from "lucide-react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import WelcomeFooter from "@/components/WelcomeFooter";
import { useAuth } from "@/lib/auth";

const TABS = [
  { to: "/", label: "Farm", icon: Tractor },
  { to: "/crops", label: "Crops", icon: Sprout },
];

export default function Layout() {
  const { farmer, loading, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // The tab follows the address, so a reload or a link lands on the right one.
  const current = TABS.find((t) => t.to !== "/" && pathname.startsWith(t.to))?.to ?? "/";

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!farmer) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-svh flex-col">
      {/* Dark green in the light theme. In the dark theme it takes the page colour, with a line under it. */}
      <header className="bg-green-900 dark:border-b dark:bg-background">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 p-4">
          <div className="mr-auto">
            <div className="text-lg font-semibold text-white dark:text-foreground">Local Mart Farmer</div>
            <div className="text-sm text-green-100 dark:text-muted-foreground">{farmer.name}</div>
          </div>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pt-6 pb-4">
        <Tabs
          value={current}
          onValueChange={(value) => {
            const tab = TABS.find((t) => t.to === value);
            if (tab) navigate(tab.to);
          }}
          className="mb-6">
          <TabsList aria-label="Sections">
            {TABS.map(({ to, label, icon: Icon }) => (
              <TabsTrigger key={to} value={to} className="px-3">
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {farmer.reviewNote && farmer.profileStatus !== "approved" && (
          <div className="mb-4 rounded-md border bg-muted/40 p-3 text-sm">Reviewer note: {farmer.reviewNote}</div>
        )}
        <main className="flex-1">
          <Outlet />
        </main>
        <WelcomeFooter />
      </div>
    </div>
  );
}
