const admin = require("firebase-admin");

// Reads service account creds from env vars (set these on Render — never
// commit a key file to the repo). See .env.example.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Render stores multi-line env vars with literal "\n" — convert back.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// merchants/{merchantId}          -> { name, vpa, whatsappNumber }
// merchants/{merchantId}/bill/current -> { amount, parts, createdAt }

async function getMerchant(merchantId) {
  const doc = await db.collection("merchants").doc(merchantId).get();
  return doc.exists ? doc.data() : null;
}

async function findMerchantByWhatsapp(whatsappNumber) {
  const snap = await db
    .collection("merchants")
    .where("whatsappNumber", "==", whatsappNumber)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function setActiveBill(merchantId, amountRupees, parts) {
  await db
    .collection("merchants")
    .doc(merchantId)
    .collection("bill")
    .doc("current")
    .set({
      amount: amountRupees,
      parts,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function getActiveBill(merchantId) {
  const doc = await db
    .collection("merchants")
    .doc(merchantId)
    .collection("bill")
    .doc("current")
    .get();
  return doc.exists ? doc.data() : null;
}

async function clearActiveBill(merchantId) {
  await db
    .collection("merchants")
    .doc(merchantId)
    .collection("bill")
    .doc("current")
    .delete();
}

module.exports = {
  getMerchant,
  findMerchantByWhatsapp,
  setActiveBill,
  getActiveBill,
  clearActiveBill,
};

