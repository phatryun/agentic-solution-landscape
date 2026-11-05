import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Navbar } from "@/components/layout/navbar";

export const metadata = { title: "Dashboard — GenAI Landscape" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "EDITOR";

  const [mySubmissions, pendingSubmissions, recentScans] = await Promise.all([
    // User's own submissions
    db.submission.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Pending submissions (admins only)
    isAdmin
      ? db.submission.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
          take: 20,
        })
      : Promise.resolve([]),
    // Recent scan logs (admins only)
    isAdmin
      ? db.agentScanLog.findMany({
          orderBy: { startedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Dashboard</h1>
        <DashboardView
          isAdmin={isAdmin}
          mySubmissions={mySubmissions}
          pendingSubmissions={pendingSubmissions}
          recentScans={recentScans}
          userId={session.user.id}
        />
      </main>
    </>
  );
}
