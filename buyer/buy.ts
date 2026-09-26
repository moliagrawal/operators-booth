import dotenv from "dotenv";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const privateKeyHex = process.env.BUYER_PRIVATE_KEY;

if (!privateKeyHex) {
  throw new Error("BUYER_PRIVATE_KEY is not set in env");
}

// Add 0x prefix if missing
const formattedKey = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;
// Cast to the specific literal type expected by viem
const account = privateKeyToAccount(formattedKey as `0x${string}`);

// Create an x402-aware fetch client
const clientEvmSigner = toClientEvmSigner(account);
const client = new x402Client().register(
  "eip155:84532",
  new ExactEvmScheme(clientEvmSigner)
);
const paidFetch = wrapFetchWithPayment(fetch, client);

async function run() {
  console.log("--- Demonstrating FREE path ---");
  const healthRes = await fetch(`${API_BASE_URL}/health`);
  console.log(`GET /health: ${healthRes.status}`);
  console.log(await healthRes.json());
  console.log();

  console.log("--- Demonstrating PAID path ---");
  const samplePath = path.join(__dirname, "../samples/well-formed/1.txt");
  const notice = fs.readFileSync(samplePath, "utf-8");
  
  console.log(`Sending notice: "${notice.trim()}"`);
  
  try {
    const parseRes = await paidFetch(`${API_BASE_URL}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notice }),
    });
    
    console.log(`POST /parse (valid): ${parseRes.status}`);
    const data = await parseRes.json();
    console.log("Response:", data);
    
    // Attempt a malformed notice
    console.log();
    console.log("--- Demonstrating PAID path with BAD INPUT ---");
    const badSamplePath = path.join(__dirname, "../samples/broken/1.txt");
    const badNotice = fs.readFileSync(badSamplePath, "utf-8");
    console.log(`Sending notice: "${badNotice.trim()}"`);
    
    const badRes = await paidFetch(`${API_BASE_URL}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notice: badNotice }),
    });
    
    console.log(`POST /parse (invalid): ${badRes.status}`);
    const badData = await badRes.json();
    console.log("Response:", badData);
    console.log("NOTE: Because the server verified then settled, and this request failed validation, NO settlement occurred for this failure.");

    // Attempt a bulk parse
    console.log();
    console.log("--- Demonstrating PAID path with BULK INPUT ---");
    console.log("Sending 2 well-formed notices...");
    const bulkRes = await paidFetch(`${API_BASE_URL}/parse/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notices: [notice, notice] }),
    });
    console.log(`POST /parse/bulk (valid): ${bulkRes.status}`);
    const bulkData = await bulkRes.json();
    console.log("Response:", bulkData);

  } catch (error) {
    console.error("Error during paid fetch:", error);
  }
}

run();
