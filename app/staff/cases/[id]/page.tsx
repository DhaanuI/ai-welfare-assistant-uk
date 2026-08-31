import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ClaimButton, SafeguardingBadge, StatusControl, UrgencyBadge } from "../../ui";

export const dynamic = "force-dynamic";

export default async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/staff/login");

  const { id } = await params;
  const c = await prisma.case.findUnique({
    where: { id },
    include: {
      claimedBy: { select: { name: true } },
      conversation: {
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          triageResults: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!c) notFound();

  const triageByMessage = new Map(c.conversation.triageResults.map((t) => [t.messageId, t]));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/staff" className="text-sm text-neutral-400 hover:text-neutral-600">
        ← All cases
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {c.safeguarding && <SafeguardingBadge />}
        <UrgencyBadge urgency={c.urgency} />
        <span className="text-xs text-neutral-500">{c.category.replace("_", " / ")}</span>
        <span className="ml-auto flex items-center gap-3">
          <ClaimButton caseId={c.id} claimedByName={c.claimedBy?.name ?? null} />
          <StatusControl caseId={c.id} status={c.status} />
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Summary for staff</p>
        <p className="mt-1 text-sm text-neutral-800">{c.summary}</p>
        <p className="mt-3 text-xs text-neutral-500">
          {c.conversation.studentName || "Name not given"} ·{" "}
          {c.conversation.studentEmail || "email not given"}
        </p>
      </div>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-400">
        Conversation
      </h2>
      <div className="mt-3 space-y-3">
        {c.conversation.messages.map((m) => {
          const t = triageByMessage.get(m.id);
          return (
            <div key={m.id}>
              <div className={`flex ${m.role === "student" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "student"
                      ? "bg-emerald-700 text-white"
                      : m.role === "assistant"
                        ? "border border-neutral-200 bg-white text-neutral-800"
                        : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {m.content}
                </div>
              </div>
              {t && (
                <p className="mt-1 text-right text-[11px] text-neutral-400">
                  triage: {t.category} · {t.urgency} · {t.disposition}
                  {t.safeguarding ? " · safeguarding" : ""} ·{" "}
                  {t.modelOk ? "model ok" : "fallback"}
                  {t.appliedRules.length > 0 && ` · rules: ${t.appliedRules.join(", ")}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
