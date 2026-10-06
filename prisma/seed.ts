import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/odonto_flow?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg(url) });

const patients = [
  ["Ana Beatriz Lima", "529.982.247-25", "11987654321", "1988-02-14"],
  ["Bruno Costa Nunes", "168.995.350-09", "21991234567", "1979-11-02"],
  ["Carla Mendes Rocha", "111.444.777-35", "31999887766", "1993-06-23"],
  ["Diego Alves Martins", "390.533.447-05", "41988776655", "1985-09-08"],
  ["Elisa Ferreira Luz", "286.255.280-06", "51977665544", "2001-01-19"],
  ["Felipe Gomes Reis", "012.345.678-90", "61996554433", "1990-04-30"],
  ["Gabriela Holanda", "987.654.321-00", "71995443322", "1975-12-11"],
  ["Henrique Pinto", "153.509.460-56", "81994332211", "1998-07-07"],
  ["Isabela Queiroz", "862.883.667-57", "85993221100", "1982-03-16"],
  ["João Vitor Freitas", "123.456.789-09", "11992110099", "1995-10-25"],
] as const;

const typeNames = [
  "Implante",
  "Limpeza",
  "Tratamento de canal",
  "Extração dentária",
  "Consulta/Avaliação",
  "Restauração",
];

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const seedEmail = process.env.SEED_USER_EMAIL || "dentista.demo@example.test";
  const user = await prisma.user.upsert({
    where: { email: seedEmail },
    update: {},
    create: {
      id: "seed-user-dentist",
      name: "Dra. Marina Demo",
      email: seedEmail,
      emailVerified: new Date(),
    },
  });
  const membership = await prisma.clinicMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { clinicId: true },
  });
  const clinicId = membership?.clinicId ?? `seed-clinic-${user.id}`;
  const namespace = createHash("sha256").update(clinicId).digest("hex").slice(0, 12);
  if (!membership) {
    await prisma.clinic.upsert({
      where: { id: clinicId },
      update: { name: "Clínica Sorriso Demo" },
      create: { id: clinicId, name: "Clínica Sorriso Demo" },
    });
  }
  await prisma.clinicMember.upsert({
    where: { clinicId_userId: { clinicId, userId: user.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { clinicId, userId: user.id, role: "OWNER", status: "ACTIVE" },
  });
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const types = await Promise.all(
    typeNames.map((name, index) =>
      prisma.procedureType.upsert({
        where: { clinicId_name: { clinicId, name } },
        update: { active: true },
        create: { id: `seed-${namespace}-type-${index + 1}`, clinicId, name },
      }),
    ),
  );

  const createdPatients = await Promise.all(
    patients.map(([fullName, cpf, phoneNormalized, birthDate], index) =>
      prisma.patient.upsert({
        where: { clinicId_cpfNormalized: { clinicId, cpfNormalized: cpf.replace(/\D/g, "") } },
        update: { fullName },
        create: {
          id: `seed-${namespace}-patient-${index + 1}`,
          clinicId,
          fullName,
          cpf,
          cpfNormalized: cpf.replace(/\D/g, ""),
          phone:
            phoneNormalized.length === 11
              ? `(${phoneNormalized.slice(0, 2)}) ${phoneNormalized.slice(2, 7)}-${phoneNormalized.slice(7)}`
              : phoneNormalized,
          phoneNormalized,
          birthDate: date(birthDate),
          notes:
            index % 3 === 0
              ? "Paciente fictício para desenvolvimento. Sem dados pessoais reais."
              : null,
        },
      }),
    ),
  );

  const values = [
    [350000, 120000, [11]],
    [25000, 4000, []],
    [120000, 25000, [16]],
    [48000, 8000, [26]],
    [18000, 2000, []],
    [420000, 145000, [21]],
    [32000, 5000, []],
    [145000, 30000, [36]],
    [65000, 15000, [48]],
    [22000, 3500, []],
    [280000, 95000, [12]],
    [55000, 9000, [15]],
    [19000, 2500, []],
    [175000, 42000, [17]],
    [38000, 6000, [45]],
    [310000, 110000, [22]],
    [27000, 4500, []],
    [99000, 21000, [31]],
    [45000, 7000, [14, 15]],
    [21000, 3000, []],
  ] as const;
  const procedureDates = [
    "2026-01-12",
    "2026-01-28",
    "2026-02-10",
    "2026-02-24",
    "2026-03-04",
    "2026-03-19",
    "2026-04-02",
    "2026-04-27",
    "2026-05-08",
    "2026-05-22",
    "2026-06-11",
    "2026-06-29",
    "2026-07-07",
    "2026-07-21",
    "2026-08-05",
    "2026-08-18",
    "2026-09-03",
    "2026-09-10",
    "2026-09-17",
    "2026-09-23",
  ];

  for (let index = 0; index < values.length; index += 1) {
    const [charged, cost, teeth] = values[index];
    await prisma.procedure.upsert({
      where: { id: `seed-${namespace}-procedure-${index + 1}` },
      update: {
        chargedAmountCents: BigInt(charged),
        costCents: BigInt(cost),
        performedAt: date(procedureDates[index]),
      },
      create: {
        id: `seed-${namespace}-procedure-${index + 1}`,
        clinicId,
        patientId: createdPatients[index % createdPatients.length].id,
        procedureTypeId: types[index % types.length].id,
        performedAt: date(procedureDates[index]),
        chargedAmountCents: BigInt(charged),
        costCents: BigInt(cost),
        description: "Registro clínico inteiramente fictício para ambiente de desenvolvimento.",
        createdById: user.id,
        teeth: { create: teeth.map((toothNumber) => ({ toothNumber })) },
      },
    });
  }

  for (let index = 0; index < 3; index += 1) {
    await prisma.patientFile.upsert({
      where: { storageKey: `seed/${namespace}/metadata-only/exam-${index + 1}.pdf` },
      update: {},
      create: {
        id: `seed-${namespace}-file-${index + 1}`,
        clinicId,
        patientId: createdPatients[index].id,
        originalName: `exame-ficticio-${index + 1}.pdf`,
        storageKey: `seed/${namespace}/metadata-only/exam-${index + 1}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 128000 + index * 1000,
        category: "EXAM",
        uploadedById: user.id,
      },
    });
  }

  console.info(
    "Seed concluído: 10 pacientes, 20 procedimentos e 3 metadados de arquivos fictícios.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha ao executar seed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
