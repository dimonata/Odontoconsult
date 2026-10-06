"use client";

import { Tooth } from "@/components/tooth";

const rows = [
  { label: "Arcada superior direita", teeth: [18, 17, 16, 15, 14, 13, 12, 11] },
  { label: "Arcada superior esquerda", teeth: [21, 22, 23, 24, 25, 26, 27, 28] },
  { label: "Arcada inferior direita", teeth: [48, 47, 46, 45, 44, 43, 42, 41] },
  { label: "Arcada inferior esquerda", teeth: [31, 32, 33, 34, 35, 36, 37, 38] },
];

export function Odontogram({
  selected,
  onChange,
  historyTeeth = [],
  single = false,
}: {
  selected: number[];
  onChange: (teeth: number[]) => void;
  historyTeeth?: number[];
  single?: boolean;
}) {
  const selectedSet = new Set(selected);
  const historySet = new Set(historyTeeth);
  function toggle(number: number) {
    if (single) {
      onChange(selectedSet.has(number) ? [] : [number]);
      return;
    }
    onChange(
      selectedSet.has(number)
        ? selected.filter((item) => item !== number)
        : [...selected, number].sort((a, b) => a - b),
    );
  }
  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="min-w-[650px] space-y-4"
        role="group"
        aria-label="Odontograma de dentes permanentes"
      >
        <div className="grid grid-cols-2 gap-5">
          <div className="flex justify-end gap-0.5" aria-label={rows[0].label}>
            {rows[0].teeth.map((number) => (
              <Tooth
                key={number}
                number={number}
                selected={selectedSet.has(number)}
                hasHistory={historySet.has(number)}
                onClick={() => toggle(number)}
              />
            ))}
          </div>
          <div className="flex justify-start gap-0.5 border-l pl-5" aria-label={rows[1].label}>
            {rows[1].teeth.map((number) => (
              <Tooth
                key={number}
                number={number}
                selected={selectedSet.has(number)}
                hasHistory={historySet.has(number)}
                onClick={() => toggle(number)}
              />
            ))}
          </div>
        </div>
        <div className="mx-auto w-4/5 border-t" />
        <div className="grid grid-cols-2 gap-5">
          <div className="flex justify-end gap-0.5" aria-label={rows[2].label}>
            {rows[2].teeth.map((number) => (
              <Tooth
                key={number}
                number={number}
                selected={selectedSet.has(number)}
                hasHistory={historySet.has(number)}
                onClick={() => toggle(number)}
              />
            ))}
          </div>
          <div className="flex justify-start gap-0.5 border-l pl-5" aria-label={rows[3].label}>
            {rows[3].teeth.map((number) => (
              <Tooth
                key={number}
                number={number}
                selected={selectedSet.has(number)}
                hasHistory={historySet.has(number)}
                onClick={() => toggle(number)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
