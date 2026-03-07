const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE = "https://api.safaricom.co.ke";

const BASE_URL = process.env.MPESA_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE;

export const PREMIUM_AMOUNT = Number(process.env.MPESA_PREMIUM_AMOUNT) || 2000;
export const PREMIUM_DAYS = Number(process.env.MPESA_PREMIUM_DAYS) || 30;

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials not configured");

  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function initiateSTKPush(phone: string, businessId: string, businessName: string) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error("M-Pesa shortcode, passkey, or callback URL not configured");
  }

  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const normalizedPhone = phone.replace(/^0/, "254").replace(/^\+/, "").replace(/\D/g, "");

  const token = await getAccessToken();

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: PREMIUM_AMOUNT,
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: businessId.slice(0, 12),
    TransactionDesc: `Premium - ${businessName.slice(0, 20)}`,
  };

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`STK push failed: ${err}`);
  }
  return res.json();
}
