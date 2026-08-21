"use client";

import { useMemo, useState } from "react";
import type { StyleOutlook, SurfConditions } from "@/lib/types";
import type { UserProfile } from "@/lib/auth/types";
import { SurfEngine } from "@/components/surf-engine/SurfEngine";
import { getSpotById, SOCAL_SPOTS } from "@/lib/socal-spots";
import { getDefaultSelectedSpotId } from "@/components/SoCalConditions";
import { EditQuickSpotsModal } from "@/components/EditQuickSpotsModal";

interface RegionalLite {
  spot: { id: string; name: string };
  waveHeightFt: number;
  quality: SurfConditions["quality"];
}

interface SagePanelProps {
  user: UserProfile;
  sageSpotId: string;
  conditions: SurfConditions | null;
  styleOutlook: StyleOutlook | null;
  regionalLite?: RegionalLite[];
  briefingLoading: boolean;
  reportsRefreshKey: number;
  onSageSpotChange: (spotId: string) => void;
  onReportSubmitted: () => void;
  onViewReports: (reportId?: string) => void;
  onProfileUpdated: (user: UserProfile) => void;
}

export function SagePanel({
  user,
  sageSpotId,
  conditions,
  styleOutlook,
  regionalLite = [],
  briefingLoading,
  reportsRefreshKey,
  onSageSpotChange,
  onReportSubmitted,
  onViewReports,
  onProfileUpdated,
}: SagePanelProps) {
  const [editingQuickSpots, setEditingQuickSpots] = useState(false);

  const regionalSnapshots = regionalLite
    .map((r) => {
      const spot = getSpotById(r.spot.id);
      if (!spot) return null;
      return {
        spot,
        waveHeightFt: r.waveHeightFt,
        quality: r.quality,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const defaultQuickSpotIds = useMemo(() => {
    const fav = user.favoriteSpot?.id ?? getDefaultSelectedSpotId();
    const others = SOCAL_SPOTS.map((s) => s.id).filter((id) => id !== fav);
    return [fav, ...others].slice(0, 5);
  }, [user.favoriteSpot]);

  const selectedSpotIds = useMemo(() => {
    const raw =
      user.favoriteSpotIds && user.favoriteSpotIds.length
        ? user.favoriteSpotIds
        : defaultQuickSpotIds;
    return Array.from(new Set(raw)).slice(0, 5);
  }, [user.favoriteSpotIds, defaultQuickSpotIds]);

  return (
    <section className="sage-panel sage-panel-engine">
      <SurfEngine
        user={user}
        conditions={conditions}
        styleOutlook={styleOutlook}
        sageSpotId={sageSpotId}
        selectedSpotIds={selectedSpotIds}
        regionalSnapshots={regionalSnapshots}
        briefingLoading={briefingLoading}
        reportsRefreshKey={reportsRefreshKey}
        onSelectSpot={onSageSpotChange}
        onEditSpots={() => setEditingQuickSpots(true)}
        onReportSubmitted={onReportSubmitted}
        onViewReports={() => onViewReports()}
      />

      {editingQuickSpots ? (
        <EditQuickSpotsModal
          user={user}
          selectedSpotIds={selectedSpotIds}
          onClose={() => setEditingQuickSpots(false)}
          onSaved={onProfileUpdated}
        />
      ) : null}
    </section>
  );
}
