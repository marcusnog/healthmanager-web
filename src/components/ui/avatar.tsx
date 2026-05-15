import { cn } from "@/lib/cn";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      aria-label={name}
      className={cn("avatar", `avatar-${size}`, className)}
    >
      {initials(name)}
    </div>
  );
}
