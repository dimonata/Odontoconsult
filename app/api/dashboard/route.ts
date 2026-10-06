import { z } from "zod";
import { apiHandler } from "@/lib/api";
import { requireApiContext } from "@/lib/auth-context";
import { getDashboardData } from "@/services/dashboard";

const schema = z.object({
  period: z.enum(["today", "7d", "30d", "month", "year", "custom"]).default("month"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await requireApiContext();
    const url = new URL(request.url);
    const input = schema.parse(Object.fromEntries(url.searchParams));
    return getDashboardData(context, input);
  });
}
