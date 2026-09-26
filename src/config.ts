import dotenv from "dotenv";

dotenv.config();

export const config = {
  payTo: process.env.PAYOUT_ADDRESS || "",
  facilitatorUrl: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
};

if (!config.payTo) {
  throw new Error("PAYOUT_ADDRESS environment variable is required");
}
