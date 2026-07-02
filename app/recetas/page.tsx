import { BookOpenText, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RecetasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetas"
        description="Gestión de recetas y procesos de cocina"
      />

      <section className="flex min-h-[calc(100dvh-14rem)] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-karuma-50 text-karuma-600">
            <BookOpenText className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Todavía no hay recetas
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Aquí podrás crear y organizar las recetas del restaurante para que
            los cocineros puedan consultarlas rápidamente.
          </p>
          <Button type="button" className="mt-6 gap-2">
            <Plus className="h-4 w-4" />
            Crear primera receta
          </Button>
        </div>
      </section>
    </div>
  );
}
