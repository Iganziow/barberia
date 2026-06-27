/**
 * Avatar del barbero: muestra la foto (User.avatar) si existe, o cae a
 * las iniciales sobre el color del barbero. Reutilizado en el admin
 * (lista + perfil) y en el booking público.
 *
 * La foto se renderiza con onError → si el link está roto o no es una
 * imagen, escondemos el <img> y queda visible el fondo de iniciales que
 * está DETRÁS. Así nunca se ve un ícono de imagen rota.
 */
"use client";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function BarberAvatar({
  name,
  photoUrl,
  color = "#c87941",
  size = 40,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  color?: string | null;
  /** Diámetro en px. */
  size?: number;
  className?: string;
}) {
  const fontSize = Math.round(size * 0.36);
  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: color || "#c87941", fontSize }}
      aria-hidden="true"
    >
      <span>{initialsOf(name)}</span>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Link roto → ocultar img, queda el fondo de iniciales.
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}
