"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, LayoutGrid, LogIn, LogOut, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/80">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/landscape" className="group flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-neon text-background shadow-[0_0_16px_-2px_hsl(var(--primary)/0.6)]">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="text-gradient font-mono text-sm tracking-tight">
            GenAI Landscape
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/search">
                  <Search className="mr-1 h-4 w-4" /> Search
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/submit">
                  <PlusCircle className="mr-1 h-4 w-4" /> Submit a tool
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => signIn()}>
              <LogIn className="mr-1 h-4 w-4" /> Sign in
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
