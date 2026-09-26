import express from "express";
import { parseNotice } from "./parser";
import { parsedNoticeSchema } from "./schema";
import { x402Server } from "./payments";
import { ExpressAdapter } from "@x402/express";

const app = express();

// Global body size cap
app.use(express.json({ limit: "10kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// We use manual verification and settlement to ensure verify-then-settle ordering.
// We only call settle() if the parse succeeds and schema validation passes.
app.post("/parse", async (req, res) => {
  try {
    const adapter = new ExpressAdapter(req);
    const requestContext = {
      adapter,
      path: req.path,
      method: req.method,
      paymentHeader: req.header("authorization")
    };
    
    const processResult = await x402Server.processHTTPRequest(requestContext);

    if (processResult.type === "payment-error") {
      const { status, headers, body } = processResult.response;
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
      res.status(status).send(body);
      return;
    }

    if (processResult.type === "no-payment-required") {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Payment should be required" });
      return;
    }

    const { notice } = req.body;
    if (typeof notice !== "string") {
      res.status(400).json({ error: "BAD_REQUEST", message: "notice must be a string" });
      return;
    }

    if (notice.length > 2000) {
      res.status(400).json({ error: "BAD_REQUEST", message: "notice length exceeds 2000 characters" });
      return;
    }

    const parseResult = parseNotice(notice);
    if (!parseResult.ok) {
      res.status(422).json({ error: "PARSE_FAILED", message: parseResult.reason });
      return;
    }

    const schemaResult = parsedNoticeSchema.safeParse(parseResult.data);
    if (!schemaResult.success) {
      res.status(422).json({ error: "PARSE_FAILED", message: "Schema validation failed" });
      return;
    }

    // Only settle upon successful parse and validation
    await x402Server.processSettlement(
      processResult.paymentPayload,
      processResult.paymentRequirements,
      processResult.declaredExtensions,
      { request: requestContext },
      undefined,
      processResult.beforeHandlerSettlement
    );

    res.status(200).json(schemaResult.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" });
  }
});

app.post("/parse/bulk", async (req, res) => {
  try {
    const adapter = new ExpressAdapter(req);
    const requestContext = {
      adapter,
      path: req.path,
      method: req.method,
      paymentHeader: req.header("authorization")
    };
    
    const processResult = await x402Server.processHTTPRequest(requestContext);

    if (processResult.type === "payment-error") {
      const { status, headers, body } = processResult.response;
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
      res.status(status).send(body);
      return;
    }

    if (processResult.type === "no-payment-required") {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Payment should be required" });
      return;
    }

    const { notices } = req.body;
    if (!Array.isArray(notices)) {
      res.status(400).json({ error: "BAD_REQUEST", message: "notices must be an array" });
      return;
    }

    if (notices.length > 50) {
      res.status(400).json({ error: "BAD_REQUEST", message: "too many notices (max 50)" });
      return;
    }

    const results = [];
    for (const notice of notices) {
      if (typeof notice !== "string" || notice.length > 2000) {
        res.status(400).json({ error: "BAD_REQUEST", message: "each notice must be a string <= 2000 chars" });
        return;
      }
      const parseResult = parseNotice(notice);
      if (!parseResult.ok) {
        res.status(422).json({ error: "PARSE_FAILED", message: parseResult.reason });
        return;
      }
      const schemaResult = parsedNoticeSchema.safeParse(parseResult.data);
      if (!schemaResult.success) {
        res.status(422).json({ error: "PARSE_FAILED", message: "Schema validation failed" });
        return;
      }
      results.push(schemaResult.data);
    }

    await x402Server.processSettlement(
      processResult.paymentPayload,
      processResult.paymentRequirements,
      processResult.declaredExtensions,
      { request: requestContext },
      undefined,
      processResult.beforeHandlerSettlement
    );
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  x402Server.initialize().then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to initialize x402Server", err);
    process.exit(1);
  });
}

export default app;
