import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <span className="text-muted-light">{icon}</span>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
      {action}
    </div>
  );
}
