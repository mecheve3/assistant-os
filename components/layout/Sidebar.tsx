"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  CalendarCheck,
  Settings,
  Menu,
  X,
  Heart,
  Brain,
  Home,
  Music2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { differenceInDays, parseISO } from "date-fns";

// ─── Nav structure ────────────────────────────────────────────────────────────

const TOP_ITEMS = [
  { href: "/",         label: "Command Center", icon: LayoutDashboard },
  { href: "/tasks",    label: "Tasks",           icon: ListTodo        },
  { href: "/projects", label: "Projects",        icon: FolderKanban    },
];

const SECTIONS = [
  {
    key: "health",
    label: "Health & Wellness",
    icon: Heart,
    prefix: "/health",
    children: [
      { href: "/health/exercise", label: "Exercise" },
      { href: "/health/food",     label: "Food" },
    ],
  },
  {
    key: "growth",
    label: "Personal Growth",
    icon: Brain,
    prefix: "/growth",
    children: [
      { href: "/growth/learning",   label: "Learning" },
      { href: "/growth/resources",  label: "Resources" },
    ],
  },
  {
    key: "homeLife",
    label: "Home & Daily Life",
    icon: Home,
    prefix: "/home-life",
    children: [
      { href: "/home-life/chores",      label: "Household Chores" },
      { href: "/home-life/shopping",    label: "Shopping & Groceries" },
      { href: "/home-life/maintenance", label: "Home Maintenance" },
      { href: "/home-life/car",         label: "Car Maintenance" },
    ],
  },
  {
    key: "hobbies",
    label: "Hobbies",
    icon: Music2,
    prefix: "/hobbies",
    children: [
      { href: "/hobbies/music",   label: "Music" },
      { href: "/hobbies/travel",  label: "Travel" },
      { href: "/hobbies/leisure", label: "Books, Movies, Restaurants" },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: "/weekly-review", label: "Weekly Review", icon: CalendarCheck },
  { href: "/settings",      label: "Settings",       icon: Settings      },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reviewOverdue, setReviewOverdue] = useState(false);

  // All sections expanded by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of SECTIONS) {
      init[s.key] = true;
    }
    return init;
  });

  useEffect(() => {
    supabase
      .from("weekly_reviews")
      .select("week_start_date")
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setReviewOverdue(
          !data || differenceInDays(new Date(), parseISO(data.week_start_date)) >= 7
        );
      });
  }, []);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-line shrink-0">
        <span className="text-base leading-none shrink-0">🤖</span>
        <span className="font-mono text-[11px] font-bold text-bright tracking-[0.15em] uppercase">
          Assistant
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

        {/* Top-level items */}
        {TOP_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors border-l-2",
                active
                  ? "bg-raised text-bright border-teal"
                  : "text-muted hover:text-bright hover:bg-raised/60 border-transparent",
              ].join(" ")}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="border-t border-line/40 my-2" />

        {/* Expandable sections */}
        {SECTIONS.map((section) => {
          const open = expanded[section.key] ?? false;
          const sectionActive = pathname.startsWith(section.prefix);

          return (
            <div key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors border-l-2",
                  sectionActive
                    ? "text-bright border-teal/50"
                    : "text-muted hover:text-bright hover:bg-raised/60 border-transparent",
                ].join(" ")}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-left">{section.label}</span>
                {open
                  ? <ChevronDown className="w-3 h-3 shrink-0 text-muted/60" />
                  : <ChevronRight className="w-3 h-3 shrink-0 text-muted/60" />
                }
              </button>

              {open && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {section.children.map((child) => {
                    const active = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={[
                          "flex items-center px-3 py-1.5 rounded text-xs transition-colors border-l-2",
                          active
                            ? "bg-raised text-bright border-teal"
                            : "text-muted/70 hover:text-bright hover:bg-raised/60 border-transparent",
                        ].join(" ")}
                      >
                        <span className="truncate">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="border-t border-line/40 my-2" />

        {/* Bottom items */}
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={[
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors border-l-2",
                active
                  ? "bg-raised text-bright border-teal"
                  : "text-muted hover:text-bright hover:bg-raised/60 border-transparent",
              ].join(" ")}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.href === "/weekly-review" && reviewOverdue && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-warn shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3.5 left-3.5 z-50 p-1.5 bg-card border border-line rounded"
        aria-label="Toggle menu"
      >
        {mobileOpen ? (
          <X className="w-4 h-4 text-bright" />
        ) : (
          <Menu className="w-4 h-4 text-bright" />
        )}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed lg:relative z-40 h-screen w-60 shrink-0",
          "bg-card border-r border-line",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {navContent}
      </aside>
    </>
  );
}
