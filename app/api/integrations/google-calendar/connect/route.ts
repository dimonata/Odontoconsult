import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";
import { requirePremiumAccess } from "@/lib/subscription";

function redirectUri(request: Request) {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    `${new URL(request.url).origin}/api/integrations/google-calendar/callback`
  );
}

export async function GET(request: Request) {
  try {
    const context = await requireApiContext();
    await requirePremiumAccess(context.clinicId);
    if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
      throw new AppError(503, "Credenciais Google não configuradas.", "GOOGLE_NOT_CONFIGURED");
    }
    const state = randomBytes(24).toString("base64url");
    const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorization.search = new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID,
      redirect_uri: redirectUri(request),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        "https://www.googleapis.com/auth/calendar.events.freebusy",
      ].join(" "),
    }).toString();
    const response = NextResponse.redirect(authorization);
    response.cookies.set("calendar_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (error) {
    const url = new URL("/configuracoes?calendar=error", request.url);
    if (error instanceof AppError) url.searchParams.set("reason", error.code);
    return NextResponse.redirect(url);
  }
}
