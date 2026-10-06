import { Prisma } from "@/generated/prisma/client";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

type ApiHandler<T> = () => Promise<T>;

export async function apiHandler<T>(handler: ApiHandler<T>): Promise<Response> {
  try {
    const data = await handler();
    return Response.json(data);
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return Response.json(
        { error: "Dados inválidos.", code: "VALIDATION_ERROR", details: error.flatten() },
        { status: 422 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json(
        { error: "Já existe um registro com esses dados.", code: "CONFLICT" },
        { status: 409 },
      );
    }

    console.error("Falha interna sem dados sensíveis", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Não foi possível concluir a operação.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "O corpo da requisição não é um JSON válido.", "INVALID_JSON");
  }
}
