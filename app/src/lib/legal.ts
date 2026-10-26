// Public Legal & Support URLs
// Hosted via GitHub Pages from the `/legal` directory (isolating `/audit`).
// Override with EXPO_PUBLIC_LEGAL_BASE_URL when pointing a custom domain.

const BASE_URL = (
  process.env.EXPO_PUBLIC_LEGAL_BASE_URL ||
  "https://anurag9453.github.io/gyan-blitz"
).replace(/\/$/, "");

export const LEGAL_URLS = {
  home: `${BASE_URL}/`,
  privacy: `${BASE_URL}/privacy-policy.html`,
  terms: `${BASE_URL}/terms-of-service.html`,
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@gyanblitz.app",
};
