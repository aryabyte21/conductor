import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // TODO: Integrate with Resend when API key is available
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.contacts.create({
    //   email,
    //   audienceId: process.env.RESEND_AUDIENCE_ID,
    // });

    // For now, log and return success
    console.log(`[subscribe] New subscriber: ${email}`);

    return NextResponse.json(
      { success: true, message: "Subscribed successfully" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
