import { prisma } from "./db";
import type { Urgency } from "@prisma/client";

const URGENCY_RANK: Record<Urgency, number> = { critical: 3, high: 2, medium: 1, low: 0 };

/** Escalated cases ordered so the most important surface first. */
export async function listCasesForDashboard() {
  const cases = await prisma.case.findMany({
    include: {
      conversation: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
      claimedBy: { select: { id: true, name: true, email: true } },
    },
  });

  const statusRank: Record<string, number> = { new: 0, in_progress: 1, resolved: 2 };

  return cases.sort((a, b) => {
    // resolved sink to the bottom
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }
    // safeguarding first
    if (a.safeguarding !== b.safeguarding) return a.safeguarding ? -1 : 1;
    // then urgency
    if (URGENCY_RANK[a.urgency] !== URGENCY_RANK[b.urgency]) {
      return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
    }
    // then oldest first (longest waiting)
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export type DashboardCase = Awaited<ReturnType<typeof listCasesForDashboard>>[number];
