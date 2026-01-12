import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { acceptEventInvite } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    await acceptEventInvite(session.accessToken, eventId, session.user.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to accept invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
