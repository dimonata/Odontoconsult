import { SubscriptionReturn } from "@/components/subscription-return";
import { requirePageContext } from "@/lib/auth-context";

export const metadata = { title: "Confirmar assinatura" };

export default async function SubscriptionReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  await requirePageContext();
  const requested = (await searchParams).returnTo;
  const returnTo = ["/servicos/novo", "/configuracoes"].includes(requested ?? "")
    ? requested!
    : "/configuracoes";
  return <SubscriptionReturn returnTo={returnTo} />;
}
