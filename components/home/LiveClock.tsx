"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div>
        <div className="h-10 w-36 bg-raised rounded animate-pulse mb-1.5" />
        <div className="h-3 w-44 bg-raised rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <p
        suppressHydrationWarning
        className="text-4xl font-mono font-bold text-bright tracking-tight tabular-nums"
      >
        {format(now, "HH:mm:ss")}
      </p>
      <p
        suppressHydrationWarning
        className="text-xs font-mono text-muted mt-1 capitalize"
      >
        {format(now, "EEEE, d 'de' MMMM yyyy", { locale: es })}
      </p>
    </div>
  );
}
