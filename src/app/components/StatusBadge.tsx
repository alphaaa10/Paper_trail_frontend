import { Circle, AlertTriangle, XCircle } from 'lucide-react';

type StatusType = 'healthy' | 'warning' | 'error' | 'idle' | 'running' | 'completed';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig = {
  healthy: {
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: Circle,
    iconColor: 'text-green-500',
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
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Circle,
    iconColor: 'text-gray-400',
    label: 'Idle',
  },
  running: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Circle,
    iconColor: 'text-blue-500 animate-pulse',
    label: 'Running',
  },
  completed: {
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: Circle,
    iconColor: 'text-green-500',
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