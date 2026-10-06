import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth-context";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/secrets";
import { requirePremiumAccess } from "@/lib/subscription";

function redirectUri(request: Request) {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    `${new URL(request.url).origin}/api/integrations/google-calendar/callback`
  );
}

export async function GET(request: Request) {
  const returnUrl = new URL("/configuracoes", request.url);
  try {
    const context = await requireApiContext();
    await requirePremiumAccess(context.clinicId);
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const cookieStore = await cookies();
    if (!state || !code || cookieStore.get("calendar_oauth_state")?.value !== state) {
      throw new Error("INVALID_OAUTH_STATE");
    }
    if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
      throw new Error("GOOGLE_NOT_CONFIGURED");
    }
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID,
        client_secret: process.env.AUTH_GOOGLE_SECRET,
        code,
        redirect_uri: redirectUri(request),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) throw new Error("TOKEN_EXCHANGE_FAILED");
    const token = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };
    const existing = await prisma.calendarIntegration.findUnique({
      where: { clinicId_userId: { clinicId: context.clinicId, userId: context.userId } },
      select: { encryptedRefreshToken: true },
    });
    await prisma.calendarIntegration.upsert({
      where: { clinicId_userId: { clinicId: context.clinicId, userId: context.userId } },
      update: {
        encryptedAccessToken: encryptSecret(token.access_token),
        encryptedRefreshToken: token.refresh_token
          ? encryptSecret(token.refresh_token)
          : existing?.encryptedRefreshToken,
        accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
        revokedAt: null,
        connectedAt: new Date(),
      },
      create: {
        clinicId: context.clinicId,
        userId: context.userId,
        encryptedAccessToken: encryptSecret(token.access_token),
        encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope,
      },
    });
    returnUrl.searchParams.set("calendar", "connected");
  } catch {
    returnUrl.searchParams.set("calendar", "error");
  }
  const response = NextResponse.redirect(returnUrl);
  response.cookies.delete("calendar_oauth_state");
  return response;
}
