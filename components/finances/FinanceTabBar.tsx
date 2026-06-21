"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Overview", href: "/finances" },
  { label: "Transactions", href: "/finances/transactions" },
  { label: "Debts", href: "/finances/debts" },
  { label: "Accounts", href: "/finances/accounts" },
];

export function FinanceTabBar() {
  const pathname = usePathname();

  return (
    <div className="flex gap-0 border-b border-line mb-6">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-xs font-mono border-b-2 transition-colors ${
              active
                ? "border-teal text-teal"
                : "border-transparent text-muted hover:text-bright"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
