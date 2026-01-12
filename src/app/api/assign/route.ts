import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { assignAdultToEvents } from "@/lib/google-calendar";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventIds, adultEmail } = await request.json();

    if (!eventIds?.length || !adultEmail) {
      return NextResponse.json(
        { error: "eventIds and adultEmail are required" },
        { status: 400 }
      );
    }

    await assignAdultToEvents(session.accessToken, eventIds, adultEmail);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to assign adult:", error);
    const errorStatus = (error as { status?: number }).status;
    if (errorStatus === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to assign adult" },
      { status: 500 }
    );
  }
}
