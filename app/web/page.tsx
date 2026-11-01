import Link from "next/link";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { PublicShell, ReservationCta, RESTAURANT } from "@/components/public/PublicSite";

export const metadata = { title: "Karuma Sushi & Grill · Valencia", description: "Sushi, brasa y una mesa para compartir en el centro de Valencia.", alternates: { canonical: "https://www.karuma.es" } };

const categories = [
  { name: "Sushi", description: "Rolls, nigiris y tus favoritos", image: "/images/karuma/restosuite/046-crazy-salmon.jpg", className: "category-sushi" },
  { name: "Brasa", description: "El sabor de nuestra parrilla", image: "/images/karuma/restosuite/029-entrecort.jpeg", className: "category-grill" },
  { name: "Para compartir", description: "Un poco de todo, al centro", image: "/images/karuma/restosuite/079-takoyaki.jpeg", className: "category-share" },
  { name: "Postres", description: "Un final para disfrutar", image: "/images/karuma/restosuite/126-couran-de-chocolate.jpeg", className: "category-dessert" },
];
const menus = [
  { name: "Buffet comida", price: "19,90 €", detail: "Lunes a viernes no festivos" },
  { name: "Buffet noche", price: "24,90 €", detail: "Noches, fines de semana y festivos" },
  { name: "Menú infantil", price: "12,50 €", detail: "Para los más pequeños" },
];
const questions = [
  { question: "¿Cómo puedo reservar una mesa?", answer: <>Puedes <Link href="/reservas">reservar online</Link> o llamarnos al <a href="tel:+34676706776">{RESTAURANT.phone}</a>.</> },
  { question: "¿Las bebidas están incluidas?", answer: <>Las bebidas no están incluidas en el precio del buffet. Puedes consultar nuestra selección con el equipo del restaurante.</> },
  { question: "¿Dónde está Karuma?", answer: <>{RESTAURANT.address}. <a href={RESTAURANT.maps}>Ver cómo llegar</a>.</> },
  { question: "¿Dónde puedo consultar los alérgenos?", answer: <>Consulta con nuestro equipo sobre alérgenos y disponibilidad antes de pedir.</> },
];

export default function HomePage() {
  return (
    <PublicShell>
      <main id="inicio" className="public-page home-page">
        <section className="home-hero" aria-label="Karuma Sushi y Grill">
          <div className="hero-content">
            <p className="eyebrow">Valencia · Sushi &amp; grill</p>
            <div className="hero-bottom"><h1>Karuma<br className="hero-break" /> sushi &amp; brasa</h1><Link href="/carta" className="button button-light">Ver la carta <ArrowRight size={18} /></Link></div>
          </div>
        </section>
        <section className="buffet-section section-space">
          <div className="section-top"><div><p className="eyebrow">Para probar y repetir</p><h2>Nuestro buffet</h2></div><Link href="/carta" className="button button-outline">Descubre la carta <ArrowRight size={17} /></Link></div>
          <div className="category-grid">{categories.map((category) => <Link key={category.name} href="/carta" className={`category-card ${category.className}`} style={{ backgroundImage: `url(${category.image})` }}><div><h3>{category.name}</h3><p>{category.description}</p></div><ArrowRight size={21} aria-hidden="true" /></Link>)}</div>
        </section>
        <section className="signature-section">
          <div className="signature-copy"><p className="eyebrow">El fuego de Karuma</p><h2>De la parrilla.<br /><em>Al centro de la mesa.</em></h2><p>El sushi pone el comienzo. La brasa, el siguiente plato. Descubre una carta pensada para compartir y encontrar nuevos favoritos.</p><Link href="/carta" className="button button-outline">Prueba nuestra brasa <ArrowRight size={17} /></Link></div>
          <div className="signature-image" role="img" aria-label="Especialidades a la parrilla" />
        </section>
        <section className="menus-section section-space">
          <div className="section-top"><div><p className="eyebrow">Cada momento tiene su mesa</p><h2>Nuestros menús</h2><p className="section-description">Elige tu momento y disfruta de tus favoritos. Bebidas no incluidas.</p></div><Link href="/carta" className="button button-outline">Ver la carta completa <ArrowRight size={17} /></Link></div>
          <div className="menu-summary">{menus.map(menu => <div className="menu-summary-item" key={menu.name}><Clock3 size={21} aria-hidden="true" /><div><h3>{menu.name} <span>· {menu.price}</span></h3><p>{menu.detail}</p></div></div>)}<a className="menu-summary-item" href={RESTAURANT.maps}><MapPin size={21} aria-hidden="true" /><div><h3>Dónde estamos</h3><p>{RESTAURANT.address}</p></div></a></div>
        </section>
        <section className="editorial-section" aria-label="La experiencia Karuma"><p>Sushi al momento.<br />El fuego de la <span className="inline-food inline-grill" role="img" aria-label="Plato a la brasa" /> brasa.<br />Una mesa para <span className="inline-food inline-sushi" role="img" aria-label="Sushi para compartir" /><br /><em>compartir sin prisa.</em></p><Link href="/restaurante" className="text-link">Así es Karuma <ArrowRight size={18} /></Link></section>
        <section className="about-banner"><div><p className="eyebrow">Nosotros</p><h2>Japón, brasa<br />y Valencia.</h2><p>Una carta para descubrir nuevos sabores y volver a los de siempre. Te esperamos en el centro de la ciudad.</p><Link href="/restaurante" className="button button-light">Conócenos <ArrowRight size={17} /></Link></div></section>
        <section className="faq-section section-space"><div className="section-top"><div><p className="eyebrow">Antes de venir</p><h2>Preguntas frecuentes</h2><p className="section-description">Lo que necesitas saber antes de sentarte a la mesa.</p></div></div><div className="faq-layout"><div className="faq-list">{questions.map(item => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div><aside className="faq-contact"><p className="eyebrow">¿Nos vemos en Karuma?</p><h3>Tu próxima mesa<br />empieza aquí.</h3><ReservationCta /><a className="text-link" href="tel:+34676706776">{RESTAURANT.phone} <ArrowRight size={16} /></a></aside></div></section>
      </main>
    </PublicShell>
  );
}
