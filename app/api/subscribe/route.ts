import { NextRequest, NextResponse } from "next/server";

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUB_ID =
  process.env.BEEHIIV_PUB_ID || "pub_ca9aad2c-57c8-49f0-9975-bae892918bdf";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      grade,
      district,
      interest,
      consentNewsletter,
      consentContact,
      consentSMS,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    if (!consentNewsletter) {
      return NextResponse.json(
        { error: "Newsletter consent is required." },
        { status: 400 }
      );
    }

    if (!BEEHIIV_API_KEY) {
      console.error("BEEHIIV_API_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Newsletter service is not configured." },
        { status: 500 }
      );
    }

    // Build custom fields array
    const custom_fields = [
      { name: "first_name", value: firstName },
      { name: "last_name", value: lastName },
      ...(grade ? [{ name: "grade", value: grade }] : []),
      ...(district ? [{ name: "district", value: district }] : []),
      ...(interest ? [{ name: "interest", value: interest }] : []),
      ...(phone ? [{ name: "phone", value: phone }] : []),
      { name: "consent_contact", value: consentContact ? "yes" : "no" },
      { name: "consent_sms", value: consentSMS ? "yes" : "no" },
    ];

    const beehiivResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: "website_form",
          referring_site: body.source || "",
          custom_fields,
        }),
      }
    );

    if (!beehiivResponse.ok) {
      const errorData = await beehiivResponse.json().catch(() => null);
      console.error("Beehiiv API error:", beehiivResponse.status, errorData);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: beehiivResponse.status }
      );
    }

    const data = await beehiivResponse.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
