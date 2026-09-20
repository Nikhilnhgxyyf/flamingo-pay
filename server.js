require("dotenv").config();
const express = require("express");
const path = require("path");
const { splitBillRupees } = require("./lib/split");
const { sendBillLinkSms } = require("./lib/sms");
const {
  getMerchant,
  findMerchantByWhatsapp,
  setActiveBill,
  getActiveBill,
  clearActiveBill,
} = require("./lib/firestore");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// --- 1. Meta calls this once to verify your webhook URL ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// --- 2. Meta POSTs here whenever a merchant messages the bot ---
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // ack immediately — Meta retries if you're slow

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];
    if (!message || message.type !== "text") return;

    const fromNumber = message.from; // merchant's WhatsApp number
    const text = message.text.body.trim();

    const merchant = await findMerchantByWhatsapp(fromNumber);
    if (!merchant) {
      console.log(`No registered merchant for WhatsApp number ${fromNumber}`);
      return;
    }

    // Accepts "4500" (just an amount) or "4500 9876543210" (amount + customer
    // number, for the direct-link handoff instead of the standee QR).
    const [amountStr, customerNumber] = text.split(/\s+/);
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      console.log(`Ignoring non-amount message from ${fromNumber}: "${text}"`);
      return;
    }

    const parts = splitBillRupees(amount);
    await setActiveBill(merchant.id, amount, parts);

    if (customerNumber) {
      const link = `${process.env.PUBLIC_BASE_URL}/pay/${merchant.id}`;
      const shopName = merchant.name || "the shop";
      const text = `Hi! Please pay your Rs.${amount} bill at ${shopName} here: ${link} - Flamingo Pay`;
      try {
        await sendBillLinkSms(customerNumber, text);
        console.log(`Sent pay link SMS to ${customerNumber}`);
      } catch (err) {
        console.error(`Failed to SMS ${customerNumber}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Webhook handling error:", err);
  }
});

// --- 3. The payment page polls this to see if a bill just went active ---
app.get("/api/bill/:merchantId", async (req, res) => {
  try {
    const [bill, merchant] = await Promise.all([
      getActiveBill(req.params.merchantId),
      getMerchant(req.params.merchantId),
    ]);
    res.json({
      active: !!bill,
      bill: bill || null,
      merchant: merchant ? { name: merchant.name, vpa: merchant.vpa } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not read bill" });
  }
});

// --- 4. Manual test trigger (protect or remove before real launch) ---
app.post("/api/test-bill/:merchantId", async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  const parts = splitBillRupees(amount);
  await setActiveBill(req.params.merchantId, amount, parts);
  res.json({ ok: true, amount, parts });
});

app.post("/api/clear-bill/:merchantId", async (req, res) => {
  await clearActiveBill(req.params.merchantId);
  res.json({ ok: true });
});

// --- 5. The page a merchant's printed QR actually points to ---
app.get("/pay/:merchantId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pay.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Flamingo Pay listening on :${PORT}`));

