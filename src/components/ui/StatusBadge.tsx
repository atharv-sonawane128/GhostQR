type StatusType = "found" | "lost" | "pending" | "active" | "closed" | "returned";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  found:    { label: "Found",    className: "badge-found"    },
  lost:     { label: "Lost",     className: "badge-lost"     },
  pending:  { label: "Pending",  className: "badge-pending"  },
  active:   { label: "Active",   className: "badge-purple"   },
  closed:   { label: "Closed",   className: "badge-found"    },
  returned: { label: "Returned", className: "badge-found"    },
};

export default function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status] ?? { label: status, className: "badge-pending" };
  return <span className={config.className}>{config.label}</span>;
}
