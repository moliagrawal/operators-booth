import dotenv from "dotenv";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { UptoEvmScheme } from "@x402/evm/upto/client";
import { extractReceiptFromResponse, extractReceiptPayload } from "@x402/extensions/offer-receipt";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const privateKeyHex = process.env.BUYER_PRIVATE_KEY;

if (!privateKeyHex) {
  throw new Error("BUYER_PRIVATE_KEY is not set in env");
}

const formattedKey = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;
const account = privateKeyToAccount(formattedKey as `0x${string}`);

const clientEvmSigner = toClientEvmSigner(account);
const client = new x402Client()
  .register("eip155:84532", new ExactEvmScheme(clientEvmSigner))
  .register("eip155:84532", new UptoEvmScheme(clientEvmSigner));
const paidFetch = wrapFetchWithPayment(fetch, client);

async function run() {
  console.log("--- Demonstrating FREE path ---");
  const healthRes = await fetch(`${API_BASE_URL}/health`);
  console.log(`GET /health: ${healthRes.status}`);
  console.log(await healthRes.json());
  console.log();

  console.log("--- Demonstrating PAID path (exact) ---");
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
    
    const receipt = extractReceiptFromResponse(parseRes);
    if (receipt) {
      console.log("Cryptographic Receipt Received:", extractReceiptPayload(receipt));
    }
    
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

    console.log();
    console.log("--- Demonstrating PAID path with BULK INPUT (upto scheme) ---");
    console.log("Sending 1 well-formed notice and 1 malformed notice...");
    const bulkRes = await paidFetch(`${API_BASE_URL}/parse/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notices: [notice, badNotice] }),
    });
    console.log(`POST /parse/bulk (valid/partial): ${bulkRes.status}`);
    const bulkData = await bulkRes.json();
    console.log("Response:", bulkData);
    
    const bulkReceipt = extractReceiptFromResponse(bulkRes);
    if (bulkReceipt) {
      console.log("Cryptographic Receipt Received for Bulk (Partial settlement!):", extractReceiptPayload(bulkReceipt));
    }

  } catch (error) {
    console.error("Error during paid fetch:", error);
  }
}

run();
