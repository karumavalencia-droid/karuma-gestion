"use client";

import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useState } from "react";
import { CARTA } from "@/app/reservas/page";

export default function CartaPage() {
  const [abierta, setAbierta] = useState<string | null>(CARTA[0]?.cat ?? null);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between border-b border-[#ddd4c1] pb-5">
        <Link href="/" className="flex items-center gap-2 text-stone-900" aria-label="Karuma Sushi & Grill, inicio">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#263f35] font-serif text-lg text-white">K</span>
          <span className="font-semibold tracking-[0.16em]">karuma<small className="ml-2 text-[0.6rem] tracking-[0.22em] text-stone-500">SUSHI &amp; GRILL</small></span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-stone-600 sm:flex">
          <Link href="/#inicio" className="hover:text-stone-900">Inicio</Link>
          <Link href="/carta" className="font-semibold text-stone-900">Nuestra carta</Link>
          <Link href="/reservas" className="hover:text-stone-900">Reservas</Link>
        </nav>
        <Link href="/reservas" className="rounded-full bg-[#263f35] px-4 py-2 text-sm font-semibold text-white">Reservar</Link>
      </header>

      <main>
        <section className="mx-auto max-w-3xl py-12 text-center sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7d5d38]">Nuestra carta</p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-stone-900 sm:text-6xl">Pequeños platos.<br /><em>Grandes ganas de volver.</em></h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-stone-600">La carta completa de Karuma: sushi, cocina asiática, especialidades a la brasa, postres y bebidas.</p>
        </section>

        <section className="rounded-3xl border border-[#ddd4c1] bg-white/70 p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 border-b border-[#e8e1d2] pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7d5d38]">Karuma Sushi &amp; Grill</p><h2 className="mt-2 font-serif text-2xl sm:text-3xl">Carta completa</h2></div>
            <div className="text-left text-sm leading-6 text-stone-600 sm:text-right">Buffet comida · L–V no festivo <strong className="text-stone-900">19,90 €</strong><br />Buffet noche · fines de semana y festivos <strong className="text-stone-900">24,90 €</strong><br />Menú infantil · <strong className="text-stone-900">12,50 €</strong></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {CARTA.map((grupo) => {
              const isOpen = abierta === grupo.cat;
              return <div key={grupo.cat} className="overflow-hidden rounded-2xl border border-[#e8e1d2] bg-[#fffdf8]">
                <button type="button" aria-expanded={isOpen} onClick={() => setAbierta(isOpen ? null : grupo.cat)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
                  <span className="font-semibold text-stone-900">{grupo.cat}</span><span className="flex items-center gap-2 text-xs text-stone-400"><span>{grupo.items.length}</span><ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} /></span>
                </button>
                {isOpen && <div className="border-t border-[#e8e1d2] px-4 pb-3">{grupo.items.map((item) => <div key={item.n} className="border-b border-[#eee8dc] py-3 last:border-0"><div className="flex items-start justify-between gap-4"><span className="font-medium text-stone-900">{item.n}</span><span className="shrink-0 text-sm text-stone-500">{item.p}</span></div>{item.d && <p className="mt-1 text-xs leading-5 text-stone-500">{item.d}</p>}</div>)}</div>}
              </div>;
            })}
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-stone-500">El precio corresponde al buffet. Bebidas no incluidas. Consulta al equipo sobre alérgenos y disponibilidad.</p>
        </section>

        <div className="flex justify-center py-10"><Link href="/reservas" className="inline-flex items-center gap-2 rounded-full bg-[#263f35] px-5 py-3 text-sm font-semibold text-white">Elige tu mesa <ArrowRight className="h-4 w-4" /></Link></div>
      </main>
    </div>
  );
}
