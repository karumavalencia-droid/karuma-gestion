"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  SquarePen,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ChangeCenterStatus, DbCeoChangeRequest } from "@/lib/ceo/change-center";

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

const NEXT_STATUS: Record<ChangeCenterStatus, ChangeCenterStatus | null> = {
  draft: "planned",
  planned: "approved",
  approved: "executing",
  executing: "preview_ready",
  preview_ready: "completed",
  completed: null,
  failed: "planned",
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StepLine({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{title}</span>
      <span className="max-w-[70%] truncate font-medium text-gray-900">{value ?? "—"}</span>
    </div>
  );
}

export function ChangeCenterRequestDetail({ id }: { id: string }) {
  const [request, setRequest] = useState<DbCeoChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = useMemo(() => (request ? NEXT_STATUS[request.status] : null), [request]);

  async function loadRequest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ceo/change-requests/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar la solicitud");
      setRequest(data.request ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequest();
  }, [id]);

  async function updateRequest(payload: Record<string, unknown>) {
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
      setRequest(data.request ?? null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la solicitud");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading request...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Card title="Request not found">
          <div className="space-y-3 text-sm text-gray-600">
            <p>{error ?? "No request available."}</p>
            <Link href="/ceo" className="inline-flex items-center gap-2 font-medium text-karuma-600 hover:text-karuma-700">
              <ArrowLeft className="h-4 w-4" />
              Back to Change Center
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/ceo" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Link>
        <Button variant="secondary" size="sm" className="gap-2" onClick={loadRequest}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card
          title={request.title}
          action={
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGES[request.status]}`}>
                {STATUS_LABELS[request.status]}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {request.risk_level}
              </span>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Request</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{request.request_text}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{request.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={actionLoading || !nextStatus}
                onClick={() => nextStatus && updateRequest({ status: nextStatus })}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {nextStatus ? `Move to ${nextStatus}` : "No next step"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={actionLoading || request.status === "approved"}
                onClick={() => updateRequest({ status: "approved" })}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={actionLoading || request.status === "executing"}
                onClick={() => updateRequest({ status: "executing" })}
              >
                <Loader2 className="mr-2 h-4 w-4" />
                Start execution
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={actionLoading || request.status === "preview_ready"}
                onClick={() => updateRequest({ status: "preview_ready" })}
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Mark preview
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={actionLoading}
                onClick={() => updateRequest({ github_branch: request.github_branch ?? `change/${request.id.slice(0, 8)}` })}
              >
                <SquarePen className="mr-2 h-4 w-4" />
                Set branch stub
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                disabled={actionLoading}
                onClick={() => updateRequest({ vercel_preview_url: request.vercel_preview_url ?? "https://preview.example.com" })}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Set preview stub
              </Button>
              <Button
                variant="warning"
                size="sm"
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  updateRequest({
                    execution_notes: request.execution_notes ?? "Awaiting manual executor integration.",
                  })
                }
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Add note
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Execution details">
            <div className="space-y-3 text-sm">
              <StepLine title="Owner" value={request.created_by_name} />
              <StepLine title="Email" value={request.created_by_email} />
              <StepLine title="Role" value={request.created_by_role} />
              <StepLine title="Branch" value={request.github_branch} />
              <StepLine title="PR" value={request.github_pr_url} />
              <StepLine title="Preview" value={request.vercel_preview_url} />
              <StepLine title="Created" value={fmtDate(request.created_at)} />
              <StepLine title="Updated" value={fmtDate(request.updated_at)} />
            </div>
          </Card>

          <Card title="Timeline">
            <div className="space-y-3 text-sm">
              <StepLine title="Approved" value={fmtDate(request.approved_at)} />
              <StepLine title="Preview ready" value={fmtDate(request.preview_ready_at)} />
              <StepLine title="Completed" value={fmtDate(request.completed_at)} />
              <StepLine title="Failed" value={fmtDate(request.failed_at)} />
            </div>
          </Card>

          <Card title="Executor placeholders">
            <div className="space-y-3 text-sm text-gray-700">
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                GitHub branch: <span className="font-medium text-gray-900">{request.github_branch ?? "reserved"}</span>
              </div>
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                Draft PR: <span className="font-medium text-gray-900">{request.github_pr_url ?? "reserved"}</span>
              </div>
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                Vercel preview: <span className="font-medium text-gray-900">{request.vercel_preview_url ?? "reserved"}</span>
              </div>
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3">
                Notes: <span className="font-medium text-gray-900">{request.execution_notes ?? "reserved for executor output"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
