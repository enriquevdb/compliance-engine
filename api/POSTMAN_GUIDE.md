# Postman Testing Guide

## Quick Start

1. Start the API server:
   ```bash
   npm run dev:api
   ```

2. The server will start on `http://localhost:3000`

## Endpoints

### 1. Health Check

**Request:**
- Method: `GET`
- URL: `http://localhost:3000/health`

**Expected Response:**
```json
{
  "status": "ok",
  "service": "compliance-engine-api",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Calculate Compliance Fees

**Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/compliance/calculate`
- Headers:
  - `Content-Type: application/json`

**Request Body Examples:**

#### Valid CA Transaction (SOFTWARE)
```json
{
  "transactionId": "txn_123",
  "merchantId": "merchant_456",
  "customerId": "customer_789",
  "destination": {
    "country": "US",
    "state": "CA",
    "city": "Los Angeles"
  },
  "items": [
    {
      "id": "item_1",
      "category": "SOFTWARE",
      "amount": 100.00
    }
  ],
  "totalAmount": 100.00,
  "currency": "USD"
}
```

**Expected Response:**
- Status: `200 OK`
- Body: ComplianceResponse with `status: "CALCULATED"`
- Total fees: `9.50` (6% state + 0.25% county + 2.25% city + 1% category modifier)

#### Exempt Customer (WHOLESALE)
```json
{
  "transactionId": "txn_wholesale",
  "merchantId": "merchant_456",
  "customerId": "customer_wholesale",
  "destination": {
    "country": "US",
    "state": "CA",
    "city": "Los Angeles"
  },
  "items": [
    {
      "id": "item_1",
      "category": "SOFTWARE",
      "amount": 100.00
    }
  ],
  "totalAmount": 100.00,
  "currency": "USD",
  "context": {
    "customerType": "WHOLESALE"
  }
}
```

**Expected Response:**
- Status: `200 OK`
- Body: ComplianceResponse with `status: "CALCULATED"`
- Total fees: `0` (fully exempt)

#### Exempt Item (FOOD in CA)
```json
{
  "transactionId": "txn_food",
  "merchantId": "merchant_456",
  "customerId": "customer_789",
  "destination": {
    "country": "US",
    "state": "CA",
    "city": "Los Angeles"
  },
  "items": [
    {
      "id": "item_1",
      "category": "FOOD",
      "amount": 50.00
    }
  ],
  "totalAmount": 50.00,
  "currency": "USD"
}
```

**Expected Response:**
- Status: `200 OK`
- Body: ComplianceResponse with `status: "CALCULATED"`
- Total fees: `0` (FOOD exempt in CA)

#### Invalid Currency
```json
{
  "transactionId": "txn_invalid",
  "merchantId": "merchant_456",
  "customerId": "customer_789",
  "destination": {
    "country": "US",
    "state": "CA",
    "city": "Los Angeles"
  },
  "items": [
    {
      "id": "item_1",
      "category": "SOFTWARE",
      "amount": 100.00
    }
  ],
  "totalAmount": 100.00,
  "currency": "EUR"
}
```

**Expected Response:**
- Status: `200 OK` (library handles validation, returns REJECTED status)
- Body: ComplianceResponse with `status: "REJECTED"`
- Gates: Empty array (InputValidationGate is internal-only)

#### Unsupported Address
```json
{
  "transactionId": "txn_unsupported",
  "merchantId": "merchant_456",
  "customerId": "customer_789",
  "destination": {
    "country": "US",
    "state": "FL",
    "city": "Miami"
  },
  "items": [
    {
      "id": "item_1",
      "category": "SOFTWARE",
      "amount": 100.00
    }
  ],
  "totalAmount": 100.00,
  "currency": "USD"
}
```

**Expected Response:**
- Status: `200 OK`
- Body: ComplianceResponse with `status: "REJECTED"`
- Gates: ADDRESS_VALIDATION gate failed

#### Merchant Below Threshold
```json
{
  "transactionId": "txn_low_merchant",
  "merchantId": "merchant_789",
  "customerId": "customer_789",
  "destination": {
    "country": "US",
    "state": "NY",
    "city": "New York City"
  },
  "items": [
    {
      "id": "item_1",
      "category": "SOFTWARE",
      "amount": 100.00
    }
  ],
  "totalAmount": 100.00,
  "currency": "USD"
}
```

**Expected Response:**
- Status: `200 OK`
- Body: ComplianceResponse with `status: "REJECTED"`
- Gates: APPLICABILITY gate failed (merchant_789 has only $50K, below $100K threshold)

## Postman Collection Setup

1. Create a new collection: "Compliance Engine API"
2. Add environment variable: `baseUrl` = `http://localhost:3000`
3. Add requests:
   - Health Check (GET `{{baseUrl}}/health`)
   - Valid CA Transaction (POST `{{baseUrl}}/api/compliance/calculate`)
   - Exempt Customer (POST `{{baseUrl}}/api/compliance/calculate`)
   - Exempt Item (POST `{{baseUrl}}/api/compliance/calculate`)
   - Invalid Currency (POST `{{baseUrl}}/api/compliance/calculate`)
   - Unsupported Address (POST `{{baseUrl}}/api/compliance/calculate`)
   - Merchant Below Threshold (POST `{{baseUrl}}/api/compliance/calculate`)

## Response Structure

All responses follow the Appendix A format:

```json
{
  "transactionId": "string",
  "status": "CALCULATED" | "REJECTED" | "FAILED",
  "gates": [
    {
      "name": "ADDRESS_VALIDATION" | "APPLICABILITY" | "EXEMPTION_CHECK",
      "passed": boolean,
      "message": "string",
      "appliedExemptions": ["string"] // Only for EXEMPTION_CHECK
    }
  ],
  "calculation": {
    "items": [
      {
        "itemId": "string",
        "amount": number,
        "category": "string",
        "fees": {
          "stateRate": { "jurisdiction": "string", "rate": number, "amount": number },
          "countyRate": { "jurisdiction": "string", "rate": number, "amount": number },
          "cityRate": { "jurisdiction": "string", "rate": number, "amount": number },
          "categoryModifier": { "category": "string", "rate": number, "amount": number }
        },
        "totalFee": number
      }
    ],
    "totalFees": number,
    "effectiveRate": number
  },
  "auditTrail": ["string"]
}
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Set `PORT` environment variable to use a different port
- Ensure all dependencies are installed: `npm install`

### 404 Not Found
- Verify the endpoint URL is correct
- Check that the server is running
- Ensure the route path matches exactly: `/api/compliance/calculate`

### 400 Bad Request
- Check request body format matches Appendix B
- Verify `Content-Type: application/json` header is set
- Ensure all required fields are present

### 500 Internal Server Error
- Check server console for error details
- Verify transaction structure matches expected format
- Check that library code is properly compiled

