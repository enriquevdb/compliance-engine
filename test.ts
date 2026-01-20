import { ComplianceEngine } from "./src/ComplianceEngine";

const engine = new ComplianceEngine();

const transaction = {
  transactionId: "txn_123",
  merchantId: "merchant_456",
  customerId: "customer_789",
  destination: {
    country: "US",
    state: "CA",
    city: "Los Angeles",
  },
  items: [
    {
      id: "item_1",
      category: "SOFTWARE",
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: "USD",
};

(async () => {
  const response = await engine.process(transaction);
  console.log(JSON.stringify(response, null, 2));
})();
