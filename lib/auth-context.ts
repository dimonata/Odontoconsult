import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type AuthContext = {
  userId: string;
  clinicId: string;
  role: "OWNER" | "DENTIST" | "RECEPTIONIST";
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    customImageKey: string | null;
  };
  clinic: { name: string };
};

export const getAuthenticatedUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, customImageKey: true },
  });
});

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const membership = await prisma.clinicMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      clinicId: true,
      role: true,
      clinic: { select: { name: true } },
    },
  });

  if (!membership) return null;
  return {
    userId: user.id,
    clinicId: membership.clinicId,
    role: membership.role,
    user,
    clinic: membership.clinic,
  };
});

export async function requireApiContext() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(401, "Sua sessão expirou.", "UNAUTHENTICATED");
  const context = await getAuthContext();
  if (!context) throw new AppError(403, "Consultório não configurado.", "ONBOARDING_REQUIRED");
  return context;
}

export async function requirePageContext() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const context = await getAuthContext();
  if (!context) redirect("/onboarding");
  return context;
}
