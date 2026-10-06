"use client";

import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartItem = {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  procedures: number;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function DashboardCharts({ data }: { data: ChartItem[] }) {
  if (!data.length)
    return (
      <div
        className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm"
        style={{ color: "var(--muted)" }}
      >
        Registre procedimentos para visualizar a evolução financeira.
      </div>
    );
  return (
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <section className="card min-w-0">
        <div className="mb-6">
          <h2 className="font-semibold">Evolução financeira</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Faturamento, custos e lucro por mês
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0b8e98" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#0b8e98" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) => money.format(Number(value))}
                contentStyle={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  borderRadius: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Faturamento"
                stroke="#0b8e98"
                fill="url(#revenue)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Lucro"
                stroke="#2a9d71"
                fill="transparent"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="costs"
                name="Custos"
                stroke="#d26b73"
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card min-w-0">
        <div className="mb-6">
          <h2 className="font-semibold">Procedimentos realizados</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Volume mensal no período
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="procedures" name="Procedimentos" fill="#0b8e98" radius={[6, 6, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
