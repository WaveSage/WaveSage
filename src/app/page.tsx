"use client";

import { useCallback, useEffect, useState } from "react";
import { getCoachPeriod } from "@/lib/coach-period";
import type {
  CoachResponse,
  RegionalForecast,
  SurfSpot,
} from "@/lib/types";
import { type UserProfile } from "@/lib/auth/types";
import { AppTabs, type AppTab } from "@/components/AppTabs";
import { SagePanel } from "@/components/SagePanel";
import {
  SoCalConditions,
  getDefaultSelectedSpotId,
} from "@/components/SoCalConditions";
import { AppLogo } from "@/components/AppLogo";
import { UserReportsGallery } from "@/components/UserReportsGallery";
import { UserAccountMenu } from "@/components/UserAccountMenu";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<AppTab>("sage");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [regional, setRegional] = useState<RegionalForecast | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [regionalError, setRegionalError] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState(getDefaultSelectedSpotId());
  const [sageSpotId, setSageSpotId] = useState(getDefaultSelectedSpotId());
  const [latestSage, setLatestSage] = useState<CoachResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [highlightReportId, setHighlightReportId] = useState<string | null>(
    null
  );

  const loadProfile = useCallback(async () => {
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", {
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      if (!response.ok) {
        throw new Error("Could not load your profile.");
      }
      const data = (await response.json()) as { user: UserProfile };
      setUser(data.user);
      return data.user;
    } catch (error) {
      const text =
        error instanceof Error
          ? error.name === "TimeoutError"
            ? "Profile request timed out. The dev server may be stuck — try refreshing."
            : error.message
          : "Could not load your profile.";
      setProfileError(text);
      return null;
    }
  }, []);

  const loadRegional = useCallback(async () => {
    setRegionalLoading(true);
    setRegionalError(null);

    try {
      const response = await fetch("/api/conditions/region", {
        signal: AbortSignal.timeout(90_000),
      });
      const data = (await response.json()) as RegionalForecast & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load regional conditions");
      }

      setRegional(data);
      return data;
    } catch (error) {
      const text =
        error instanceof Error
          ? error.name === "TimeoutError"
            ? "Regional conditions timed out. Try Refresh on the Spots tab."
            : error.message
          : "Could not load SoCal conditions.";
      setRegionalError(text);
      return null;
    } finally {
      setRegionalLoading(false);
    }
  }, []);

  const loadBriefing = useCallback(
    async (
      profile: UserProfile,
      spotId: string,
      regionalData?: RegionalForecast | null
    ) => {
      setBriefingLoading(true);

      try {
        const response = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            spotId,
            regionalConditions: regionalData?.conditions,
            coachPeriod: getCoachPeriod(),
            stylePreference: profile.stylePreference,
          }),
        });

        const data = (await response.json()) as CoachResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Briefing failed");
        }

        setLatestSage(data);
      } catch {
        setLatestSage(null);
      } finally {
        setBriefingLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadProfile().then((profile) => {
      if (!profile) return;

      const spotId =
        profile.favoriteSpot?.id ?? getDefaultSelectedSpotId();
      setSelectedSpotId(spotId);
      setSageSpotId(spotId);

      loadBriefing(profile, spotId, null);
    });
  }, [loadProfile, loadBriefing]);

  useEffect(() => {
    if (regional || regionalLoading) return;
    loadRegional();
  }, [regional, regionalLoading, loadRegional]);

  function handleSelectSpot(spot: SurfSpot) {
    setSelectedSpotId(spot.id);
  }

  async function handleFavoriteSpot(spot: SurfSpot) {
    if (!user) return;

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteSpot: spot }),
      });

      const data = (await response.json()) as { user: UserProfile; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save favorite spot");
      }

      setUser(data.user);
      setSelectedSpotId(spot.id);
      setSageSpotId(spot.id);
      setActiveTab("sage");
      loadBriefing(data.user, spot.id, regional);
    } catch {
      // keep UI responsive even if save fails
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function handleProfileUpdated(next: UserProfile) {
    setUser(next);
    const spotId = next.favoriteSpot?.id ?? sageSpotId;
    void loadBriefing(next, spotId, regional);
  }

  function handleReportSubmitted() {
    setReportsRefreshKey((k) => k + 1);
  }

  function handleViewReports(reportId?: string) {
    setActiveTab("reports");
    if (reportId) {
      setHighlightReportId(reportId);
      setTimeout(() => {
        document
          .getElementById(`report-${reportId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }

  const favoriteSpotId = user?.favoriteSpot?.id ?? null;

  function handleSageSpotChange(spotId: string) {
    if (spotId === sageSpotId) return;
    setSageSpotId(spotId);
    if (user) {
      void loadBriefing(user, spotId, regional);
    }
  }

  if (!user) {
    return (
      <main className="app-shell">
        {profileError ? (
          <>
            <p className="muted">{profileError}</p>
            <button
              type="button"
              className="refresh-btn"
              onClick={() => loadProfile().then((profile) => {
                if (!profile) return;
                const spotId =
                  profile.favoriteSpot?.id ?? getDefaultSelectedSpotId();
                setSelectedSpotId(spotId);
                loadBriefing(profile, spotId, null);
              })}
            >
              Retry
            </button>
          </>
        ) : (
          <p className="muted">Loading your profile...</p>
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <AppLogo height={72} asHeading />
        <div className="topbar-right">
          <AppTabs active={activeTab} onChange={setActiveTab} />
          <UserAccountMenu
            user={user}
            onLogout={handleLogout}
            onProfileUpdated={handleProfileUpdated}
          />
        </div>
      </header>

      {activeTab === "sage" && (
        <SagePanel
          user={user}
          sageSpotId={sageSpotId}
          conditions={latestSage?.conditions ?? null}
          styleOutlook={latestSage?.styleOutlook ?? null}
          regionalLite={
            regional?.conditions.map((c) => ({
              spot: { id: c.spot.id, name: c.spot.name },
              waveHeightFt: c.waveHeightFt,
              quality: c.quality,
            })) ?? []
          }
          briefingLoading={briefingLoading}
          reportsRefreshKey={reportsRefreshKey}
          onSageSpotChange={handleSageSpotChange}
          onReportSubmitted={handleReportSubmitted}
          onViewReports={handleViewReports}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {activeTab === "spots" && (
        <SoCalConditions
          forecast={regional}
          loading={regionalLoading}
          error={regionalError}
          selectedSpotId={selectedSpotId}
          favoriteSpotId={favoriteSpotId}
          reportsRefreshKey={reportsRefreshKey}
          onSelectSpot={handleSelectSpot}
          onFavoriteSpot={handleFavoriteSpot}
          onRefresh={loadRegional}
          onOpenReport={handleViewReports}
        />
      )}

      {activeTab === "reports" && (
        <section className="panel reports-panel">
          <h2>User Reports</h2>
          <p className="muted">
            Accepted condition photos from surfers at the break. Tap a photo in
            Spots to jump to the full report.
          </p>
          <UserReportsGallery
            refreshKey={reportsRefreshKey}
            highlightReportId={highlightReportId}
          />
        </section>
      )}
    </main>
  );
}
