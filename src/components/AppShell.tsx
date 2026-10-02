import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, Home, LayoutDashboard, Menu, Package, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          activeOptions={{ exact: "exact" in n ? n.exact : false }}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Home className="h-4 w-4" />
      </div>
      <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">SmartLar</span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r border-sidebar-border bg-sidebar py-5 px-3 lg:flex">
        <Brand />
        <NavLinks />
        <p className="mt-auto px-3 text-xs text-sidebar-foreground/50">Gestão de automação residencial</p>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mb-6 mt-2">
            <Brand />
          </div>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
