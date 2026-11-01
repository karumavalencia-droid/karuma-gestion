import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, MoveUpRight } from "lucide-react";
import { PublicShell, RESTAURANT } from "@/components/public/PublicSite";

export const metadata = {
  title: "Karuma · Sushi, brasa y Valencia",
  description: "Sushi, cocina a la brasa y buffet a la carta en el centro de Valencia. Descubre Karuma y reserva tu mesa.",
  alternates: { canonical: "https://www.karuma.es" },
};

const dishes = [
  { name: "Brasa", note: "El fuego pone el sabor.", image: "029-entrecort.jpeg", className: "food-grill", number: "01" },
  { name: "Sushi", note: "Un bocado. Otro favorito.", image: "046-crazy-salmon.jpg", className: "food-sushi", number: "02" },
  { name: "Para compartir", note: "Todo al centro.", image: "079-takoyaki.jpeg", className: "food-share", number: "03" },
  { name: "El toque dulce", note: "Siempre queda sitio.", image: "126-couran-de-chocolate.jpeg", className: "food-dessert", number: "04" },
];
const menus = [
  { title: "Entre semana", price: "19,90", description: "Buffet comida", detail: "Lunes a viernes no festivos", number: "01" },
  { title: "Cuando cae el sol", price: "24,90", description: "Buffet noche y fin de semana", detail: "Noches, fines de semana y festivos", number: "02" },
  { title: "Pequeños comensales", price: "12,50", description: "Menú infantil", detail: "Consulta las condiciones con nuestro equipo", number: "03" },
];
const questions = [
  { title: "¿Cómo reservo una mesa?", content: <>Elige día, hora y número de personas en <Link href="/reservas">nuestra página de reservas</Link>. También puedes llamarnos al <a href="tel:+34676706776">{RESTAURANT.phone}</a>.</> },
  { title: "¿Las bebidas están incluidas?", content: <>Las bebidas no están incluidas en el precio del buffet. Consulta la carta para elegir qué te apetece tomar.</> },
  { title: "¿Tenéis opciones para niños?", content: <>Tenemos menú infantil de 12,50 €. Consulta con el equipo las condiciones antes de reservar.</> },
  { title: "¿Y si tengo alguna alergia?", content: <>Habla con nuestro equipo antes de pedir. Te ayudaremos a consultar los alérgenos y la disponibilidad de los platos.</> },
];

export default function HomePage() {
  return (
    <PublicShell>
      <main id="inicio" className="public-page home-page">
        <section className="home-hero" aria-labelledby="hero-title">
          <Image className="hero-photo" src="/images/karuma/charcoal-atmosphere-v2.webp" alt="" fill priority sizes="100vw" />
          <div className="hero-shade" />
          <div className="hero-topline"><span>Sushi &amp; grill</span><span>Valencia, España</span></div>
          <div className="hero-content">
            <p className="eyebrow">Dos mundos. Una misma mesa.</p>
            <h1 id="hero-title">Sushi.<br />Brasa.<br /><em>Sin prisa.</em></h1>
            <div className="hero-bottom"><p>El encuentro entre Japón y el fuego.<br />Ven con hambre. Quédate a disfrutar.</p><Link href="/reservas" className="button button-light">Reserva tu mesa <ArrowRight size={18} /></Link></div>
          </div>
          <a href="#buffet" className="hero-scroll" aria-label="Descubre nuestro buffet"><ArrowDown size={17} /><span>Descubre Karuma</span></a>
        </section>

        <div className="brand-strip" aria-label="Sushi, brasa y buffet a la carta"><span>Sushi al momento</span><span aria-hidden="true">✳</span><span>El sabor de la brasa</span><span aria-hidden="true">✳</span><span>Buffet a la carta</span><span aria-hidden="true">✳</span><span>En el corazón de Valencia</span></div>

        <section id="buffet" className="buffet-section section-space">
          <div className="section-top"><div><p className="eyebrow">01 / A tu gusto</p><h2>Un poco de todo.<br /><em>Mucho que disfrutar.</em></h2></div><div className="section-intro"><p>Empieza por tus favoritos. Sigue por lo que te sorprenda. Nuestra carta está hecha para compartir y volver a pedir.</p><Link href="/carta" className="text-link">Explora la carta <MoveUpRight size={18} /></Link></div></div>
          <div className="food-grid">{dishes.map(dish => <Link key={dish.name} href="/carta" className={`food-card ${dish.className}`}><div className="food-image"><Image src={`/images/karuma/restosuite/${dish.image}`} alt={dish.name === "Brasa" ? "Entrecot de Karuma" : dish.name === "Sushi" ? "Crazy salmon de Karuma" : dish.name === "Para compartir" ? "Takoyaki de Karuma" : "Coulant de chocolate"} fill sizes="(max-width: 700px) 90vw, 45vw" /></div><div className="food-caption"><div><span className="food-number">{dish.number}</span><h3>{dish.name}</h3><p>{dish.note}</p></div><span className="round-arrow"><ArrowRight size={21} /></span></div></Link>)}</div>
        </section>

        <section className="fire-story">
          <div className="fire-photo"><Image src="/images/karuma/restosuite/029-entrecort.jpeg" alt="Entrecot a la brasa servido en Karuma" fill sizes="(max-width: 700px) 100vw, 50vw" /><span className="photo-caption">De nuestra cocina, a tu mesa.</span></div>
          <div className="fire-copy"><p className="eyebrow">02 / El encuentro</p><h2>La delicadeza<br />del sushi.<br /><em>El carácter<br />de la brasa.</em></h2><p>Dos maneras de entender el sabor, unidas en una carta. Nigiris, rolls, cocina asiática y platos a la parrilla para que cada mesa encuentre su mezcla perfecta.</p><Link href="/restaurante" className="text-link">Así es Karuma <MoveUpRight size={18} /></Link></div>
        </section>

        <section className="menus-section section-space">
          <div className="section-top"><div><p className="eyebrow">03 / Elige tu momento</p><h2>Buenos planes.<br /><em>Mejor compañía.</em></h2></div><Link href="/carta" className="button button-outline">Ver carta completa <ArrowRight size={18} /></Link></div>
          <div className="price-grid">{menus.map(menu => <article className="price-column" key={menu.number}><span className="price-number">/ {menu.number}</span><h3>{menu.title}</h3><p className="price"><span>{menu.price}</span><sup>€</sup></p><p className="price-description">{menu.description}</p><p className="price-detail">{menu.detail}</p><Link href="/reservas" className="text-link">Reservar <ArrowRight size={16} /></Link></article>)}</div><p className="menu-footnote">Bebidas no incluidas. Consulta al equipo sobre alérgenos y condiciones del menú infantil.</p>
        </section>

        <section className="table-invitation"><p className="eyebrow">La mejor parte es compartirlo</p><h2>Una mesa.<br />Mil maneras de<br /><em>pasarlo bien.</em></h2><Link href="/reservas" className="button button-primary">Nos vemos en Karuma <ArrowRight size={18} /></Link><span className="invitation-flower" aria-hidden="true">✳</span></section>

        <section className="faq-section section-space"><div><p className="eyebrow">04 / Antes de venir</p><h2>Por si te<br /><em>lo preguntabas.</em></h2><p className="faq-help">¿Algo más? Estamos al otro lado.<br /><a href="tel:+34676706776">{RESTAURANT.phone}</a></p></div><div className="faq-list">{questions.map(item => <details key={item.title}><summary>{item.title}<span aria-hidden="true">+</span></summary><p>{item.content}</p></details>)}</div></section>

        <section className="visit-banner"><div><p className="eyebrow">Aquí empieza tu próximo plan</p><h2>Nos vemos<br /><em>en el centro.</em></h2></div><div><p>{RESTAURANT.address}</p><a href={RESTAURANT.maps} className="text-link">Cómo llegar <MoveUpRight size={18} /></a><Link href="/contacto" className="text-link">Contacto <ArrowRight size={18} /></Link></div></section>
      </main>
    </PublicShell>
  );
}
