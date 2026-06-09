"use client";

import { useState } from "react";
import { getMarketingCopy, type MarketingCopy } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { THIRTY_DAY_GOALS } from "@/lib/marketing/mock";

type TaskStatus = "notStarted" | "filmed" | "published" | "good" | "bad";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">{children}</div>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function taskStatusLabel(m: MarketingCopy, status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    notStarted: m.statusNotStarted,
    filmed: m.statusFilmed,
    published: m.statusPublished,
    good: m.statusGood,
    bad: m.statusBad,
  };
  return map[status];
}

function formatGoal(
  m: MarketingCopy,
  current: number,
  target: number,
  unit?: string,
): string {
  const cur = current.toLocaleString("es-ES");
  const tgt = target.toLocaleString("es-ES");
  if (unit === "€") return `${cur}€ → ${tgt}€`;
  if (unit === "reviews") return `${cur} ${m.goalReviews} → ${tgt} ${m.goalReviews}`;
  if (unit === "fans") return `${cur} ${m.goalFans} → ${tgt} ${m.goalFans}`;
  return `${cur} → ${tgt}`;
}

function goalLabel(m: MarketingCopy, labelKey: string): string {
  if (labelKey === "googleReviewsGoal") return m.googleReviewsGoal;
  if (labelKey === "goalSundayRevenue") return m.goalSundayRevenue;
  return labelKey;
}

function mobileGoalLabel(m: MarketingCopy, labelKey: string): string {
  if (labelKey === "googleReviewsGoal") return "Google";
  if (labelKey === "goalSundayRevenue") return m.goalSundayRevenue;
  return labelKey;
}

function formatGoalShort(current: number, target: number, unit?: string): string {
  const cur = current.toLocaleString("es-ES");
  const tgt = target.toLocaleString("es-ES");
  if (unit === "€") return `${cur}€ → ${tgt}€`;
  return `${cur} → ${tgt}`;
}

function TaskStatusPicker({
  value,
  onChange,
  m,
}: {
  value: TaskStatus;
  onChange: (s: TaskStatus) => void;
  m: MarketingCopy;
}) {
  const options: TaskStatus[] = [
    "notStarted",
    "filmed",
    "published",
    "good",
    "bad",
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`min-h-[36px] rounded-lg px-2 text-xs font-semibold sm:text-sm ${
              active
                ? "bg-karuma-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {taskStatusLabel(m, opt)}
          </button>
        );
      })}
    </div>
  );
}

function MobileCollapse({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold text-gray-900"
      >
        <span>{title}</span>
        <span className="text-lg text-gray-400">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-gray-100 px-4 pb-4 pt-3">{children}</div> : null}
    </div>
  );
}

function scrollToMobileSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function MobileQuickNav({ m }: { m: MarketingCopy }) {
  const items = [
    { id: "mobile-today", label: m.mobileNavToday },
    { id: "mobile-scripts", label: m.mobileNavScripts },
    { id: "mobile-domingo", label: m.mobileNavDomingo },
    { id: "mobile-bio", label: m.mobileNavBio },
    { id: "mobile-blogger", label: m.mobileNavBlogger },
    { id: "mobile-review", label: m.mobileNavReview },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToMobileSection(item.id)}
          className="min-h-[40px] flex-1 basis-[calc(50%-0.25rem)] rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-xs font-semibold text-gray-800 shadow-sm active:bg-karuma-50 sm:basis-[calc(33.333%-0.375rem)]"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MobileSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-2 text-base font-bold text-gray-900">{title}</h2>
      <Card>{children}</Card>
    </section>
  );
}

function ScriptsBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-3">
      {m.scripts.map((script, i) => (
        <div key={`${script.title}-${i}`} className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-semibold text-gray-900">{script.title}</p>
          {"hook" in script && script.hook ? (
            <p className="mt-1 text-gray-600">
              {m.scriptHook}：{script.hook}
            </p>
          ) : null}
          {"opening" in script && script.opening ? (
            <p className="mt-1 text-gray-600">{script.opening}</p>
          ) : null}
          {"body" in script && script.body ? (
            <p className="mt-1 text-gray-600">{script.body}</p>
          ) : null}
          <p className="mt-1 text-gray-600">
            {m.scriptClosing}：{script.closing}
          </p>
        </div>
      ))}
    </div>
  );
}

function BloggerBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-2 text-sm text-gray-700">
      <p>
        <span className="font-semibold text-gray-900">{m.bloggerTargetsLabel}：</span>
        {m.bloggerTargets}
      </p>
      <p>
        <span className="font-semibold text-gray-900">{m.bloggerFansLabel}：</span>
        {m.bloggerFansRange}
      </p>
      <p>
        <span className="font-semibold text-gray-900">{m.bloggerOfferLabel}：</span>
        {m.bloggerOffer}
      </p>
      <p className="font-semibold text-gray-900">{m.bloggerExchangeLabel}</p>
      <BulletList items={m.bloggerExchange} />
      <p className="font-semibold text-gray-900">{m.bloggerMustShowLabel}</p>
      <BulletList items={m.bloggerMustShow} />
      <p>
        <span className="font-semibold text-gray-900">{m.bloggerGoalLabel}：</span>
        {m.bloggerGoal}
      </p>
    </div>
  );
}

type TomorrowTask = MarketingCopy["tomorrowTasks"][number];

function MobileTaskCard({
  task,
  m,
  status,
  onStatusChange,
}: {
  task: TomorrowTask;
  m: MarketingCopy;
  status: TaskStatus;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const subtitles = "subtitles" in task ? task.subtitles : undefined;
  const shotItems =
    subtitles && subtitles.length > 0 ? subtitles : (task.shots ?? []);
  const shotLabel =
    subtitles && subtitles.length > 0 ? m.subtitlesLabel : m.shotsLabel;

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold leading-snug text-gray-900">{task.title}</h3>
      {shotItems.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {shotLabel}
          </p>
          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-gray-600">
            {shotItems.map((s, i) => (
              <li key={`${s}-${i}`}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
      <TaskStatusPicker m={m} value={status} onChange={onStatusChange} />
    </div>
  );
}

function GoalsBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-3">
      {THIRTY_DAY_GOALS.map((goal) => (
        <div
          key={goal.id}
          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm"
        >
          <span className="font-semibold text-gray-900">
            {mobileGoalLabel(m, goal.labelKey)}
          </span>
          <span className="font-mono font-bold tabular-nums text-gray-900">
            {formatGoalShort(goal.current, goal.target, goal.unit)}
          </span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-sm font-semibold text-gray-900">{m.videoPublishTitle}</p>
        <BulletList items={m.videoPublishItems} />
      </div>
    </div>
  );
}

function DomingoBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-2 text-sm text-gray-700">
      <p>
        <span className="font-semibold text-gray-900">{m.domingoGoalLabel}：</span>
        {m.domingoGoal}
      </p>
      <p className="font-semibold text-gray-900">{m.domingoThemeLabel}</p>
      {m.domingoThemeLines.map((line) => (
        <p key={line} className="italic text-karuma-700">
          {line}
        </p>
      ))}
      <p className="pt-1 font-semibold text-gray-900">{m.domingoShotsLabel}</p>
      <BulletList items={m.domingoShots} />
      <p className="pt-1 text-gray-600">
        <span className="font-semibold text-gray-900">{m.domingoRulesLabel}：</span>
        {m.domingoRules}
      </p>
    </div>
  );
}

function BioBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg bg-gray-50 p-3">
        <p className="font-semibold text-gray-900">{m.tiktokBioCurrentLabel}</p>
        <p className="mt-1 text-gray-600">{m.tiktokBioCurrent}</p>
      </div>
      <div className="rounded-lg border border-karuma-200 bg-karuma-50 p-3">
        <p className="font-semibold text-karuma-900">{m.tiktokBioSuggestedLabel}</p>
        <p className="mt-1 whitespace-pre-wrap text-karuma-800">
          {m.tiktokBioLines.join("\n")}
        </p>
      </div>
    </div>
  );
}

function DiagnosisBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="font-semibold text-gray-900">{m.seatsLabel}：</span>
        {m.seatsValue}
      </p>
      <p>
        <span className="font-semibold text-gray-900">Google：</span>
        {m.googleRating} / {m.googleReviews}
      </p>
      <div>
        <p className="font-semibold text-gray-900">Instagram</p>
        <p className="text-karuma-600">@karumasushigrill</p>
        <p>{m.instagramFollowers}</p>
        <p>{m.instagramPosts}</p>
        <p>{m.instagramViews30d}</p>
      </div>
      <div>
        <p className="font-semibold text-gray-900">TikTok</p>
        <p className="text-karuma-600">@karumvalencia</p>
        <p>{m.tiktokFollowers}</p>
        <p>{m.tiktokLikes}</p>
      </div>
      <p>
        <span className="font-semibold text-gray-900">{m.sundayRevenueLabel}：</span>
        {m.sundayRevenueValue}
      </p>
      <p className="whitespace-pre-line">
        <span className="font-semibold text-gray-900">{m.pricingLabel}：</span>
        {m.pricingValue}
      </p>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
        <span className="font-semibold">{m.problemLabel}：</span>
        {m.problem}
      </p>
    </div>
  );
}

function ReviewBlock({ m }: { m: MarketingCopy }) {
  return (
    <div className="space-y-3">
      {m.weeklyReview.map((row) => (
        <div key={row.weekLabel} className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-semibold text-gray-900">{row.weekLabel}</p>
          <div className="mt-2 space-y-1 text-gray-700">
            <div className="flex justify-between gap-2">
              <span>{m.reviewVideos}</span>
              <span className="font-medium">{row.videosPublished}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{m.reviewTiktok}</span>
              <span className="font-medium">+{row.tiktokNewFans}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{m.reviewInstagram}</span>
              <span className="font-medium">+{row.instagramNewFans}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{m.reviewGoogle}</span>
              <span className="font-medium">+{row.googleNewReviews}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{m.reviewSunday}</span>
              <span className="font-medium">
                {row.sundayRevenue.toLocaleString("es-ES")}€
              </span>
            </div>
            {"bestVideo" in row && row.bestVideo ? (
              <div className="flex justify-between gap-2">
                <span>{m.reviewBestVideo}</span>
                <span className="text-right font-medium">{row.bestVideo}</span>
              </div>
            ) : null}
            {"worstVideo" in row && row.worstVideo ? (
              <div className="flex justify-between gap-2">
                <span>{m.reviewWorstVideo}</span>
                <span className="text-right font-medium">{row.worstVideo}</span>
              </div>
            ) : null}
            {"nextImprovement" in row && row.nextImprovement ? (
              <div className="flex justify-between gap-2">
                <span>{m.reviewNextWeek}</span>
                <span className="text-right font-medium">{row.nextImprovement}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  index,
  m,
  status,
  onStatusChange,
}: {
  task: TomorrowTask;
  index: number;
  m: MarketingCopy;
  status: TaskStatus;
  onStatusChange: (s: TaskStatus) => void;
}) {
  const subtitles = "subtitles" in task ? task.subtitles : undefined;
  return (
    <Card>
      <p className="text-xs font-medium text-karuma-600">
        {m.taskLabel} {index + 1}
      </p>
      <h3 className="mt-2 font-semibold text-gray-900">{task.title}</h3>
      {subtitles && subtitles.length > 0 ? (
        <>
          <p className="mt-3 text-sm font-medium text-gray-700">{m.subtitlesLabel}</p>
          <BulletList items={subtitles} />
        </>
      ) : null}
      {(task.shots ?? []).length > 0 ? (
        <>
          <p className="mt-3 text-sm font-medium text-gray-700">{m.shotsLabel}</p>
          <ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-gray-600">
            {(task.shots ?? []).map((s, i) => (
              <li key={`${s}-${i}`}>{s}</li>
            ))}
          </ol>
        </>
      ) : null}
      <TaskStatusPicker value={status} onChange={onStatusChange} m={m} />
    </Card>
  );
}

export default function MarketingPage() {
  const { locale } = useLanguage();
  const m = getMarketingCopy(locale);

  const [taskStatuses, setTaskStatuses] = useState<Record<number, TaskStatus>>(() =>
    Object.fromEntries(
      m.tomorrowTasks.map((t, i) => [i, (t.status as TaskStatus) ?? "notStarted"]),
    ),
  );

  const setTaskStatus = (i: number, s: TaskStatus) => {
    setTaskStatuses((prev) => ({ ...prev, [i]: s }));
  };

  return (
    <>
      <div className="max-w-full space-y-4 overflow-x-hidden lg:hidden">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{m.mobileTodayTasks}</h1>
          <p className="mt-1 text-base font-semibold text-karuma-600">{m.mobileMustShoot}</p>
        </div>

        <MobileQuickNav m={m} />

        <div id="mobile-today" className="scroll-mt-20 space-y-3">
          {m.tomorrowTasks.map((task, i) => (
            <MobileTaskCard
              key={task.title}
              task={task}
              m={m}
              status={taskStatuses[i] ?? "notStarted"}
              onStatusChange={(s) => setTaskStatus(i, s)}
            />
          ))}
        </div>

        <MobileSection id="mobile-scripts" title={m.mobileNavScripts}>
          <ScriptsBlock m={m} />
        </MobileSection>

        <MobileSection id="mobile-domingo" title={m.mobileNavDomingo}>
          <DomingoBlock m={m} />
        </MobileSection>

        <MobileSection id="mobile-bio" title={m.mobileNavBio}>
          <BioBlock m={m} />
        </MobileSection>

        <MobileSection id="mobile-blogger" title={m.mobileNavBlogger}>
          <BloggerBlock m={m} />
        </MobileSection>

        <div className="space-y-3">
          <MobileCollapse title={m.mobileSectionDiagnosis}>
            <DiagnosisBlock m={m} />
          </MobileCollapse>
          <MobileCollapse title={m.mobileSectionGoals}>
            <GoalsBlock m={m} />
          </MobileCollapse>
          <MobileCollapse title={m.mobileSectionRules}>
            <BulletList items={m.contentRules} />
          </MobileCollapse>
          <MobileCollapse title={m.mobileSectionViral}>
            <div className="space-y-3">
              {m.viralSeries.map((series) => (
                <div key={series.name} className="w-full rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="font-semibold text-gray-900">{series.name}</p>
                  <BulletList items={series.examples} />
                </div>
              ))}
            </div>
          </MobileCollapse>
          <MobileCollapse title={m.mobileSectionGoogle}>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                {m.googleReviewCurrentLabel}：420 {m.goalReviews}
              </p>
              <p>
                {m.googleReviewTargetLabel}：600 {m.goalReviews}
              </p>
              <p className="font-semibold">{m.serverScriptLabel}</p>
              <p className="italic">{m.serverScript}</p>
              <p className="font-semibold">{m.tableCardLabel}</p>
              <p className="whitespace-pre-line">{m.tableCardText}</p>
              <p className="text-amber-800">{m.googleReviewNote}</p>
            </div>
          </MobileCollapse>
          <MobileCollapse title={m.mobileSectionProduct}>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="whitespace-pre-line font-medium">{m.viralProductSuggestion}</p>
              <p>{m.viralProductPurpose}</p>
              <BulletList items={m.viralProductCopyLines} />
            </div>
          </MobileCollapse>
          <MobileCollapse title={m.mobileSectionDelivery}>
            <div className="space-y-2 text-sm text-gray-700">
              <p>{m.deliveryGoal}</p>
              <p className="font-semibold">{m.deliveryCombosLabel}</p>
              <BulletList items={m.deliveryCombos} />
              <p className="font-semibold">{m.deliveryPrinciplesLabel}</p>
              <BulletList items={m.deliveryPrinciples} />
            </div>
          </MobileCollapse>
        </div>

        <MobileSection id="mobile-review" title={m.mobileNavReview}>
          <ReviewBlock m={m} />
        </MobileSection>
      </div>

      <div className="hidden space-y-6 lg:block">
        <div>
          <p className="text-sm font-medium text-karuma-600">{m.lead}</p>
          <p className="mt-1 text-sm text-gray-500">{m.description}</p>
        </div>

        <Section title={m.diagnosisTitle}>
          <Card>
            <DiagnosisBlock m={m} />
          </Card>
        </Section>

        <Section title={m.positioningTitle}>
          <Card>
            <div className="space-y-2 text-sm">
              {m.positioningLines.map((line) => (
                <p key={line} className="font-semibold text-gray-900">
                  {line}
                </p>
              ))}
              <p className="mt-3 text-gray-600">{m.positioningNote}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {m.positioningKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-karuma-50 px-3 py-1 text-sm font-medium text-karuma-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </Section>

        <Section title={m.goalsTitle}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {THIRTY_DAY_GOALS.map((goal) => (
              <Card key={goal.id}>
                <p className="text-sm font-semibold text-gray-900">
                  {goalLabel(m, goal.labelKey)}
                </p>
                <p className="mt-2 text-lg font-bold tabular-nums">
                  {formatGoal(m, goal.current, goal.target, goal.unit)}
                </p>
              </Card>
            ))}
          </div>
          <div className="mt-3">
            <Card>
              <p className="font-semibold text-gray-900">{m.videoPublishTitle}</p>
              <div className="mt-2">
                <BulletList items={m.videoPublishItems} />
              </div>
            </Card>
          </div>
        </Section>

        <Section title={m.domingoTitle}>
          <Card>
            <DomingoBlock m={m} />
          </Card>
        </Section>

        <Section title={m.tomorrowTitle}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {m.tomorrowTasks.map((task, i) => (
              <TaskCard
                key={`${task.title}-${i}`}
                task={task}
                index={i}
                m={m}
                status={taskStatuses[i] ?? "notStarted"}
                onStatusChange={(s) => setTaskStatus(i, s)}
              />
            ))}
          </div>
        </Section>

        <Section title={m.bioOptimizeTitle}>
          <Card>
            <BioBlock m={m} />
          </Card>
        </Section>

        <Section title={m.rulesTitle}>
          <Card>
            <BulletList items={m.contentRules} />
          </Card>
        </Section>

        <Section title={m.viralSeriesTitle}>
          <div className="grid gap-3 sm:grid-cols-3">
            {m.viralSeries.map((series) => (
              <Card key={series.name}>
                <p className="font-semibold text-gray-900">{series.name}</p>
                <div className="mt-2">
                  <BulletList items={series.examples} />
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title={m.bloggerTitle}>
          <Card>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold text-gray-900">{m.bloggerTargetsLabel}：</span>
                {m.bloggerTargets}
              </p>
              <p>
                <span className="font-semibold text-gray-900">{m.bloggerFansLabel}：</span>
                {m.bloggerFansRange}
              </p>
              <p>
                <span className="font-semibold text-gray-900">{m.bloggerOfferLabel}：</span>
                {m.bloggerOffer}
              </p>
              <p className="font-semibold text-gray-900">{m.bloggerExchangeLabel}</p>
              <BulletList items={m.bloggerExchange} />
              <p className="font-semibold text-gray-900">{m.bloggerMustShowLabel}</p>
              <BulletList items={m.bloggerMustShow} />
              <p>
                <span className="font-semibold text-gray-900">{m.bloggerGoalLabel}：</span>
                {m.bloggerGoal}
              </p>
            </div>
          </Card>
        </Section>

        <Section title={m.googleReviewPlanTitle}>
          <Card>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                {m.googleReviewCurrentLabel}：420 · {m.googleReviewTargetLabel}：600
              </p>
              <div>
                <p className="font-semibold text-gray-900">{m.serverScriptLabel}</p>
                <p className="mt-1 italic">{m.serverScript}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{m.tableCardLabel}</p>
                <p className="mt-1 whitespace-pre-line">{m.tableCardText}</p>
              </div>
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {m.googleReviewNote}
              </p>
            </div>
          </Card>
        </Section>

        <Section title={m.viralProductTitle}>
          <Card>
            <p className="whitespace-pre-line font-semibold text-gray-900">
              {m.viralProductSuggestion}
            </p>
            <p className="mt-2 text-sm text-gray-600">{m.viralProductPurpose}</p>
            <div className="mt-3">
              <BulletList items={m.viralProductCopyLines} />
            </div>
          </Card>
        </Section>

        <Section title={m.deliveryTitle}>
          <Card>
            <p className="text-sm text-gray-700">{m.deliveryGoal}</p>
            <p className="mt-3 text-sm font-semibold text-gray-900">{m.deliveryCombosLabel}</p>
            <div className="mt-1">
              <BulletList items={m.deliveryCombos} />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-900">{m.deliveryPrinciplesLabel}</p>
            <div className="mt-1">
              <BulletList items={m.deliveryPrinciples} />
            </div>
          </Card>
        </Section>

        <Section title={m.rhythmTitle}>
          <div className="grid gap-3 sm:grid-cols-2">
            {m.rhythmWeeks.map((w) => (
              <Card key={w.week}>
                <p className="font-semibold text-gray-900">{w.week}</p>
                <p className="mt-2 text-sm text-gray-700">{w.plan}</p>
                <p className="mt-1 text-sm font-medium text-karuma-700">{w.sundayTarget}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title={m.reviewTitle}>
          <div className="space-y-3">
            {m.weeklyReview.map((row) => (
              <Card key={row.weekLabel}>
                <p className="font-semibold text-gray-900">{row.weekLabel}</p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p>
                    {m.reviewVideos}：{row.videosPublished}
                  </p>
                  <p>
                    {m.reviewTiktok}：+{row.tiktokNewFans}
                  </p>
                  <p>
                    {m.reviewInstagram}：+{row.instagramNewFans}
                  </p>
                  <p>
                    {m.reviewGoogle}：+{row.googleNewReviews}
                  </p>
                  <p>
                    {m.reviewSunday}：{row.sundayRevenue.toLocaleString("es-ES")}€
                  </p>
                  {"bestVideo" in row && row.bestVideo ? (
                    <p>
                      {m.reviewBestVideo}：{row.bestVideo}
                    </p>
                  ) : null}
                  {"worstVideo" in row && row.worstVideo ? (
                    <p>
                      {m.reviewWorstVideo}：{row.worstVideo}
                    </p>
                  ) : null}
                  {"nextImprovement" in row && row.nextImprovement ? (
                    <p className="sm:col-span-2">
                      {m.reviewNextWeek}：{row.nextImprovement}
                    </p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
