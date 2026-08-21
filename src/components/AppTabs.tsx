"use client";

type AppTab = "sage" | "spots" | "reports";

interface AppTabsProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  /** Guests only see Sage + User Reports (Trestles preview). */
  guestMode?: boolean;
}

export function AppTabs({ active, onChange, guestMode = false }: AppTabsProps) {
  return (
    <nav className="app-tabs" aria-label="Main navigation">
      <button
        type="button"
        className={active === "sage" ? "active" : ""}
        onClick={() => onChange("sage")}
      >
        Sage
      </button>
      {!guestMode ? (
        <button
          type="button"
          className={active === "spots" ? "active" : ""}
          onClick={() => onChange("spots")}
        >
          Spots
        </button>
      ) : null}
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
