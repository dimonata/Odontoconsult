import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { getAuthenticatedUser, getAuthContext } from "@/lib/auth-context";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect((await getAuthContext()) ? "/dashboard" : "/onboarding");
  return <Landing />;
}
