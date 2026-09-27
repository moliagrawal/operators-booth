import { x402ResourceServer, HTTPFacilitatorClient, x402HTTPResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { config } from "./config";
import { privateKeyToAccount } from "viem/accounts";
import { createEIP712OfferReceiptIssuer, createOfferReceiptExtension, declareOfferReceiptExtension } from "@x402/extensions/offer-receipt";

export const PRICES = {
  PARSE_SINGLE: "0.001",
  PARSE_BULK: "0.05", // authorize up to 50 notices at $0.001 each
};

const account = privateKeyToAccount(config.signingKey as `0x${string}`);
const offerReceiptIssuer = createEIP712OfferReceiptIssuer(
  `did:pkh:eip155:84532:${account.address}`,
  (params) => account.signTypedData(params as any)
);

const coreServer = registerExactEvmScheme(
  new x402ResourceServer(new HTTPFacilitatorClient({ url: config.facilitatorUrl }))
);
coreServer.register("eip155:84532", new UptoEvmScheme());
coreServer.registerExtension(createOfferReceiptExtension(offerReceiptIssuer));

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
    extensions: {
      ...declareOfferReceiptExtension({ includeTxHash: false })
    }
  },
  "/parse/bulk": {
    accepts: [
      {
        scheme: "upto",
        network: "eip155:84532",
        payTo: config.payTo,
        price: PRICES.PARSE_BULK,
      },
    ],
    extensions: {
      ...declareOfferReceiptExtension({ includeTxHash: false })
    }
  },
});

