import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PublicShell, ReservationCta } from "@/components/public/PublicSite";

const groups = [
  { title: "Entrantes", items: [["Takoyaki"], ["Langostino tempura"], ["Pollo karaage"], ["Gyoza frita"]] },
  { title: "A la brasa", items: [["Secreto ibérico"], ["Entrecot"], ["Gamba al ajillo"], ["Piña a la brasa"]] },
  { title: "Sushi", items: [["Nigiri salmón flameado"], ["Crazy salmón"], ["Dragon roll"], ["Tiger roll"]] },
  { title: "Para terminar", items: [["Mochi de fresa o matcha"], ["Coulant de chocolate"], ["Helado de vainilla"]] },
];

export default function MenuPage() {
  return <PublicShell><main className="public-page menu-page"><section className="subpage-hero"><p className="eyebrow">Nuestra carta</p><h1>Pequeños platos.<br /><em>Grandes ganas de volver.</em></h1><p>Una carta para pedir al centro, probar sin prisa y repetir tus favoritos. El menú completo incluye sushi, cocina asiática y especialidades a la brasa.</p><ReservationCta /></section><section className="menu-board"><div className="menu-board-top"><div><p className="eyebrow">Karuma Sushi &amp; Grill</p><h2>Lo que más nos gusta servir</h2></div><span className="menu-price">Buffet comida · L–V no festivo<br /><b>19,90 €</b><br />Buffet noche · fines de semana y festivos<br /><b>24,90 €</b><br />Niños 1,00–1,30 m · <b>12,90 €</b></span></div><div className="menu-columns">{groups.map((group) => <div className="menu-group" key={group.title}><h3>{group.title}</h3>{group.items.map(([name]) => <div className="menu-line" key={name}><span>{name}</span></div>)}</div>)}</div><p className="menu-note">El precio corresponde al buffet. Consulta al equipo sobre alérgenos y disponibilidad.</p></section><section className="menu-bottom"><Link href="/" className="text-link"><ArrowLeft size={16} /> Volver al inicio</Link><Link href="/reservas" className="text-link">Elige tu mesa <ArrowRight size={16} /></Link></section></main></PublicShell>;
}
