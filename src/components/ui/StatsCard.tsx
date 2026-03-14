import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
}

export default function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
}: StatsCardProps) {
  const changeColors = {
    up:      "text-emerald-600",
    down:    "text-rose-600",
    neutral: "text-gray-500",
  };

  return (
    <div className="card-hover p-5 animate-slide-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-medium ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
