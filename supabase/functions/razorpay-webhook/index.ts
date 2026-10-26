import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const webhookSecret =
      Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!webhookSecret) {
      console.error("Missing webhook secret");
      return new Response("Server configuration error", { status: 500 });
    }

    // Verify webhook signature (HMAC-SHA256 of raw body)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!timingSafeEqual(expectedSignature, signature)) {
      console.warn("Invalid webhook signature received");
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log(`Razorpay webhook event: ${event.event}`);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const notes = payment.notes || {};
      const userId = notes.user_id;

      if (userId && orderId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await serviceClient.rpc("_internal_credit_purchase", {
          p_user_id: userId,
          p_order_id: orderId,
          p_payment_id: paymentId,
          p_signature: signature,
        });

        if (error) {
          console.error("Failed to credit via webhook:", error);
          return new Response("Credit error", { status: 500 });
        }
        console.log("Successfully credited purchase via webhook:", data);
      }
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(err.message, { status: 500 });
  }
});
