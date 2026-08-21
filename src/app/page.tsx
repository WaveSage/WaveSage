"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCoachPeriod } from "@/lib/coach-period";
import type {
  CoachResponse,
  RegionalForecast,
  SurfSpot,
} from "@/lib/types";
import { type UserProfile } from "@/lib/auth/types";
import { getGuestProfile, GUEST_SPOT_ID } from "@/lib/auth/guest";
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
  const [authChecked, setAuthChecked] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [regional, setRegional] = useState<RegionalForecast | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [regionalError, setRegionalError] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState(getDefaultSelectedSpotId());
  const [sageSpotId, setSageSpotId] = useState(GUEST_SPOT_ID);
  const [latestSage, setLatestSage] = useState<CoachResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [highlightReportId, setHighlightReportId] = useState<string | null>(
    null
  );

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

  const loadProfile = useCallback(async () => {
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", {
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 401) {
        setUser(null);
        setGuestMode(true);
        setSageSpotId(GUEST_SPOT_ID);
        setSelectedSpotId(GUEST_SPOT_ID);
        await loadBriefing(getGuestProfile(), GUEST_SPOT_ID, null);
        return null;
      }
      if (!response.ok) {
        throw new Error("Could not load your profile.");
      }
      const data = (await response.json()) as { user: UserProfile };
      setUser(data.user);
      setGuestMode(false);
      return data.user;
    } catch (error) {
      const text =
        error instanceof Error
          ? error.name === "TimeoutError"
            ? "Profile request timed out. The server may be waking up — try refreshing."
            : error.message
          : "Could not load your profile.";
      setProfileError(text);
      return null;
    } finally {
      setAuthChecked(true);
    }
  }, [loadBriefing]);

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

  useEffect(() => {
    loadProfile().then((profile) => {
      if (!profile) return;

      const spotId =
        profile.favoriteSpot?.id ?? getDefaultSelectedSpotId();
      setSelectedSpotId(spotId);
      setSageSpotId(spotId);

      void loadBriefing(profile, spotId, null);
    });
  }, [loadProfile, loadBriefing]);

  useEffect(() => {
    if (regional || regionalLoading) return;
    void loadRegional();
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
      void loadBriefing(data.user, spot.id, regional);
    } catch {
      // keep UI responsive even if save fails
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
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
  const displayUser = user ?? getGuestProfile();

  function handleSageSpotChange(spotId: string) {
    if (guestMode) return;
    if (spotId === sageSpotId) return;
    setSageSpotId(spotId);
    if (user) {
      void loadBriefing(user, spotId, regional);
    }
  }

  function handleTabChange(tab: AppTab) {
    setActiveTab(tab);
  }

  if (!authChecked) {
    return (
      <main className="app-shell">
        {profileError ? (
          <>
            <p className="muted">{profileError}</p>
            <button
              type="button"
              className="refresh-btn"
              onClick={() => void loadProfile()}
            >
              Retry
            </button>
          </>
        ) : (
          <p className="muted">Loading WaveSage…</p>
        )}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <AppLogo height={72} asHeading />
        <div className="topbar-right">
          <AppTabs
            active={activeTab}
            onChange={handleTabChange}
          />
          {user ? (
            <UserAccountMenu
              user={user}
              onLogout={handleLogout}
              onProfileUpdated={handleProfileUpdated}
            />
          ) : (
            <div className="guest-auth-links">
              <Link href="/login" className="guest-auth-link">
                Sign in
              </Link>
              <Link href="/signup" className="guest-auth-link primary">
                Sign up
              </Link>
              <Link href="/privacy" className="guest-auth-link">
                Privacy
              </Link>
            </div>
          )}
        </div>
      </header>

      {activeTab === "sage" && (
        <SagePanel
          user={displayUser}
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
          guestMode={guestMode}
          onSageSpotChange={handleSageSpotChange}
          onReportSubmitted={handleReportSubmitted}
          onViewReports={handleViewReports}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {activeTab === "spots" ? (
        <SoCalConditions
          forecast={regional}
          loading={regionalLoading}
          error={regionalError}
          selectedSpotId={selectedSpotId}
          favoriteSpotId={favoriteSpotId}
          reportsRefreshKey={reportsRefreshKey}
          guestMode={guestMode}
          onSelectSpot={handleSelectSpot}
          onFavoriteSpot={handleFavoriteSpot}
          onRefresh={loadRegional}
          onOpenReport={handleViewReports}
        />
      ) : null}

      {activeTab === "reports" && (
        <section className="panel reports-panel">
          <h2>User Reports</h2>
          <p className="muted">
            {guestMode
              ? "Public condition photos for Lower Trestles. Sign in to submit your own report or browse other spots."
              : "Accepted condition photos from surfers at the break. Tap a photo in Spots to jump to the full report."}
          </p>
          {guestMode ? (
            <p className="guest-reports-cta">
              <Link href="/login">Sign in</Link> or{" "}
              <Link href="/signup">create an account</Link> to submit a User Wave
              Report.
            </p>
          ) : null}
          <UserReportsGallery
            refreshKey={reportsRefreshKey}
            highlightReportId={highlightReportId}
            spotId={guestMode ? GUEST_SPOT_ID : undefined}
            readOnly={guestMode}
          />
        </section>
      )}
    </main>
  );
}
