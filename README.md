# The Operator's Booth: Meera's Railway Delay API

Meera spends her days in the railway operator's booth manually typing out train delay notices. With x402, she can now monetize this vital real-time data stream directly, without needing a subscription service or middleman. This API parses her raw text notes into structured JSON, charging a fraction of a cent per request directly on the Base Sepolia testnet.

**NOTE: This repo uses testnet only (eip155:84532, Base Sepolia). It is not configured for mainnet use.**

## Prerequisites
- Node.js v20.12+
- A Base Sepolia testnet wallet with test ETH (for gas) and test USDC.
- [Base Sepolia ETH Faucet](https://faucet.base.org/)
- [Base Sepolia USDC Faucet](https://faucet.circle.com/)

## Setup
1. Clone the repository.
2. Run `npm install`.
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Fill in `.env` with your testnet details. **Never commit your `.env` file**.

## Running the Server
```bash
npm run dev
```

## Running the Buyer Script
In a separate terminal, while the server is running, you can run the buyer script to demonstrate a payment flow:
```bash
npm run buy
```
This script will:
- Hit the free `/health` route.
- Hit the paid `/parse` route with a well-formed notice and settle the payment.
- Hit the paid `/parse` route with a malformed notice, which will be rejected by the server with a 4xx status. **Because the server explicitly verifies the input before settling, no charge occurs for the failed request.**

## Tests
```bash
npm test
```

## Route Table

| Method | Path | Cost | Description |
|---|---|---|---|
| GET | `/health` | FREE | Health check. |
| POST | `/parse` | $0.001 | Parses a single raw text notice into JSON. |
| POST | `/parse/bulk` | $0.005 | Parses multiple raw text notices into JSON. |

## Verify-Then-Settle Design

To ensure fair payment execution, this application explicitly manages the x402 payment lifecycle rather than relying on auto-settling middleware. In `src/server.ts`, the handler first calls `x402Server.verify()` to validate the payment headers. Then, it attempts to parse the notice and validate it against a Zod schema. If any of the parsing or schema validation fails, the server responds immediately with a `400` or `422` status. Only when all validation succeeds does the server call `x402Context.settle()` to capture the payment, guaranteeing that the buyer is never charged for malformed input that fails to parse.
