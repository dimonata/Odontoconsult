import { z } from "zod";
import { apiHandler, readJson } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";
import { createSubscriptionCheckout } from "@/lib/subscription";

const inputSchema = z.object({
  returnPath: z.enum(["/servicos/novo", "/configuracoes"]).default("/configuracoes"),
});

export async function POST(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    if (!context.user.email) {
      throw new AppError(422, "Sua conta precisa ter um e-mail para assinar.", "EMAIL_REQUIRED");
    }
    const input = inputSchema.parse(await readJson(request));
    return createSubscriptionCheckout({
      clinicId: context.clinicId,
      payerEmail: context.user.email,
      returnPath: input.returnPath,
    });
  });
}
