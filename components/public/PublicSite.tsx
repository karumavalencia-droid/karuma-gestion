import "./public-site.css";
import Link from "next/link";
import { GoogleTagManager } from "./GoogleTagManager";
import { ArrowRight, Clock3, Instagram, MapPin, Phone, Sparkles, Menu, CalendarDays, UtensilsCrossed, House } from "lucide-react";

export const RESTAURANT = {
  address: "C/ de Roger de Llòria, 2 · 46002 Valencia",
  phone: "+34 676 706 776",
  maps: "https://www.google.com/maps/search/?api=1&query=Karuma%20Sushi%20%26%20Grill%2C%20Carrer%20de%20Roger%20de%20Ll%C3%B2ria%2C%202%2C%20Valencia",
};

const navItems = [
  ["Inicio", "/#inicio"],
  ["Nuestra carta", "/carta"],
  ["Reservas", "/reservas"],
  ["El restaurante", "/restaurante"],
  ["Contacto", "/contacto"],
] as const;

export function PublicNav() {
  return (
    <header className="public-nav">
      <nav className="public-links" aria-label="Navegación principal">
        <Link href="/carta">Carta</Link><Link href="/restaurante">Restaurante</Link><Link href="/contacto">Contacto</Link>
      </nav>
      <Link href="/#inicio" className="public-wordmark" aria-label="Karuma Sushi & Grill, inicio">
        <span>karuma<small>SUSHI &amp; GRILL</small></span>
      </Link>
      <div className="nav-end"><Link href="/reservas" className="nav-booking">Reservar <ArrowRight size={15} /></Link>
        <details className="public-menu"><summary aria-label="Abrir navegación"><Menu size={23} /></summary><nav aria-label="Menú móvil">{navItems.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav></details>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <div className="public-wordmark"><span className="public-mark">K</span><span>karuma<small>SUSHI &amp; GRILL</small></span></div>
        <p className="footer-copy">Sushi, brasa y una mesa para compartir en el centro de Valencia.</p>
      </div>
      <div className="footer-contact"><a href={RESTAURANT.maps}><MapPin size={16} /> {RESTAURANT.address}</a><a href={`tel:${RESTAURANT.phone.replace(/\s/g, "")}`}><Phone size={16} /> {RESTAURANT.phone}</a></div>
      <div className="footer-meta"><span>© {new Date().getFullYear()} Karuma Sushi &amp; Grill</span><Link href="/login" rel="nofollow">Acceso equipo</Link><a href="https://www.instagram.com/karuma.valencia" aria-label="Instagram de Karuma"><Instagram size={17} /></a></div>
    </footer>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <><GoogleTagManager /><div className="public-site"><a className="public-skip" href="#public-content">Saltar al contenido</a><PublicNav /><div id="public-content">{children}</div><PublicFooter /><nav className="mobile-public-nav" aria-label="Navegación rápida"><Link href="/#inicio"><House size={19} />Inicio</Link><Link href="/carta"><UtensilsCrossed size={19} />Carta</Link><Link href="/reservas"><CalendarDays size={19} />Reservar</Link><Link href="/contacto"><MapPin size={19} />Contacto</Link></nav></div></>;
}

export function ReservationCta({ label = "Reservar una mesa" }: { label?: string }) {
  return <Link href="/reservas" className="button button-primary">{label} <ArrowRight size={17} /></Link>;
}

export function RestaurantDetails() {
  return <div className="detail-grid"><div><MapPin size={20} /><div><strong>Estamos en el centro</strong><a href={RESTAURANT.maps}>{RESTAURANT.address}</a></div></div><div><Clock3 size={20} /><div><strong>Abiertos todos los días</strong><span>13:00–23:30</span></div></div><div><Sparkles size={20} /><div><strong>La experiencia Karuma</strong><span>Sushi libre a la carta y cocina a la brasa</span></div></div></div>;
}
