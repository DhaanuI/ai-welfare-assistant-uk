"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const URGENCY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCY_STYLE[urgency] ?? ""}`}>
      {urgency}
    </span>
  );
}

export function SafeguardingBadge() {
  return (
    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
      ⚠ safeguarding
    </span>
  );
}

export function ClaimButton({ caseId, claimedByName }: { caseId: string; claimedByName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (claimedByName) {
    return <span className="text-xs text-neutral-500">claimed by {claimedByName}</span>;
  }

  function claim() {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/staff/cases/${caseId}/claim`, { method: "POST" });
      if (res.status === 409) {
        const data = await res.json();
        setMsg(`Already claimed by ${data.claimedBy}.`);
      } else if (!res.ok) {
        setMsg("Couldn't claim.");
      }
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={claim}
        disabled={pending}
        className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {pending ? "Claiming…" : "Claim"}
      </button>
      {msg && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}

export function StatusControl({ caseId, status }: { caseId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setStatus(next: string) {
    start(async () => {
      await fetch(`/api/staff/cases/${caseId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    });
  }

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => setStatus(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
    >
      <option value="new">new</option>
      <option value="in_progress">in progress</option>
      <option value="resolved">resolved</option>
    </select>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/staff/logout", { method: "POST" });
        router.push("/staff/login");
        router.refresh();
      }}
      className="text-xs text-neutral-500 hover:text-neutral-800"
    >
      Sign out
    </button>
  );
}
