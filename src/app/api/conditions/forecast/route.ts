import { NextResponse } from "next/server";
import { fetchSpotForecast } from "@/engines/conditions/forecast";
import { getSpotById } from "@/lib/socal-spots";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spotId = searchParams.get("spotId");

    if (!spotId) {
      return NextResponse.json({ error: "spotId is required" }, { status: 400 });
    }

    const spot = getSpotById(spotId);
    if (!spot) {
      return NextResponse.json({ error: "Spot not found" }, { status: 404 });
    }

    const forecast = await fetchSpotForecast(spot);
    return NextResponse.json(forecast);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Forecast unavailable";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
