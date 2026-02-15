"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ChevronDown,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Users,
} from "lucide-react";

const sidebarItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/data-sources", label: "Data Sources", icon: FolderOpen },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">NexusAI</span>
          </Link>
        </div>

        {/* New Button */}
        <div className="p-4">
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Source
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Usage Card */}
        <div className="p-4 border-t">
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Token Usage</span>
              <Badge variant="outline" className="text-xs">Startup</Badge>
            </div>
            <div className="text-2xl font-bold">45,230</div>
            <div className="text-xs text-muted-foreground mb-2">of 100,000/mo</div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary w-[45%] rounded-full" />
            </div>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-2">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">John Doe</span>
                  <span className="text-xs text-muted-foreground">john@example.com</span>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold">
              {sidebarItems.find((item) => 
                pathname === item.href || pathname.startsWith(item.href + "/")
              )?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              API Docs
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Data
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
