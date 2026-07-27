"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Layers3,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  SquarePen,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import type {
  ChangeCenterPlanStep,
  ChangeCenterStatus,
  DbCeoChangeRequest,
} from "@/lib/ceo/change-center";

const STATUS_LABELS: Record<ChangeCenterStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  approved: "Approved",
  executing: "Executing",
  preview_ready: "Preview ready",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_BADGES: Record<ChangeCenterStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  approved: "bg-amber-100 text-amber-800",
  executing: "bg-violet-100 text-violet-800",
  preview_ready: "bg-cyan-100 text-cyan-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

const RISK_BADGES = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
} as const;

const NEXT_STATUS: Record<ChangeCenterStatus, ChangeCenterStatus | null> = {
  draft: "planned",
  planned: "approved",
  approved: "executing",
  executing: "preview_ready",
  preview_ready: "completed",
  completed: null,
  failed: "planned",
};

const STATUS_ORDER: ChangeCenterStatus[] = [
  "draft",
  "planned",
  "approved",
  "executing",
  "preview_ready",
  "completed",
  "failed",
];

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StepItem({ step, index }: { step: ChangeCenterPlanStep; index: number }) {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta text-xs font-semibold text-white">
        {index + 1}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900">{step.title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${RISK_BADGES[step.risk]}`}>
            {step.risk}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600">{step.detail}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">Owner: {step.owner}</p>
      </div>
    </div>
  );
}

export function ChangeCenterPanel() {
  const [requests, setRequests] = useState<DbCeoChangeRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requestText, setRequestText] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0] ?? null,
    [requests, selectedId],
  );

  const groupedRequests = useMemo(() => {
    const grouped = new Map<ChangeCenterStatus, DbCeoChangeRequest[]>();
    for (const status of STATUS_ORDER) grouped.set(status, []);
    for (const request of requests) {
      grouped.get(request.status)?.push(request);
    }
    return STATUS_ORDER.map((status) => ({
      status,
      items: grouped.get(status) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [requests]);

  async function loadRequests() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ceo/change-requests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar las tareas");
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setSelectedId((current) => current ?? data.requests?.[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    if (!selected && requests.length > 0) setSelectedId(requests[0].id);
  }, [requests, selected]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ceo/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, requestText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear la solicitud");
      setRequests((current) => [data.request, ...current]);
      setSelectedId(data.request.id);
      setRequestText("");
      setTitle("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear la solicitud");
    } finally {
      setSaving(false);
    }
  }

  async function updateRequest(id: string, payload: Record<string, unknown>) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ceo/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo actualizar la solicitud");
      setRequests((current) => current.map((item) => (item.id === id ? data.request : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la solicitud");
    } finally {
      setActionLoading(false);
    }
  }

  const nextStatus = selected ? NEXT_STATUS[selected.status] : null;

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[380px_1fr] lg:px-6">
      <div className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <WandSparkles className="h-3.5 w-3.5" />
                Change Center V1
              </div>
              <h1 className="text-2xl font-semibold">Karuma system changes</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                Owner/Admin can submit a change request, see the structured plan, and move it through the approval flow.
              </p>
            </div>
            <Button variant="secondary" size="sm" className="gap-2 bg-white/10 text-white hover:bg-white/15" onClick={loadRequests}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
            <span className="rounded-full bg-white/10 px-2.5 py-1">draft → planned → approved → executing → preview_ready → completed</span>
            <span className="rounded-full bg-white/10 px-2.5 py-1">GitHub/Vercel fields reserved</span>
          </div>
        </div>

        <Card title="New request">
          <form className="space-y-3" onSubmit={createRequest}>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short title" />
            <textarea
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              placeholder="Describe the change you want Karuma to make..."
              className="min-h-40 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
            />
            <Button type="submit" className="w-full gap-2" disabled={saving || !requestText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit request
            </Button>
          </form>
        </Card>

        <Card title={`Requests (${requests.length})`}>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              No requests yet. Submit the first change request above.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedRequests.map((group) => (
                <div key={group.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${STATUS_BADGES[group.status]}`}>
                        {STATUS_LABELS[group.status]}
                      </span>
                      <span className="text-xs text-gray-400">{group.items.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((request) => (
                      <button
                        key={request.id}
                        className={`w-full rounded-2xl border p-3 text-left transition ${
                          request.id === selected?.id ? "border-karuma-300 bg-karuma-50" : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedId(request.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">{request.title}</p>
                            <p className="mt-1 max-h-10 overflow-hidden text-sm text-gray-600">{request.summary}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGES[request.status]}`}>
                            {STATUS_LABELS[request.status]}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <span>{fmtDate(request.created_at)}</span>
                          <span>•</span>
                          <span>{request.risk_level}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Open detail page</span>
                          <Link
                            href={`/ceo/change-requests/${request.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-karuma-600 hover:text-karuma-700"
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {selected ? (
          <>
            <Card
              title={selected.title}
              action={
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${RISK_BADGES[selected.risk_level]}`}>
                    {selected.risk_level}
                  </span>
                </div>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Request</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{selected.request_text}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{selected.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={actionLoading || !nextStatus}
                      onClick={() => nextStatus && updateRequest(selected.id, { status: nextStatus })}
                      >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {nextStatus ? `Move to ${nextStatus}` : "No next step"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={actionLoading || selected.status === "approved"}
                      onClick={() => updateRequest(selected.id, { status: "approved" })}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={actionLoading || selected.status === "executing"}
                      onClick={() => updateRequest(selected.id, { status: "executing" })}
                    >
                      <Loader2 className="mr-2 h-4 w-4" />
                      Start execution
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={actionLoading || selected.status === "preview_ready"}
                      onClick={() => updateRequest(selected.id, { status: "preview_ready" })}
                    >
                      <Clock3 className="mr-2 h-4 w-4" />
                      Mark preview
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        updateRequest(selected.id, {
                          github_branch: selected.github_branch ?? `change/${selected.id.slice(0, 8)}`,
                        })
                      }
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Set branch stub
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        updateRequest(selected.id, {
                          vercel_preview_url: selected.vercel_preview_url ?? "https://preview.example.com",
                        })
                      }
                      >
                      <Clock3 className="mr-2 h-4 w-4" />
                      Set preview stub
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        updateRequest(selected.id, {
                          execution_notes: selected.execution_notes ?? "Awaiting manual executor integration.",
                        })
                      }
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Add note
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Layers3 className="h-4 w-4 text-gray-500" />
                    Execution details
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Owner</dt>
                      <dd className="font-medium text-gray-900">{selected.created_by_name}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="font-medium text-gray-900">{selected.created_by_email}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Role</dt>
                      <dd className="font-medium text-gray-900">{selected.created_by_role}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Branch</dt>
                      <dd className="font-medium text-gray-900">{selected.github_branch ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Preview</dt>
                      <dd className="font-medium text-gray-900">{selected.vercel_preview_url ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">PR</dt>
                      <dd className="font-medium text-gray-900">{selected.github_pr_url ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Created</dt>
                      <dd className="font-medium text-gray-900">{fmtDate(selected.created_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Updated</dt>
                      <dd className="font-medium text-gray-900">{fmtDate(selected.updated_at)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Card>

            <Card title="Structured plan">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Risk</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">{selected.plan.riskLevel}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Plan summary</p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{selected.plan.summary}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assumptions</p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">
                    {selected.plan.assumptions.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  {selected.plan.steps.map((step, index) => (
                    <StepItem key={`${step.title}-${index}`} step={step} index={index} />
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Status timeline">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Approved</span>
                    <span className="font-medium text-gray-900">{fmtDate(selected.approved_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Preview ready</span>
                    <span className="font-medium text-gray-900">{fmtDate(selected.preview_ready_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Completed</span>
                    <span className="font-medium text-gray-900">{fmtDate(selected.completed_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Failed</span>
                    <span className="font-medium text-gray-900">{fmtDate(selected.failed_at)}</span>
                  </div>
                </div>
              </Card>

              <Card title="Automation placeholders">
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                    GitHub branch: <span className="font-medium text-gray-900">{selected.github_branch ?? "reserved"}</span>
                  </div>
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                    Draft PR: <span className="font-medium text-gray-900">{selected.github_pr_url ?? "reserved"}</span>
                  </div>
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                    Vercel preview: <span className="font-medium text-gray-900">{selected.vercel_preview_url ?? "reserved"}</span>
                  </div>
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                    Notes: <span className="font-medium text-gray-900">{selected.execution_notes ?? "reserved for executor output"}</span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <Card title="Details">
            <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
              Select a request to view the full plan and status history.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
