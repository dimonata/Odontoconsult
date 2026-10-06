export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "APP_ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function assertFound<T>(
  value: T | null | undefined,
  message = "Registro não encontrado.",
): T {
  if (value == null) throw new AppError(404, message, "NOT_FOUND");
  return value;
}
