import dotenv from "dotenv";

dotenv.config();

export const config = {
  payTo: process.env.PAYOUT_ADDRESS || "",
  facilitatorUrl: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
  signingKey: process.env.SIGNING_PRIVATE_KEY || "",
};

if (!config.payTo) {
  throw new Error("PAYOUT_ADDRESS environment variable is required");
}
if (!config.signingKey) {
  throw new Error("SIGNING_PRIVATE_KEY environment variable is required");
}
