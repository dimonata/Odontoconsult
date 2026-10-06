import { z } from "zod";
import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";
import { redeemLifetimeCoupon } from "@/lib/subscription";

const inputSchema = z.object({
  code: z.string().trim().min(6, "Informe o cupom.").max(100, "Cupom inválido."),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    if (context.role !== "OWNER") {
      throw new AppError(403, "Somente o responsável pode aplicar o cupom.", "FORBIDDEN");
    }
    if (!context.user.email) {
      throw new AppError(422, "Sua conta precisa ter um e-mail.", "EMAIL_REQUIRED");
    }
    const input = inputSchema.parse(await readJson(request));
    await redeemLifetimeCoupon({
      clinicId: context.clinicId,
      userId: context.userId,
      payerEmail: context.user.email,
      code: input.code,
    });
    return { active: true, lifetime: true };
  });
}
