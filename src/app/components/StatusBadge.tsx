import { Circle, AlertTriangle, XCircle } from 'lucide-react';

type StatusType = 'healthy' | 'warning' | 'error' | 'idle' | 'running' | 'completed';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig = {
  healthy: {
    color: 'bg-primary/15 text-foreground border-primary/35',
    icon: Circle,
    iconColor: 'text-primary',
    label: 'System Healthy',
  },
  warning: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    label: 'Warning',
  },
  error: {
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    label: 'Error',
  },
  idle: {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Circle,
    iconColor: 'text-slate-400',
    label: 'Idle',
  },
  running: {
    color: 'bg-primary/15 text-foreground border-primary/35',
    icon: Circle,
    iconColor: 'text-primary animate-pulse',
    label: 'Running',
  },
  completed: {
    color: 'bg-primary/15 text-foreground border-primary/35',
    icon: Circle,
    iconColor: 'text-primary',
    label: 'Completed',
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 border text-sm font-medium ${config.color}`}>
      <Icon className={`w-4 h-4 ${config.iconColor}`} fill="currentColor" />
      {label || config.label}
    </div>
  );
}