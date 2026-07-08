import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "invoices");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploaded: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const filename = `${Date.now()}-${file.name}`;
      const filepath = join(uploadDir, filename);

      await writeFile(filepath, Buffer.from(bytes));
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
      { status: 500 }
    );
  }
}
