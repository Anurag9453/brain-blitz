import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const PACK_PRICES: Record<string, { paise: number; coins: number }> = {
  pack_500: { paise: 8900, coins: 500 },
  pack_1200: { paise: 17900, coins: 1200 },
  pack_3000: { paise: 44900, coins: 3000 },
  pack_7000: { paise: 89900, coins: 7000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Razorpay credentials not configured on server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user with Supabase
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pack_id } = await req.json();
    const pack = PACK_PRICES[pack_id];
    if (!pack) {
      return new Response(JSON.stringify({ error: "Invalid pack_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Razorpay API to create official order
    const authStr = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const receipt = `mb_${user.id.substring(0, 8)}_${Date.now()}`;

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authStr}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: pack.paise,
        currency: "INR",
        receipt,
        notes: {
          user_id: user.id,
          pack_id,
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      console.error("Razorpay order creation failed:", errBody);
      return new Response(JSON.stringify({ error: "Failed to create Razorpay order", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderData = await rzpRes.json();

    // Record pending order in DB using service client
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    await serviceClient.from("purchases").insert({
      user_id: user.id,
      pack_id,
      amount_inr: Math.round(pack.paise / 100),
      coins: pack.coins,
      order_id: orderData.id,
      status: "created",
    });

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        key_id: razorpayKeyId,
        pack_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Internal error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
