import { NextResponse } from "next/server";
import { handleRecentSystemEventRewards } from "@/lib/energy/events";
import { getEnergySettings } from "@/lib/energy/settings";

export async function POST() {
  try {
    const [rewards, settings] = await Promise.all([
      handleRecentSystemEventRewards(),
      getEnergySettings("effective")
    ]);

    return NextResponse.json({ rewards, settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "energy processing failed" },
      { status: 500 }
    );
  }
}
