import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "staysathi_secret_123";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (message) {
      const guestName =
        value?.contacts?.[0]?.profile?.name || "WhatsApp Guest";
      const phone = message?.from || "";
      const text =
        message?.text?.body ||
        message?.button?.text ||
        "Media message received";

            const { error } = await supabase.from("enquiries").insert({
        guest_name: guestName,
        message: text,
        phone: phone,
        status: "New",
      });

      if (error) {
        console.error("WhatsApp enquiry insert failed:", error);
      } else {
        console.log("WhatsApp enquiry insert successful");
      }
            const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!accessToken || !phoneNumberId) {
        console.error("WhatsApp reply credentials are missing");
      } else {
        const replyResponse = await fetch(
          `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: {
                body:
                  "Namaste! StaySathi ka automated assistant yahan hai. 😊 " +
                  "Aap kis location mein room dhoondh rahe hain? " +
                  "Apni check-in/check-out dates aur guests ki sankhya batayein. " +
                  "Room availability aur final price confirmation ke baad bataya jayega.",
              },
            }),
          }
        );

        const replyResult = await replyResponse.json();

        if (!replyResponse.ok) {
          console.error("WhatsApp auto-reply failed:", replyResult);
        } else {
          console.log("WhatsApp auto-reply sent successfully");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ received: true });
  }
}