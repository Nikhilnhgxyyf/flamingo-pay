// Splits a total bill into UPI-friendly chunks, each capped so no single
// tap crosses the threshold that triggers wallet/card interchange fees.
// Default cap is ₹1999 — adjust to whatever threshold you're avoiding.
function splitBill(totalPaise, capPaise = 199900) {
  if (!Number.isInteger(totalPaise) || totalPaise <= 0) {
    throw new Error("Amount must be a positive integer (in paise)");
  }

  const parts = [];
  let remaining = totalPaise;

  while (remaining > 0) {
    const chunk = Math.min(remaining, capPaise);
    parts.push(chunk);
    remaining -= chunk;
  }

  return parts;
}

// Convenience: rupees in, rupees out (for logging / display)
function splitBillRupees(totalRupees, capRupees = 1999) {
  return splitBill(Math.round(totalRupees * 100), Math.round(capRupees * 100))
    .map((p) => p / 100);
}

module.exports = { splitBill, splitBillRupees };
