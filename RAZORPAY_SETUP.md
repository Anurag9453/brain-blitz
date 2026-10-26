# Razorpay Server-Authoritative Payments Setup

The payment system is now **fully server-authoritative** and protected against fake submissions and tampering.

---

## Architecture & Security Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player App
    participant EdgeOrder as Edge: create-razorpay-order
    participant RZP as Razorpay API
    participant EdgeVerify as Edge: verify-razorpay-payment
    participant DB as Postgres (service_role only)

    Player->>EdgeOrder: POST /create-razorpay-order { pack_id }
    EdgeOrder->>RZP: POST /v1/orders (Basic Auth with Secret)
    RZP-->>EdgeOrder: { order_id, amount, currency }
    EdgeOrder->>DB: INSERT purchases (status: created, order_id)
    EdgeOrder-->>Player: { order_id, key_id, amount }

    Player->>RZP: In-App Checkout (UPI / Cards / Netbanking)
    RZP-->>Player: { payment_id, order_id, signature }

    Player->>EdgeVerify: POST /verify-razorpay-payment { order_id, payment_id, signature, pack_id }
    Note over EdgeVerify: Compute HMAC-SHA256(order_id + "|" + payment_id, SECRET)<br/>Constant-time equality check
    alt Signature Valid
        EdgeVerify->>DB: RPC _internal_credit_purchase (service_role)
        Note over DB: Lock profiles row<br/>Replay check<br/>Increment coins
        DB-->>EdgeVerify: { success: true, coins_added, new_balance }
        EdgeVerify-->>Player: { success: true, new_balance }
    else Signature Invalid
        EdgeVerify-->>Player: 400 Bad Request (Blocked)
    end
```

---

## 1. Apply Database Migration

Run **`supabase/migrations/0024_secure_purchases.sql`** (or `0020` through `0024`) in your Supabase SQL Editor.
- Drops public/authenticated access to coin crediting.
- Defines `_internal_credit_purchase` with permissions granted **strictly to `service_role`**.

---

## 2. Set Server Secrets in Supabase

In your Supabase project (via Supabase CLI or **Project Settings → Edge Functions → Secrets**), add:

```bash
# Razorpay Credentials (from Razorpay Dashboard -> Settings -> API Keys)
supabase secrets set RAZORPAY_KEY_ID="rzp_test_..."
supabase secrets set RAZORPAY_KEY_SECRET="your_actual_key_secret..."

# Optional: if using Webhooks (Settings -> Webhooks in Razorpay)
supabase secrets set RAZORPAY_WEBHOOK_SECRET="your_webhook_secret..."
```

---

## 3. Deploy the Edge Functions

From your terminal, deploy the edge functions:

```bash
# 1. Order Creation
supabase functions deploy create-razorpay-order

# 2. Signature Verification & Crediting
supabase functions deploy verify-razorpay-payment

# 3. Optional: Webhook (Fallback for background capture)
supabase functions deploy razorpay-webhook --no-verify-jwt
```

---

## 4. Client Environment Variable

In `app/.env`:

```env
# Only the public Key ID is bundled in the mobile app
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

The `RAZORPAY_KEY_SECRET` never touches client code or client environment files.
