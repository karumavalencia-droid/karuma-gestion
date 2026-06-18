"use client";

import { Check, PackageOpen, ShoppingBag, Target, TrendingUp, Truck } from "lucide-react";
import { PageContent } from "@/components/layout/PageContent";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getDeliveryGrowthCopy, type DeliveryGrowthCopy } from "@/lib/delivery-growth/content";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-gray-900 sm:text-lg">{title}</h2>
      {children}
    </section>
  );
}

function Overview({ copy }: { copy: DeliveryGrowthCopy }) {
  const metrics = [
    { label: copy.currentDelivery, value: "250€", icon: Truck },
    { label: copy.target, value: "500€", icon: Target },
    { label: copy.deliveryShare, value: "7.8%", icon: TrendingUp },
  ];

  return (
    <section className="rounded-2xl bg-gray-900 p-4 text-white shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-karuma-300">Delivery</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{copy.title}</h1>
      <p className="mt-1 text-sm text-gray-300">{copy.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="min-w-0 rounded-xl bg-white/10 p-3">
            <Icon className="h-4 w-4 text-karuma-300" />
            <p className="mt-2 text-[10px] leading-tight text-gray-300 sm:text-xs">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums sm:text-2xl">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayActions({ copy }: { copy: DeliveryGrowthCopy }) {
  return (
    <Section title={copy.todayActions}>
      <Card>
        <ul className="space-y-3">
          {copy.todayActionItems.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-gray-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-karuma-50 text-karuma-700">
                <Check className="h-3.5 w-3.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

function ComboCards({ copy }: { copy: DeliveryGrowthCopy }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {copy.combos.map((combo, index) => (
        <Card key={combo.name} className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-gray-900">{combo.name}</p>
              <p className="mt-1 text-xs text-gray-500">{copy.comboDescriptions[index]}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {copy.pending}
            </span>
          </div>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm text-gray-600">
            {combo.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-karuma-600">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500">{copy.suggestedPrice}</p>
            <p className="mt-0.5 font-bold text-gray-900">{combo.price}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Checklist({ copy }: { copy: DeliveryGrowthCopy }) {
  return (
    <Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {copy.checklist.map((item) => (
          <label key={item} className="flex min-h-[42px] items-start gap-3 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-karuma-600 focus:ring-karuma-500"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

export default function DeliveryPage() {
  const { locale } = useLanguage();
  const copy = getDeliveryGrowthCopy(locale);

  return (
    <PageContent className="mx-auto max-w-7xl">
      <Overview copy={copy} />
      <TodayActions copy={copy} />

      <Section title={copy.combosTitle}>
        <ComboCards copy={copy} />
      </Section>

      <Section title={copy.checklistTitle}>
        <Checklist copy={copy} />
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={copy.diagnosisTitle}>
          <Card>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [copy.yesterdayRevenue, "3,200€"],
                [copy.dineIn, "2,950€"],
                [copy.delivery, "250€"],
                [copy.deliveryShare, "7.8%"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">{copy.conclusion}</p>
            <p className="mt-1 text-sm text-karuma-700">{copy.opportunity}</p>
          </Card>
        </Section>

        <Section title={copy.goalsTitle}>
          <Card>
            <div className="grid grid-cols-3 gap-2">
              {[
                [copy.current, "250€"],
                [copy.phaseOne, "500€"],
                [copy.phaseTwo, "800€"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-[10px] leading-tight text-gray-500 sm:text-xs">{label}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
                  <p className="text-[10px] text-gray-400">{copy.perDay}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-karuma-100 bg-karuma-50 p-3">
              <p className="text-xs font-semibold text-karuma-800">{copy.shareGoal}</p>
              <p className="mt-1 text-xl font-bold text-karuma-900">7.8% → 15% → 20%</p>
            </div>
          </Card>
        </Section>
      </div>

      <Section title={copy.platformsTitle}>
        <div className="grid gap-3 lg:grid-cols-2">
          {copy.platforms.map((platform, index) => (
            <Card key={platform.name}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-karuma-600" />
                <h3 className="font-bold text-gray-900">{platform.name}</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  [copy.todaySales, platform.sales],
                  [copy.orders, platform.orders],
                  [copy.averageOrder, platform.average],
                  [copy.rating, platform.rating],
                  [copy.cancelled, platform.cancelled],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-50 p-2.5">
                    <p className="text-[10px] text-gray-500">{label}</p>
                    <p className="mt-1 font-bold text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{copy.mainProblem}: </span>
                {copy.platformProblems[index]}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title={copy.menuTitle}>
        <Card>
          <div className="grid gap-5 md:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-karuma-600" />
                <h3 className="font-bold text-gray-900">{copy.menuHeadline}</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{copy.menuDescription}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{copy.menuStructure}</p>
              <ol className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
                {copy.menuItems.map((item, index) => (
                  <li key={item} className="rounded-lg bg-gray-50 px-3 py-2">
                    {index + 1}. {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      </Section>

      <Section title={copy.dailyTitle}>
        <div className="lg:hidden">
          <Card>
            <p className="font-bold text-gray-900">{copy.yesterday}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                [copy.uberSales, "150€"],
                [copy.glovoSales, "100€"],
                [copy.totalDelivery, "250€"],
                [copy.orders, "10"],
                [copy.averageOrder, "25€"],
                [copy.deliveryShare, "7.8%"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-gray-600">{copy.dailyNote}</p>
          </Card>
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {[copy.date, copy.uberSales, copy.glovoSales, copy.totalDelivery, copy.orders, copy.averageOrder, copy.deliveryShare, copy.notes].map((heading) => (
                  <th key={heading} className="px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100 text-gray-700">
                {[copy.yesterday, "150€", "100€", "250€", "10", "25€", "7.8%", copy.dailyNote].map((value, index) => (
                  <td key={`${value}-${index}`} className="px-3 py-3">{value}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={copy.weeklyTitle}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {copy.weeklyFields.map((field) => (
            <Card key={field}>
              <p className="text-sm font-semibold text-gray-900">{field}</p>
              <p className="mt-2 text-xs text-gray-500">{copy.waitingReview}</p>
            </Card>
          ))}
        </div>
      </Section>
    </PageContent>
  );
}
