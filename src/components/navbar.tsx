
"use client";

import Link from "next/link";
import { BrainCircuit, History, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary p-2 rounded-lg group-hover:scale-110 transition-transform">
            <BrainCircuit className="text-primary-foreground h-6 w-6" />
          </div>
          <span className="text-xl font-headline font-bold text-primary">SmartAssess</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="hidden sm:flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              New Quiz
            </Button>
          </Link>
          <Link href="/dashboard#history">
            <Button variant="ghost" className="hidden sm:flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </Button>
          </Link>
          <Button size="sm" className="bg-primary hover:bg-primary/90">Sign In</Button>
        </div>
      </div>
    </nav>
  );
}
