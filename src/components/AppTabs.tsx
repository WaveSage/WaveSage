"use client";

type AppTab = "sage" | "spots" | "reports";

interface AppTabsProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function AppTabs({ active, onChange }: AppTabsProps) {
  return (
    <nav className="app-tabs" aria-label="Main navigation">
      <button
        type="button"
        className={active === "sage" ? "active" : ""}
        onClick={() => onChange("sage")}
      >
        Sage
      </button>
      <button
        type="button"
        className={active === "spots" ? "active" : ""}
        onClick={() => onChange("spots")}
      >
        Spots
      </button>
      <button
        type="button"
        className={active === "reports" ? "active" : ""}
        onClick={() => onChange("reports")}
      >
        User Reports
      </button>
    </nav>
  );
}

export type { AppTab };
