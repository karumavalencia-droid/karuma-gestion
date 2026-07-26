export type ChangeCenterRiskLevel = "low" | "medium" | "high" | "critical";

export type ChangeCenterStatus =
  | "draft"
  | "planned"
  | "approved"
  | "executing"
  | "preview_ready"
  | "completed"
  | "failed";

export type ChangeCenterPlanStep = {
  title: string;
  detail: string;
  owner: "ai" | "owner" | "engineer" | "reviewer";
  risk: ChangeCenterRiskLevel;
};

export type ChangeCenterPlan = {
  title: string;
  summary: string;
  assumptions: string[];
  steps: ChangeCenterPlanStep[];
  riskLevel: ChangeCenterRiskLevel;
};

export type DbCeoChangeRequest = {
  id: string;
  created_by_email: string;
  created_by_name: string;
  created_by_role: string;
  title: string;
  request_text: string;
  summary: string;
  risk_level: ChangeCenterRiskLevel;
  status: ChangeCenterStatus;
  plan: ChangeCenterPlan;
  github_branch: string | null;
  github_pr_url: string | null;
  vercel_preview_url: string | null;
  execution_notes: string | null;
  execution_log: string[];
  approved_at: string | null;
  preview_ready_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCeoChangeRequestInsert = {
  id?: string;
  created_by_email: string;
  created_by_name: string;
  created_by_role: string;
  title: string;
  request_text: string;
  summary: string;
  risk_level: ChangeCenterRiskLevel;
  status?: ChangeCenterStatus;
  plan: ChangeCenterPlan;
  github_branch?: string | null;
  github_pr_url?: string | null;
  vercel_preview_url?: string | null;
  execution_notes?: string | null;
  execution_log?: string[];
  approved_at?: string | null;
  preview_ready_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
};

export type DbCeoChangeRequestUpdate = Partial<DbCeoChangeRequestInsert>;

export const CHANGE_CENTER_STATUSES: ChangeCenterStatus[] = [
  "draft",
  "planned",
  "approved",
  "executing",
  "preview_ready",
  "completed",
  "failed",
];

const CHANGE_KEYWORDS: Array<[RegExp, ChangeCenterRiskLevel]> = [
  [/(login|auth|session|password|mfa|permissions?|roles?)/i, "critical"],
  [/(delete|remove|drop|migration|schema|supabase|database|rls|policy)/i, "critical"],
  [/(payments?|billing|invoice|checkout|stripe)/i, "high"],
  [/(reservation|booking|availability|calendar|schedule)/i, "high"],
  [/(deploy|vercel|github|branch|pr|release)/i, "medium"],
  [/(ui|style|copy|text|button|layout|page)/i, "low"],
];

function normalizeTitle(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, 96) || "System change request";
}

function summarizeRequest(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "No request text provided.";
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}

export function inferChangeCenterRisk(text: string): ChangeCenterRiskLevel {
  for (const [pattern, risk] of CHANGE_KEYWORDS) {
    if (pattern.test(text)) return risk;
  }
  return "medium";
}

export function buildChangeCenterPlan(requestText: string): ChangeCenterPlan {
  const normalized = requestText.trim();
  const lower = normalized.toLowerCase();
  const riskLevel = inferChangeCenterRisk(normalized);
  const title = normalizeTitle(
    normalized.split(/[\n.!?]/)[0] || "System change request",
  );

  const steps: ChangeCenterPlanStep[] = [
    {
      title: "Clarify scope",
      detail: "Restate the request in implementation language and identify the touched screens, APIs, and data.",
      owner: "ai",
      risk: "low",
    },
    {
      title: "Map impact",
      detail: "List the files, tables, and workflows that would change, including any edge cases or rollbacks.",
      owner: "reviewer",
      risk: riskLevel,
    },
    {
      title: "Draft implementation",
      detail: "Prepare the smallest safe change set and hold execution until the owner approves.",
      owner: "engineer",
      risk: riskLevel,
    },
    {
      title: "Verify result",
      detail: "Run build and smoke checks, then prepare preview evidence and follow-up notes.",
      owner: "ai",
      risk: "medium",
    },
  ];

  if (/(table|grid|list|listado|tabla)/i.test(lower)) {
    steps.splice(1, 0, {
      title: "Check data shape",
      detail: "Confirm the request matches the current database shape and row-level access rules.",
      owner: "reviewer",
      risk: riskLevel,
    });
  }

  if (/(approval|approve|ok|confirm|signed off)/i.test(lower)) {
    steps.push({
      title: "Await explicit approval",
      detail: "Do not move into execution until the owner confirms the plan in the UI.",
      owner: "owner",
      risk: "low",
    });
  }

  return {
    title,
    summary: summarizeRequest(normalized),
    assumptions: [
      "The request is for Karuma's internal web app.",
      "No code execution happens in V1.",
      "GitHub and Vercel fields are reserved for future automation.",
    ],
    steps,
    riskLevel,
  };
}
