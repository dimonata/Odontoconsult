export function civilDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toCivilDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function formatDateBr(value: Date | string) {
  const date = typeof value === "string" ? civilDate(value.slice(0, 10)) : value;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

export function ageFromBirthDate(value: Date, now = new Date()) {
  const currentParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(currentParts.find((part) => part.type === type)?.value ?? 0);

  const currentYear = get("year");
  const currentMonth = get("month");
  const currentDay = get("day");
  const birthYear = value.getUTCFullYear();
  const birthMonth = value.getUTCMonth() + 1;
  const birthDay = value.getUTCDate();
  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) age -= 1;
  return age;
}
