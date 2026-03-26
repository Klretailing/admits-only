import { NextRequest, NextResponse } from "next/server";

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY;
const BEEHIIV_PUB_ID =
  process.env.BEEHIIV_PUB_ID || "pub_ca9aad2c-57c8-49f0-9975-bae892918bdf";

const BEEHIIV_URL = `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`;

async function callBeehiiv(payload: Record<string, unknown>) {
  return fetch(BEEHIIV_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEEHIIV_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      grade,
      region,
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
        { error: "Newsletter service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Build custom fields array
    const custom_fields = [
      { name: "first_name", value: firstName },
      { name: "last_name", value: lastName },
      ...(grade ? [{ name: "grade", value: grade }] : []),
      ...(region ? [{ name: "subscriber_region", value: region }] : []),
      ...(district ? [{ name: "district", value: district }] : []),
      ...(interest ? [{ name: "interest", value: interest }] : []),
      ...(phone ? [{ name: "phone", value: phone }] : []),
      { name: "consent_contact", value: consentContact ? "yes" : "no" },
      { name: "consent_sms", value: consentSMS ? "yes" : "no" },
    ];

    const basePayload = {
      email,
      reactivate_existing: true,
      send_welcome_email: true,
      utm_source: "website_form",
      referring_site: body.source || "",
    };

    // Try with custom fields first
    let beehiivResponse = await callBeehiiv({
      ...basePayload,
      custom_fields,
    });

    // If custom fields caused a 4xx error, retry without them
    // (custom fields must be created in Beehiiv dashboard first)
    if (!beehiivResponse.ok && beehiivResponse.status >= 400 && beehiivResponse.status < 500) {
      const firstError = await beehiivResponse.json().catch(() => null);
      console.warn(
        "Beehiiv rejected custom fields, retrying without them:",
        beehiivResponse.status,
        firstError
      );
      beehiivResponse = await callBeehiiv(basePayload);
    }

    if (!beehiivResponse.ok) {
      const errorData = await beehiivResponse.json().catch(() => null);
      console.error("Beehiiv API error:", beehiivResponse.status, errorData);

      // Surface specific errors for debugging
      if (beehiivResponse.status === 401) {
        return NextResponse.json(
          { error: "Newsletter service authentication failed. Please contact support." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 502 }
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
