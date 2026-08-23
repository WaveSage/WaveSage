import { NextResponse } from "next/server";
import { fetchRegionalConditions } from "@/engines/conditions/regional";

export const maxDuration = 25;

export async function GET() {  try {
    const forecast = await fetchRegionalConditions();
    return NextResponse.json(forecast);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch regional conditions";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
