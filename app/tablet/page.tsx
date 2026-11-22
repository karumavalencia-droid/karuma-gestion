import MesaViewPage from "@/app/dashboard/mesa-view/page";

/** Vista tablet: plano de mesas de hoy a pantalla completa, sin menús. */
export default function TabletPage() {
  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f7f3ec]">
      <MesaViewPage />
    </div>
  );
}
