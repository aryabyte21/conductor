import { NextRequest, NextResponse } from "next/server";

let lastSentAt = 0;
const MIN_SEND_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const secret = process.env.NEWSLETTER_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "NEWSLETTER_SECRET not configured" },
        { status: 503 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limit: max 1 send per hour
    const now = Date.now();
    if (now - lastSentAt < MIN_SEND_INTERVAL_MS) {
      const waitMinutes = Math.ceil((MIN_SEND_INTERVAL_MS - (now - lastSentAt)) / 60_000);
      return NextResponse.json(
        { error: `Rate limited. Try again in ${waitMinutes} minutes.` },
        { status: 429 }
      );
    }

    // Validate body
    const body = await request.json();
    const { subject, html } = body;

    if (!subject || typeof subject !== "string") {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 }
      );
    }

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "html is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (!apiKey || !audienceId) {
      return NextResponse.json(
        { error: "RESEND_API_KEY and RESEND_AUDIENCE_ID must be configured" },
        { status: 503 }
      );
    }

    const fromAddress = process.env.NEWSLETTER_FROM || "Conductor <updates@conductormcp.dev>";

    // Fetch all contacts from the audience
    const contactsRes = await fetch(
      `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!contactsRes.ok) {
      const err = await contactsRes.json().catch(() => ({}));
      console.error("Failed to list contacts:", contactsRes.status, err);
      return NextResponse.json(
        { error: "Failed to fetch subscriber list" },
        { status: 502 }
      );
    }

    const contactsData = await contactsRes.json();
    const contacts: { email: string }[] = contactsData.data || [];

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No subscribers found" },
        { status: 404 }
      );
    }

    // Add unsubscribe footer to HTML
    const htmlWithFooter = `${html}
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
  <p>You're receiving this because you subscribed to Conductor updates.</p>
  <p><a href="https://conductormcp.dev" style="color: #7C3AED;">conductormcp.dev</a></p>
</div>`;

    // Send in batches of 100 (Resend batch limit)
    let sent = 0;
    let failed = 0;
    const batchSize = 100;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const emails = batch.map((c) => ({
        from: fromAddress,
        to: [c.email],
        subject,
        html: htmlWithFooter,
      }));

      const sendRes = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emails),
      });

      if (sendRes.ok) {
        sent += batch.length;
      } else {
        const err = await sendRes.json().catch(() => ({}));
        console.error("Batch send failed:", sendRes.status, err);
        failed += batch.length;
      }
    }

    lastSentAt = Date.now();

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: contacts.length,
    });
  } catch (e) {
    console.error("Newsletter send error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
