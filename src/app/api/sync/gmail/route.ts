import { NextResponse } from "next/server";
import { runGmailSync } from "@/lib/gmail-sync";

export async function POST() {
  try {
    const result = await runGmailSync();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GMAIL_SYNC_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to synchronize Gmail inbox" },
      { status: 500 }
    );
  }
}