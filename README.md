# Flamingo Pay — build notes

Everything here runs on free tiers: Render (free web service), Firebase
Firestore (free Spark plan), and Meta's WhatsApp Cloud API (free message
quota). You can do every step below from a phone browser — GitHub, Render,
Firebase, and Meta for Developers all work fine on mobile.

## How it works

1. Merchant's counter has one printed QR pointing to `/pay/{merchantId}`.
2. Merchant texts an amount to your WhatsApp bot number (e.g. `4500`).
3. The webhook writes the active bill to Firestore and splits it into
   ≤₹1,999 chunks (`lib/split.js` — change the cap if you're avoiding a
   different fee threshold).
4. The customer's already-open payment page polls every 2.5s, sees the new
   bill, and shows tap-to-pay buttons using UPI deep links
   (`upi://pay?...`) — no scanning, no app install.

## 1. Firebase (free) — the database

1. console.firebase.google.com → **Add project** (Spark/free plan).
2. Build → Firestore Database → **Create database** (production mode is fine).
3. Project settings → Service accounts → **Generate new private key**.
   Open the downloaded JSON and copy three values into your Render
   environment variables: `project_id`, `client_email`, `private_key`.
4. Add your first merchant by hand for testing — Firestore console →
   `merchants` collection → new document, with fields:
   - `name`: "Test Shop"
   - `vpa`: their UPI ID, e.g. `shop@okicici`
   - `whatsappNumber`: the merchant's WhatsApp number, digits only with
     country code (e.g. `919876543210`)

## 2. Meta WhatsApp Cloud API (free tier) — the bot

1. developers.facebook.com → create an app → add the **WhatsApp** product.
2. You get a free test number immediately. Note the temporary access token
   and phone number ID.
3. Under Configuration, set the webhook callback URL to
   `https://<your-render-url>/webhook` and the verify token to whatever you
   put in `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to the `messages` field.
5. Idea 2 (texting the customer's number directly) is built using SMS, not
   WhatsApp — see step 3 below for why.

## 3. Fast2SMS (free tier) — the direct-to-customer handoff (Idea 2)

WhatsApp was ruled out for this leg: Meta only lets a business message a
customer for free within the 24-hour window opened by that customer's own
message — since the customer has never messaged your bot, a free-form
WhatsApp text would just fail, and the template-message alternative
requires Meta approval and (since mid-2025) a per-message fee outside that
window. SMS has no such window.

1. Sign up free at fast2sms.com → dashboard → API key (top right).
2. Set `FAST2SMS_API_KEY` in your environment.
3. The included "q" (Quick) route works immediately for testing, no
   registration needed. **Before real launch**, note that Indian law
   (TRAI's DLT rules) requires any business sending commercial/transactional
   SMS to register a sender ID and message template on the DLT platform —
   Fast2SMS's dashboard has a guided flow for this. Unregistered production
   SMS traffic gets filtered by telecom carriers, so budget a day or two
   for that approval before you rely on this for real customers.

## 4. Render (free) — hosting

You already have this working per your last deploy. For this version:
- Build command: `pnpm install`
- Start command: `pnpm start` (or `node server.js`)
- Add every variable from `.env.example` under Environment.

## 5. Test it end-to-end

- From your own phone, WhatsApp `4500` to the bot number.
- Open `https://<your-render-url>/pay/{merchantId}` on a second phone (or
  the same one in another tab) — the buttons should appear within ~2.5s.
- Tapping a button should open your UPI app with the amount pre-filled.
- You can also trigger a test bill without WhatsApp:
  `POST /api/test-bill/{merchantId}` with JSON body `{"amount": 4500}`.

## What's intentionally left simple for now

- No payment confirmation webhook yet — you don't get told when a part is
  actually paid, only that the buttons were shown. Adding that means
  integrating a UPI PSP (like Cashfree or Razorpay) that can confirm
  collect requests, which usually isn't free.
- Merchant onboarding is manual (add a Firestore doc) rather than a signup
  flow — fine for a pilot, worth building a form once you have a few
  merchants.
- The Idea 2 SMS uses Fast2SMS's unregistered "Quick" route — fine for
  testing, but swap to a DLT-registered route (see step 3) before sending
  to real customers.
  
