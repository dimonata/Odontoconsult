import Image from "next/image";

export function Avatar({
  name,
  image,
  size = 40,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
}) {
  if (image?.startsWith("/")) {
    return (
      <img
        src={image}
        alt={name ? `Foto de ${name}` : "Foto do perfil"}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-white/60"
      />
    );
  }
  if (image?.startsWith("https://")) {
    return (
      <Image
        src={image}
        alt={name ? `Foto de ${name}` : "Foto do perfil"}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-white/60"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initials = (name || "U")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{
        width: size,
        height: size,
        background: "var(--primary-soft)",
        color: "var(--primary)",
      }}
      aria-label={name ? `Avatar de ${name}` : "Avatar"}
    >
      {initials}
    </span>
  );
}
