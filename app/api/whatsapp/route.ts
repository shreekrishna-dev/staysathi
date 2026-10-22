import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getDemoReply(text: string): string {
  const input = text.toLowerCase().trim();
  const answers: string[] = [];

  if (/price|rate|cost|rent|charge|kitna|kitne|keemat|kimat/.test(input)) {
    answers.push(
      "Standard room: ₹1,500/night, maximum 2 guests.\n" +
      "Deluxe room: ₹2,200/night, maximum 3 guests."
    );
  }

  if (/location|address|where|kahan|kaha|kidhar|dehradun/.test(input)) {
    answers.push(
      "Demo location: Rajpur Road area, Dehradun. " +
      "Ye fictional property hai; iska real address ya map pin nahi hai."
    );
  }

  if (/parking|car|gaadi|gadi/.test(input)) {
    answers.push("Demo property mein parking available hai.");
  }

  if (/wi[\s-]?fi|internet/.test(input)) {
    answers.push("Demo property mein Wi-Fi included hai.");
  }

  if (/\bac\b|air.condition|aircon/.test(input)) {
    answers.push("Demo Standard aur Deluxe rooms mein AC hai.");
  }

  if (/hot water|geyser|garam pani|garam paani/.test(input)) {
    answers.push("Demo property mein hot water available hai.");
  }

  if (/breakfast|meal|food|nashta|khana/.test(input)) {
    answers.push(
      "Breakfast room price mein included nahi hai. " +
      "Demo breakfast price ₹200 per person hai. " +
      "Lunch/dinner ki information configured nahi hai."
    );
  }

  if (/check[\s-]?in|check[\s-]?out|timing/.test(input)) {
    answers.push("Check-in: 1:00 PM. Check-out: 11:00 AM.");
  }

  if (/pet|dog|cat|billi|kutta/.test(input)) {
    answers.push("Demo property mein pets allowed nahi hain.");
  }

  if (/amenit|facilit|suvidha/.test(input)) {
    answers.push(
      "Demo facilities: Wi-Fi, parking, AC aur hot water."
    );
  }

  if (/availab|vacan|mile|mileg|khali|khaali|today|tomorrow|aaj|kal/.test(input)) {
    answers.push(
      "Live room availability connected nahi hai. " +
      "Apni check-in/check-out dates aur guests ki sankhya batayein. " +
      "Availability owner confirmation ke baad hi confirm hogi."
    );
  }

  if (/book|payment|pay|upi|advance|reserve|cancel|refund/.test(input)) {
    answers.push(
      "Ye demo booking ya payment accept nahi karta. " +
      "Koi payment mat bhejein. Booking, cancellation aur refund " +
      "ke liye real property ki confirmed policies chahiye."
    );
  }

  if (answers.length > 0) {
    return (
      "StaySathi DEMO — fictional hotel information.\n\n" +
      answers.join("\n\n")
    );
  }

  if (/^(hi|hello|hey|namaste|namaskar|hii+)[!.\s]*$/.test(input)) {
    return (
      "Namaste! Main StaySathi ka automated DEMO assistant hoon. 😊\n\n" +
      "Aap room prices, location, parking, Wi-Fi, breakfast ya " +
      "check-in/check-out ke baare mein poochh sakte hain.\n\n" +
      "Ye fictional hotel demo hai, real booking service nahi."
    );
  }

  if (/thank|shukriya|dhanyavad|dhanyawaad/.test(input)) {
    return "Aapka swagat hai! 😊 — StaySathi demo assistant";
  }

  if (/room|stay|hotel|homestay|kamra|kamre/.test(input)) {
    return (
      "StaySathi DEMO: Standard room ₹1,500/night (2 guests) aur " +
      "Deluxe room ₹2,200/night (3 guests).\n\n" +
      "Apni check-in/check-out dates aur guests ki sankhya batayein. " +
      "Ye real availability ya booking confirmation nahi hai."
    );
  }

  return (
    "Aapka message mil gaya. Ye keyword-based StaySathi DEMO hai; " +
    "main abhi dates ya conversation ko automatically track nahi karta.\n\n" +
    "Aap poochh sakte hain: room price, location, parking, Wi-Fi, " +
    "breakfast ya check-in/check-out.\n\n" +
    "Availability aur booking confirm nahi hui hai."
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    verifyToken &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === verifyToken &&
    params.get("hub.challenge")
  ) {
    return new NextResponse(params.get("hub.challenge"), {
      status: 200,
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;

        for (const message of value?.messages ?? []) {
          const phone = message.from;
          if (!phone) continue;

          const contact = value.contacts?.find(
            (item: { wa_id?: string }) => item.wa_id === phone
          );

          const guestName =
            contact?.profile?.name || "WhatsApp Guest";

          const text =
            message.text?.body ||
            message.button?.text ||
            message.interactive?.button_reply?.title ||
            message.interactive?.list_reply?.title ||
            "";

          const { error } = await supabase
            .from("enquiries")
            .insert({
              guest_name: guestName,
              message: text || "Media message received",
              phone,
              status: "New",
            });

          if (error) {
            console.error("WhatsApp enquiry insert failed:", error);
          } else {
            console.log("WhatsApp enquiry insert successful");
          }

          const accessToken =
            process.env.WHATSAPP_ACCESS_TOKEN;
          const phoneNumberId =
            process.env.WHATSAPP_PHONE_NUMBER_ID;

          if (!accessToken || !phoneNumberId) {
            console.error(
              "WhatsApp reply credentials are missing"
            );
            continue;
          }

          const reply = text
            ? getDemoReply(text)
            : "StaySathi DEMO: Abhi main sirf text questions " +
              "handle karta hoon. Kripya apna sawaal type karein.";

          const response = await fetch(
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
                text: { body: reply },
              }),
            }
          );

          const result = await response.json();

          if (!response.ok) {
            console.error(
              "WhatsApp auto-reply failed:",
              result
            );
          } else {
            console.log(
              "WhatsApp auto-reply sent successfully"
            );
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json(
      { received: false },
      { status: 500 }
    );
  }
}