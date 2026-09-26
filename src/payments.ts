import { x402ResourceServer, HTTPFacilitatorClient, x402HTTPResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { config } from "./config";

export const PRICES = {
  PARSE_SINGLE: "0.001",
  PARSE_BULK: "0.005",
};

const coreServer = registerExactEvmScheme(
  new x402ResourceServer(new HTTPFacilitatorClient({ url: config.facilitatorUrl }))
);

export const x402Server = new x402HTTPResourceServer(coreServer, {
  "/parse": {
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        payTo: config.payTo,
        price: PRICES.PARSE_SINGLE,
      },
    ],
  },
  "/parse/bulk": {
    accepts: [
      {
        scheme: "exact",
        network: "eip155:84532",
        payTo: config.payTo,
        price: PRICES.PARSE_BULK,
      },
    ],
  },
});
