import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl font-semibold text-foreground">Page not found</p>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild>
        <Link href="/landscape">Back to landscape</Link>
      </Button>
    </main>
  );
}
