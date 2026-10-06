import { Filter } from "lucide-react";

const options = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Este mês" },
  { value: "year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

export function PeriodFilter({ period, from, to }: { period: string; from?: string; to?: string }) {
  return (
    <form className="flex flex-wrap items-end gap-2" method="get">
      <div>
        <label className="sr-only" htmlFor="period">
          Período
        </label>
        <select id="period" name="period" className="input min-w-36" defaultValue={period}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {period === "custom" && (
        <>
          <div>
            <label className="sr-only" htmlFor="from">
              Data inicial
            </label>
            <input className="input" id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div>
            <label className="sr-only" htmlFor="to">
              Data final
            </label>
            <input className="input" id="to" name="to" type="date" defaultValue={to} />
          </div>
        </>
      )}
      <button className="btn-secondary" type="submit">
        <Filter className="size-4" />
        Aplicar
      </button>
    </form>
  );
}
