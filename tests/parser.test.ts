import { describe, it, expect } from "vitest";
import { parseNotice } from "../src/parser";
import request from "supertest";
import app from "../src/server";

describe("Notice Parser", () => {
  it("should successfully parse a well-formed notice", () => {
    const raw = "12345 PUNE now expected 14:40 due to signal failure";
    const result = parseNotice(raw);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.trainNumber).toBe("12345");
      expect(result.data.station).toBe("PUNE");
      expect(result.data.expectedTime).toBe("14:40");
      expect(result.data.reason).toBe("due to signal failure");
    }
  });

  it("should fail to parse a malformed notice (invalid time)", () => {
    const raw = "12345 PUNE now expected 99:99 due to signal failure";
    const result = parseNotice(raw);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("Could not find a valid expected time (HH:MM)");
    }
  });

  it("should fail to parse a malformed notice (missing train number)", () => {
    const raw = "ABCD PUNE 14:40";
    const result = parseNotice(raw);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("Invalid train number format");
    }
  });
});

import { vi, beforeAll } from "vitest";
import { x402Server } from "../src/payments";

describe("Integration Tests (POST /parse)", () => {
  beforeAll(async () => {
    await x402Server.initialize();
  });

  it("should return 402 if no payment header is provided", async () => {
    // x402 will require payment since verify() fails without it
    const res = await request(app)
      .post("/parse")
      .send({ notice: "12345 PUNE 14:40" });
    
    // The middleware/x402 SDK responds with 402 Payment Required
    expect(res.status).toBe(402);
  });

  it("should return 422 and NOT call settle if notice is malformed but payment is verified", async () => {
    const mockProcessHTTPRequest = vi.spyOn(x402Server, "processHTTPRequest").mockResolvedValue({
      type: "payment-verified",
      paymentPayload: {} as any,
      paymentRequirements: {} as any,
      cancellationDispatcher: {} as any,
    });
    const mockProcessSettlement = vi.spyOn(x402Server, "processSettlement").mockResolvedValue({
      success: true,
      headers: {},
      requirements: {} as any,
    } as any);

    const res = await request(app)
      .post("/parse")
      .set("Authorization", "Bearer fake")
      .send({ notice: "12345 PUNE 99:99" });

    expect(res.status).toBe(422);
    expect(mockProcessSettlement).not.toHaveBeenCalled();

    mockProcessHTTPRequest.mockRestore();
    mockProcessSettlement.mockRestore();
  });
});
