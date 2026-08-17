import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Solo facturas y adjuntos de email: PDF, imágenes y CSV.
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
]);
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB por archivo

function sanitizeFilename(name: string): string {
  // Solo caracteres seguros; elimina rutas ("../") y nombres raros.
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "invoice";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Directorio privado (no servido por Next): nunca dentro de /public.
    const uploadDir = join(process.cwd(), ".uploads", "invoices");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploaded: string[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return Response.json(
          { error: `Tipo de archivo no permitido: ${file.type || "desconocido"}` },
          { status: 415 },
        );
      }
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
        return Response.json(
          { error: `Tamaño no válido: ${file.name} (máx. 50 MB)` },
          { status: 413 },
        );
      }
      const bytes = await file.arrayBuffer();
      const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
      await writeFile(join(uploadDir, filename), Buffer.from(bytes));
      uploaded.push(filename);
    }

    return Response.json({
      success: true,
      count: uploaded.length,
      files: uploaded,
      message: `${uploaded.length} invoices uploaded successfully`,
    });
  } catch (error) {
    return Response.json(
      { error: "Upload failed: " + String(error) },
      { status: 500 },
    );
  }
}
