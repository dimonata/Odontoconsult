"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { completeOnboarding } from "@/features/onboarding/actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label className="label" htmlFor="clinic-name">
          Qual é o nome do seu consultório?
        </label>
        <input
          className="input"
          id="clinic-name"
          name="name"
          required
          maxLength={120}
          autoFocus
          placeholder="Ex.: Clínica Sorriso"
        />
        {state?.error && (
          <p className="mt-2 text-sm" style={{ color: "var(--danger)" }} role="alert">
            {state.error}
          </p>
        )}
      </div>
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        {pending ? "Configurando..." : "Concluir cadastro"}
      </button>
    </form>
  );
}
