import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { getAuthenticatedUser, getAuthContext } from "@/lib/auth-context";

export default async function HomePage() {
  const user = await getAuthenticatedUser();
  if (user) redirect((await getAuthContext()) ? "/dashboard" : "/onboarding");
  return <Landing />;
}
