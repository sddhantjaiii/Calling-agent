import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminCardProps {
  title: string;
  value?: string | number;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function AdminCard({
  title,
  value,
  description,
  icon: Icon,
  children,
  className = '',
  trend,
}: AdminCardProps) {
  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {Icon && (
              <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
            )}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              {value !== undefined && (
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {value}
                  </div>
                  {trend && (
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        trend.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {trend.isPositive ? '+' : ''}
                      {trend.value}%
                    </div>
                  )}
                </dd>
              )}
              {description && (
                <dd className="mt-1 text-sm text-gray-500">{description}</dd>
              )}
            </dl>
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

export default AdminCard;