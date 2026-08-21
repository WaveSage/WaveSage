import { NextResponse } from "next/server";
import { fetchSurfConditions, getDefaultSpot } from "@/engines/conditions";
import { recommendFromConditions } from "@/engines/equipment";
import type { Inventory } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { inventory?: Inventory };
    const inventory = body.inventory;
    if (!inventory) {
      return NextResponse.json(
        { error: "Inventory is required" },
        { status: 400 }
      );
    }

    const spot = inventory.defaultSpot ?? getDefaultSpot();
    const conditions = await fetchSurfConditions(spot);
    const recommendations = recommendFromConditions(inventory, conditions);

    return NextResponse.json({ conditions, recommendations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Recommendation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
