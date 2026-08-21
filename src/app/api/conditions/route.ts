import { NextResponse } from "next/server";
import { fetchSurfConditions, getDefaultSpot } from "@/engines/conditions";
import type { SurfSpot } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const name = searchParams.get("name");

  const   spot: SurfSpot =
    lat && lng
      ? {
          id: "custom",
          name: name ?? "Custom spot",
          latitude: Number(lat),
          longitude: Number(lng),
        }
      : getDefaultSpot();

  try {
    const conditions = await fetchSurfConditions(spot);
    return NextResponse.json(conditions);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch conditions";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
