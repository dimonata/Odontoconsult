import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // A URL local segura permite gerar o client em CI/build. Comandos que acessam
    // dados continuam falhando se não houver um PostgreSQL real nesse endereço.
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/odonto_flow?schema=public",
  },
});
