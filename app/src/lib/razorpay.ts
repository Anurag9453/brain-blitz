// Razorpay Configuration & Helpers
// Razorpay Standard Checkout opens in a modal webview with UPI, Cards, Netbanking & Wallets.

export interface CoinPack {
  id: "pack_500" | "pack_1200" | "pack_3000" | "pack_7000";
  coins: number;
  priceInr: number;
  label: string;
}

export const COIN_PACKS: CoinPack[] = [
  { id: "pack_500", coins: 500, priceInr: 89, label: "500 Coins" },
  { id: "pack_1200", coins: 1200, priceInr: 179, label: "1,200 Coins" },
  { id: "pack_3000", coins: 3000, priceInr: 449, label: "3,000 Coins" },
  { id: "pack_7000", coins: 7000, priceInr: 899, label: "7,000 Coins" },
];

export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder";

/**
 * Builds the HTML content for Razorpay Standard Checkout inside WebView.
 */
export function getRazorpayCheckoutHtml(params: {
  keyId: string;
  amountInr: number;
  packName: string;
  orderId?: string | null;
  username: string;
}): string {
  const amountPaise = params.amountInr * 100;
  const safeName = params.username.replace(/["\\]/g, "");
  const orderProp = params.orderId ? `order_id: "${params.orderId}",` : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
      body {
        margin: 0;
        background-color: #17112e;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f1ecff;
      }
      .loader {
        text-align: center;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #3a2f66;
        border-top-color: #ffc53d;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 16px;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="loader">
      <div class="spinner"></div>
      <p style="font-weight: 600;">Opening secure checkout...</p>
    </div>
    <script>
      function notify(data) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      var options = {
        key: "${params.keyId}",
        amount: ${amountPaise},
        currency: "INR",
        name: "GyanBlitz",
        description: "${params.packName}",
        image: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        ${orderProp}
        prefill: {
          name: "${safeName}"
        },
        theme: {
          color: "#221A40"
        },
        modal: {
          ondismiss: function() {
            notify({ event: "dismissed" });
          }
        },
        handler: function(response) {
          notify({
            event: "success",
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id || null,
            signature: response.razorpay_signature || null
          });
        }
      };

      try {
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function(resp) {
          notify({
            event: "failed",
            reason: resp.error ? resp.error.description : "Payment failed"
          });
        });
        rzp.open();
      } catch (err) {
        notify({ event: "error", message: err.message });
      }
    </script>
  </body>
</html>`;
}
