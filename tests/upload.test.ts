import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { validateUpload } from "@/lib/storage";

describe("segurança de upload", () => {
  it("detecta o tipo real em vez de confiar no MIME declarado", async () => {
    const fake = new File(["conteúdo executável"], "imagem.png", { type: "image/png" });
    await expect(validateUpload(fake)).rejects.toMatchObject({
      code: "INVALID_FILE_TYPE",
      status: 415,
    });
  });

  it("aceita uma imagem PNG válida", async () => {
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const file = new File([bytes], "pixel.png", { type: "application/octet-stream" });
    const result = await validateUpload(file, true);
    expect(result.mimeType).toBe("image/png");
    expect(result.extension).toBe("png");
  });
});
