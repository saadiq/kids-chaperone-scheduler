import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { acceptEventInvite } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventId } = body;

  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json(
      { error: "eventId must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    await acceptEventInvite(session.accessToken, eventId, session.user.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to accept invite:", error);
    const errorStatus = (error as { status?: number }).status;
    if (errorStatus === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Failed to accept invite";
    const status = message.includes("not an attendee") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
