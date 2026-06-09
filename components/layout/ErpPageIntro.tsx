"use client";

interface ErpPageIntroProps {
  /** 副标题上行（如周期标签），可选 */
  lead?: string;
  /** 页面说明，通常来自 i18n */
  description: string;
  /** 右侧操作区（按钮等） */
  actions?: React.ReactNode;
}

/** 与 Schedule 等页面一致的页头说明区（标题由 Layout Header 统一展示） */
export function ErpPageIntro({ lead, description, actions }: ErpPageIntroProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {lead && <p className="text-sm font-medium text-gray-900">{lead}</p>}
        <p className={`text-sm text-gray-500 ${lead ? "" : ""}`}>{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
