import { ChevronDown, Info, Leaf, LogOut, Sprout, Tractor } from "lucide-react";
import { Navigate, NavLink, Outlet } from "react-router-dom";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import WelcomeFooter from "@/components/WelcomeFooter";
import { useAuth } from "@/lib/auth";
import type { AuthFarmer } from "@/store/slice/authSlice";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Farm Profile", short: "Farm", icon: Tractor },
  { to: "/crops", label: "My Crops", short: "Crops", icon: Sprout },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "F";

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Leaf className="size-9 shrink-0 fill-primary text-green-950" strokeWidth={1.5} />
      <div className="leading-tight">
        <p className="text-lg font-bold">Local Mart</p>
        <p className="text-sm text-muted-foreground">Farmer</p>
      </div>
    </div>
  );
}

function UserMenu({ farmer, onSignOut }: { farmer: AuthFarmer; onSignOut: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="flex items-center gap-2.5 rounded-full p-0.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:pr-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials(farmer.name)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{farmer.name}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate font-medium">{farmer.name}</p>
          <p className="truncate text-xs text-muted-foreground">{farmer.email || farmer.phoneNumber}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The signed-in frame. Wide screens get a sidebar; phones, which most farmers
 * use, get a bar of large tabs along the bottom, within reach of a thumb.
 */
export default function Layout() {
  const { farmer, loading, signOut } = useAuth();

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!farmer) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <Brand className="px-6 py-6" />
        <nav aria-label="Sections" className="grid gap-1 px-3 pt-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "group flex h-12 items-center gap-3 rounded-xl px-4 font-medium transition-colors",
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
                )
              }>
              <Icon className="size-5 group-aria-[current=page]:text-highlight" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
            <Leaf className="size-8 shrink-0 fill-primary text-green-950 lg:hidden" strokeWidth={1.5} aria-hidden />
            <div className="mr-auto min-w-0">
              <p className="truncate font-semibold sm:text-lg">
                Welcome, {farmer.name} <span aria-hidden>👋</span>
              </p>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">Manage your farm and crops in one place.</p>
            </div>
            <ThemeToggle />
            <UserMenu farmer={farmer} onSignOut={signOut} />
          </div>
        </header>

        {/* Bottom padding on phones keeps the last of the page clear of the tab bar. */}
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pt-8 lg:pb-6">
          {farmer.reviewNote && farmer.profileStatus !== "approved" && (
            <div role="status" className="mb-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p>
                <span className="font-medium">Reviewer note:</span> {farmer.reviewNote}
              </p>
            </div>
          )}
          <main className="flex-1">
            <Outlet />
          </main>
          <WelcomeFooter />
        </div>
      </div>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2">
          {NAV.map(({ to, short, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn("group flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")
              }>
              <span className="grid h-8 w-16 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-primary group-aria-[current=page]:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              {short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
