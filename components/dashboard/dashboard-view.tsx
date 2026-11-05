"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Submission, AgentScanLog } from "@prisma/client";

interface Props {
  isAdmin: boolean;
  mySubmissions: Submission[];
  pendingSubmissions: Submission[];
  recentScans: AgentScanLog[];
  userId: string;
}

const statusIcon = {
  PENDING: <Clock className="h-4 w-4 text-amber-500" />,
  APPROVED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  REJECTED: <XCircle className="h-4 w-4 text-destructive" />,
};

export function DashboardView({
  isAdmin,
  mySubmissions,
  pendingSubmissions,
  recentScans,
}: Props) {
  const [approving, setApproving] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState(pendingSubmissions);

  async function handleApprove(id: string) {
    setApproving(id);
    try {
      const res = await fetch(`/api/submissions/${id}/approve`, { method: "PUT" });
      if (res.ok) {
        setLocalPending((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setApproving(null);
    }
  }

  async function handleReject(id: string) {
    setApproving(id);
    try {
      const res = await fetch(`/api/submissions/${id}/reject`, { method: "PUT" });
      if (res.ok) {
        setLocalPending((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Admin: pending submissions review queue */}
      {isAdmin && localPending.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Review queue
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm text-amber-700">
              {localPending.length}
            </span>
          </h2>
          <div className="space-y-3">
            {localPending.map((sub) => (
              <div
                key={sub.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{sub.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sub.categorySlug} · {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1.5 text-sm text-foreground line-clamp-2">{sub.description}</p>
                    {sub.reviewNotes && (
                      <p className="mt-1.5 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        AI verdict: {sub.reviewNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(sub.id)}
                      disabled={approving === sub.id}
                    >
                      {approving === sub.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(sub.id)}
                      disabled={approving === sub.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin: recent scan logs */}
      {isAdmin && recentScans.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-foreground">Recent scans</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">New</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">
                      {new Date(scan.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          scan.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : scan.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-foreground">{scan.newSolutions}</td>
                    <td className="px-4 py-2 text-foreground">{scan.updatedSolutions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* My submissions */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">My submissions</h2>
        {mySubmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t submitted any tools yet.{" "}
            <a href="/submit" className="text-primary hover:underline">
              Submit one now
            </a>
            .
          </p>
        ) : (
          <div className="space-y-3">
            {mySubmissions.map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                {statusIcon[sub.status]}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.categorySlug} · {new Date(sub.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{sub.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
