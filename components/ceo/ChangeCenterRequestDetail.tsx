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

function StepEditor({
  step,
  index,
  onChange,
  onRemove,
  onCopy,
  onMoveUp,
  onMoveDown,
}: {
  step: StepDraft;
  index: number;
  onChange: (next: StepDraft) => void;
  onRemove: () => void;
  onCopy: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">Step {index + 1}</p>
        <div className="flex items-center gap-2 text-xs font-medium">
          <button type="button" onClick={onMoveUp} className="text-karuma-600 hover:text-karuma-700">
            Up
          </button>
          <button type="button" onClick={onMoveDown} className="text-karuma-600 hover:text-karuma-700">
            Down
          </button>
          <button type="button" onClick={onCopy} className="text-karuma-600 hover:text-karuma-700">
            Copy
          </button>
          <button type="button" onClick={onRemove} className="text-red-600 hover:text-red-700">
            Remove
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</p>
          <input
            value={step.title}
            onChange={(event) => onChange({ ...step, title: event.target.value })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Owner</p>
          <select
            value={step.owner}
            onChange={(event) => onChange({ ...step, owner: event.target.value as StepDraft["owner"] })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
          >
            <option value="ai">ai</option>
            <option value="owner">owner</option>
            <option value="engineer">engineer</option>
            <option value="reviewer">reviewer</option>
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Risk</p>
          <select
            value={step.risk}
            onChange={(event) => onChange({ ...step, risk: event.target.value as StepDraft["risk"] })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Detail</p>
          <textarea
            value={step.detail}
            onChange={(event) => onChange({ ...step, detail: event.target.value })}
            className="min-h-20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
          />
        </div>
      </div>
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatLogLine(kind: "system" | "manual", message: string) {
  return `[${kind.toUpperCase()}] ${message}`;
}

function parseLogLine(value: string) {
  const match = value.match(/^\[(SYSTEM|MANUAL)\]\s*(.*)$/i);
  if (!match) {
    return { kind: "system" as const, message: value };
  }
  return {
    kind: match[1].toLowerCase() === "manual" ? ("manual" as const) : ("system" as const),
    message: match[2] ?? "",
  };
}

type StepDraft = {
  title: string;
  owner: "ai" | "owner" | "engineer" | "reviewer";
  risk: "low" | "medium" | "high" | "critical";
  detail: string;
};

const EMPTY_STEP: StepDraft = {
  title: "",
  owner: "ai",
  risk: "medium",
  detail: "",
};

export function ChangeCenterRequestDetail({ id }: { id: string }) {
  const [request, setRequest] = useState<DbCeoChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [requestTextDraft, setRequestTextDraft] = useState("");
  const [riskDraft, setRiskDraft] = useState<DbCeoChangeRequest["risk_level"]>("medium");
  const [assumptionsDraft, setAssumptionsDraft] = useState("");
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [logDraft, setLogDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextStatus = useMemo(() => (request ? NEXT_STATUS[request.status] : null), [request]);
  const appendLogLine = (line: string, kind: "system" | "manual" = "system") => {
    setLogDraft((current) => {
      const trimmed = current.trim();
      const entry = formatLogLine(kind, line);
      return trimmed ? `${trimmed}\n${entry}` : entry;
    });
  };

  async function loadRequest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ceo/change-requests/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar la solicitud");
      const nextRequest = data.request ?? null;
      setRequest(nextRequest);
      setTitleDraft(nextRequest?.title ?? "");
      setSummaryDraft(nextRequest?.summary ?? "");
      setRequestTextDraft(nextRequest?.request_text ?? "");
      setRiskDraft(nextRequest?.risk_level ?? "medium");
      setAssumptionsDraft((nextRequest?.plan.assumptions ?? []).join("\n"));
      setStepDrafts(
        (nextRequest?.plan.steps ?? []).map((step: { title: string; owner: string; risk: string; detail: string }) => ({
          title: step.title,
          owner: step.owner === "owner" || step.owner === "engineer" || step.owner === "reviewer" ? step.owner : "ai",
          risk: step.risk === "low" || step.risk === "medium" || step.risk === "high" || step.risk === "critical" ? step.risk : "medium",
          detail: step.detail,
        })),
      );
      setNotesDraft(nextRequest?.execution_notes ?? "");
      setLogDraft((nextRequest?.execution_log ?? []).join("\n"));
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
      if (payload.status && typeof payload.status === "string") {
        appendLogLine(`Status moved to ${payload.status}`, "system");
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la solicitud");
    } finally {
      setActionLoading(false);
    }
  }

  async function savePlan() {
    if (!request) return;
    setActionLoading(true);
    setError(null);
    try {
      const plan = {
        title: titleDraft.trim() || request.title,
        summary: summaryDraft.trim() || request.summary,
        assumptions: splitLines(assumptionsDraft),
        steps: stepDrafts
          .map((step) => ({
            title: step.title.trim(),
            owner: step.owner,
            risk: step.risk,
            detail: step.detail.trim(),
          }))
          .filter((step) => Boolean(step.title || step.detail)),
        riskLevel: riskDraft,
      };
      const executionLog = splitLines(logDraft);
      const res = await fetch(`/api/ceo/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleDraft,
          summary: summaryDraft,
          request_text: requestTextDraft,
          risk_level: riskDraft,
          plan,
          execution_notes: notesDraft,
          execution_log: executionLog,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar el plan");
      setRequest(data.request ?? null);
      setTitleDraft(data.request?.title ?? "");
      setSummaryDraft(data.request?.summary ?? "");
      setRequestTextDraft(data.request?.request_text ?? "");
      setRiskDraft(data.request?.risk_level ?? "medium");
      setAssumptionsDraft((data.request?.plan.assumptions ?? []).join("\n"));
      setStepDrafts(
        (data.request?.plan.steps ?? []).map((step: { title: string; owner: string; risk: string; detail: string }) => ({
          title: step.title,
          owner: step.owner === "owner" || step.owner === "engineer" || step.owner === "reviewer" ? step.owner : "ai",
          risk: step.risk === "low" || step.risk === "medium" || step.risk === "high" || step.risk === "critical" ? step.risk : "medium",
          detail: step.detail,
        })),
      );
      setNotesDraft(data.request?.execution_notes ?? "");
      setLogDraft((data.request?.execution_log ?? []).join("\n"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el plan");
    } finally {
      setActionLoading(false);
    }
  }

  async function startExecution() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ceo/change-requests/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_branch: request?.github_branch,
          github_pr_url: request?.github_pr_url,
          vercel_preview_url: request?.vercel_preview_url,
          execution_notes: notesDraft || request?.execution_notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "No se pudo iniciar la ejecución");
      setRequest(data.request ?? null);
      setTitleDraft(data.request?.title ?? "");
      setSummaryDraft(data.request?.summary ?? "");
      setRequestTextDraft(data.request?.request_text ?? "");
      setRiskDraft(data.request?.risk_level ?? "medium");
      setAssumptionsDraft((data.request?.plan.assumptions ?? []).join("\n"));
      setStepDrafts(
        (data.request?.plan.steps ?? []).map((step: { title: string; owner: string; risk: string; detail: string }) => ({
          title: step.title,
          owner: step.owner === "owner" || step.owner === "engineer" || step.owner === "reviewer" ? step.owner : "ai",
          risk: step.risk === "low" || step.risk === "medium" || step.risk === "high" || step.risk === "critical" ? step.risk : "medium",
          detail: step.detail,
        })),
      );
      setNotesDraft(data.request?.execution_notes ?? "");
      setLogDraft((data.request?.execution_log ?? []).join("\n"));
      appendLogLine("Execution placeholder started", "system");
    } catch (execError) {
      setError(execError instanceof Error ? execError.message : "No se pudo iniciar la ejecución");
    } finally {
      setActionLoading(false);
    }
  }

  const executionLog = useMemo(() => {
    if (logDraft.trim()) {
      return splitLines(logDraft);
    }
    if (!request) return [];
    return [
      `[${fmtDate(request.created_at)}] Request created by ${request.created_by_name}`,
      request.approved_at ? `[${fmtDate(request.approved_at)}] Approved by owner` : null,
      request.status === "executing" ? `[${fmtDate(request.updated_at)}] Execution placeholder started` : null,
      request.github_branch ? `[${fmtDate(request.updated_at)}] Branch reserved: ${request.github_branch}` : null,
      request.github_pr_url ? `[${fmtDate(request.updated_at)}] PR reserved: ${request.github_pr_url}` : null,
      request.vercel_preview_url ? `[${fmtDate(request.updated_at)}] Preview linked: ${request.vercel_preview_url}` : null,
      request.completed_at ? `[${fmtDate(request.completed_at)}] Marked as completed` : null,
      request.failed_at ? `[${fmtDate(request.failed_at)}] Marked as failed` : null,
    ].filter((line): line is string => Boolean(line));
  }, [logDraft, request]);

  function nowIso() {
    return new Date().toISOString();
  }

  function moveStep(index: number, direction: -1 | 1) {
    setStepDrafts((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
    appendLogLine(`Moved step ${index + 1} ${direction < 0 ? "up" : "down"}`, "manual");
  }

  function copyStep(index: number) {
    setStepDrafts((current) => {
      const source = current[index];
      if (!source) return current;
      const next = [...current];
      next.splice(index + 1, 0, { ...source });
      return next;
    });
    appendLogLine(`Copied step ${index + 1}`, "manual");
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
                onClick={startExecution}
              >
                <Loader2 className="mr-2 h-4 w-4" />
                Start execution placeholder
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

          <Card title="Edit plan">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Title</p>
                  <input
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Risk level</p>
                  <select
                    value={riskDraft}
                    onChange={(event) => setRiskDraft(event.target.value as DbCeoChangeRequest["risk_level"])}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</p>
                <textarea
                  value={summaryDraft}
                  onChange={(event) => setSummaryDraft(event.target.value)}
                  className="min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Request text</p>
                <textarea
                  value={requestTextDraft}
                  onChange={(event) => setRequestTextDraft(event.target.value)}
                  className="min-h-28 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Assumptions, one per line</p>
                  <textarea
                    value={assumptionsDraft}
                    onChange={(event) => setAssumptionsDraft(event.target.value)}
                    className="min-h-48 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Steps</p>
                      <button
                        type="button"
                        onClick={() => setStepDrafts((current) => [...current, { ...EMPTY_STEP }])}
                        className="text-xs font-medium text-karuma-600 hover:text-karuma-700"
                      >
                      Add step
                    </button>
                  </div>
                  <div className="space-y-3">
                    {stepDrafts.length ? (
                      stepDrafts.map((step, index) => (
                          <StepEditor
                          key={`${index}-${step.title}`}
                          step={step}
                          index={index}
                          onChange={(next) =>
                            setStepDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)))
                          }
                          onRemove={() =>
                            setStepDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))
                          }
                          onCopy={() => copyStep(index)}
                          onMoveUp={() => moveStep(index, -1)}
                          onMoveDown={() => moveStep(index, 1)}
                        />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                        No steps yet. Add one to describe the implementation plan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Execution notes</p>
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  className="min-h-28 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Execution log, one line per event</p>
                <textarea
                  value={logDraft}
                  onChange={(event) => setLogDraft(event.target.value)}
                  className="min-h-40 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20"
                />
              </div>
              <Button variant="primary" size="sm" type="button" disabled={actionLoading} onClick={savePlan}>
                <WandSparkles className="mr-2 h-4 w-4" />
                Save plan and notes
              </Button>
            </div>
          </Card>

          <Card title="Execution log">
            <div className="space-y-2">
              {executionLog.length ? (
                executionLog.map((line) => (
                  <div
                    key={line}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      parseLogLine(line).kind === "manual"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {parseLogLine(line).kind}
                    </span>
                    {parseLogLine(line).message}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                  No execution log yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
