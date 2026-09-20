// Sends the pay-link SMS directly to a customer's phone (Idea 2's "zero
// scanning" handoff). Uses Fast2SMS's "q" (Quick) route, which works
// without DLT registration — fine for testing, but per TRAI rules, sending
// commercial/transactional SMS to Indian numbers in real production
// requires your sender ID and message template to be registered on the
// DLT platform (Fast2SMS's dashboard walks you through this). Swap the
// route to "dlt" with your registered sender_id + template_id once done.

async function sendBillLinkSms(toNumber, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    throw new Error("FAST2SMS_API_KEY not set");
  }

  const digits = toNumber.replace(/\D/g, "").slice(-10); // Fast2SMS wants bare 10-digit numbers
  if (digits.length !== 10) {
    throw new Error(`"${toNumber}" doesn't look like a 10-digit Indian mobile number`);
  }

  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message,
      language: "english",
      flash: 0,
      numbers: digits,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.return !== true) {
    throw new Error(`SMS send failed: ${JSON.stringify(data)}`);
  }
  return data;
}

module.exports = { sendBillLinkSms };
