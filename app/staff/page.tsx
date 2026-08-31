import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listCasesForDashboard } from "@/lib/cases";
import { ClaimButton, LogoutButton, SafeguardingBadge, StatusControl, UrgencyBadge } from "./ui";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  academic: "Academic",
  financial: "Financial",
  visa_immigration: "Visa / immigration",
  housing: "Housing",
  health_wellbeing: "Health / wellbeing",
  other: "Other",
};

export default async function StaffDashboard() {
  const session = await getSession();
  if (!session) redirect("/staff/login");

  const cases = await listCasesForDashboard();
  const open = cases.filter((c) => c.status !== "resolved");
  const resolved = cases.filter((c) => c.status === "resolved");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Welfare desk</h1>
          <p className="text-sm text-neutral-500">
            Signed in as {session.name} · {open.length} open case{open.length === 1 ? "" : "s"}
          </p>
        </div>
        <LogoutButton />
      </div>

      <section className="mt-8 space-y-3">
        {open.length === 0 && (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
            No open cases. Escalations from the assistant will appear here, most urgent first.
          </p>
        )}
        {open.map((c) => (
          <article
            key={c.id}
            className={`rounded-xl border bg-white p-4 ${
              c.safeguarding ? "border-red-200 ring-1 ring-red-100" : "border-neutral-200"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {c.safeguarding && <SafeguardingBadge />}
              <UrgencyBadge urgency={c.urgency} />
              <span className="text-xs text-neutral-500">{CATEGORY_LABEL[c.category]}</span>
              <span className="text-xs text-neutral-400">
                · {new Date(c.createdAt).toLocaleString()}
              </span>
              <span className="ml-auto">
                <StatusControl caseId={c.id} status={c.status} />
              </span>
            </div>

            <p className="mt-3 text-sm text-neutral-800">{c.summary}</p>

            <p className="mt-2 text-xs text-neutral-500">
              {c.conversation.studentName || "Name not given"} ·{" "}
              {c.conversation.studentEmail || "email not given"} ·{" "}
              {c.conversation.messages.length} message
              {c.conversation.messages.length === 1 ? "" : "s"}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <ClaimButton caseId={c.id} claimedByName={c.claimedBy?.name ?? null} />
              <Link
                href={`/staff/cases/${c.id}`}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Open conversation →
              </Link>
            </div>
          </article>
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
            Resolved ({resolved.length})
          </h2>
          <div className="mt-3 space-y-2">
            {resolved.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/60 p-3 text-sm text-neutral-500"
              >
                <span className="line-through">{c.summary.slice(0, 80)}</span>
                <span className="ml-auto">
                  <StatusControl caseId={c.id} status={c.status} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
