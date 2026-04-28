import { NextResponse } from "next/server";
import { createDailyLoginEnergyEvent } from "@/lib/energy/events";
import { getEnergySettings } from "@/lib/energy/settings";

export async function POST() {
  try {
    const [daily, settings] = await Promise.all([
      createDailyLoginEnergyEvent(),
      getEnergySettings("effective")
    ]);

    return NextResponse.json({ daily, settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "daily login failed" },
      { status: 500 }
    );
  }
}
