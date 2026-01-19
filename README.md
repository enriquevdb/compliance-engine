# Compliance Engine

A rule-based compliance engine for real-time fee calculations in e-commerce transactions. The system processes transactions through a sequential gate pipeline to determine fee applicability and calculate compliance fees with detailed audit trails.

## Features

- **Gate-Based Pipeline:** Sequential validation gates with short-circuit on failure
- **Fee Calculation:** Multi-layer rate application (state, county, city, category modifiers)
- **Exemption Handling:** Customer-level and item-level exemption support
- **Precision Handling:** Consistent rounding for 47+ line items (sum of item fees = total)
- **Resilience:** Timeout + fallback pattern for external service failures
- **Observability:** Detailed audit trail and structured logging
- **Type Safety:** Full TypeScript implementation with strict type checking

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (for PostgreSQL database)

## Installation

```bash
npm install
```

## Database Setup

The compliance engine uses PostgreSQL for storing configuration data, transactions, and audit trails. The database runs in a Docker container.

### Starting the Database

```bash
# Start PostgreSQL container
npm run db:up

# View database logs
npm run db:logs

# Stop database container
npm run db:down
```

### Running Migrations

After starting the database, run the migration scripts to create the schema and seed initial data:

**PowerShell (Windows):**
```powershell
Get-Content database/migrations/001_initial_schema.sql | docker exec -i compliance-engine-postgres psql -U compliance_user -d compliance_engine
Get-Content database/migrations/002_seed_data.sql | docker exec -i compliance-engine-postgres psql -U compliance_user -d compliance_engine
```

**Bash/Linux/Mac:**
```bash
docker exec -i compliance-engine-postgres psql -U compliance_user -d compliance_engine < database/migrations/001_initial_schema.sql
docker exec -i compliance-engine-postgres psql -U compliance_user -d compliance_engine < database/migrations/002_seed_data.sql
```

**Using psql directly (if installed):**
```bash
psql -h localhost -U compliance_user -d compliance_engine -f database/migrations/001_initial_schema.sql
psql -h localhost -U compliance_user -d compliance_engine -f database/migrations/002_seed_data.sql
```

### Database Configuration

The database connection is configured via environment variables. Copy `.env.example` to `.env` and adjust as needed:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compliance_engine
DB_USER=compliance_user
DB_PASSWORD=compliance_pass
```

**Note:** The compliance engine will automatically connect to the database if available. If the database is not available, it will fall back to hardcoded configuration in `src/config/rules.ts`. This ensures backward compatibility and graceful degradation.

## Usage

### Basic Example

```typescript
import { ComplianceEngine } from './src';

const engine = new ComplianceEngine();

const transaction = {
  transactionId: 'txn_123',
  merchantId: 'merchant_456',
  customerId: 'customer_789',
  destination: {
    country: 'US',
    state: 'CA',
    city: 'Los Angeles',
  },
  items: [
    {
      id: 'item_1',
      category: 'SOFTWARE',
      amount: 100.0,
    },
  ],
  totalAmount: 100.0,
  currency: 'USD',
};

const response = await engine.process(transaction);
console.log(JSON.stringify(response, null, 2));
```

### Example Input (Appendix B)

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
    },
    {
      "id": "item_2",
      "category": "PHYSICAL_GOODS",
      "amount": 50.00
    }
  ],
  "totalAmount": 150.00,
  "currency": "USD"
}
```

### Example Output (Appendix A)

```json
{
  "transactionId": "txn_123",
  "status": "CALCULATED",
  "gates": [
    {
      "name": "ADDRESS_VALIDATION",
      "passed": true,
      "message": "Valid US address"
    },
    {
      "name": "APPLICABILITY",
      "passed": true,
      "message": "Merchant above $100K threshold in CA"
    },
    {
      "name": "EXEMPTION_CHECK",
      "passed": true,
      "appliedExemptions": []
    }
  ],
  "calculation": {
    "items": [
      {
        "itemId": "item_1",
        "amount": 100.00,
        "category": "SOFTWARE",
        "fees": {
          "stateRate": {
            "jurisdiction": "CA",
            "rate": 0.06,
            "amount": 6.00
          },
          "countyRate": {
            "jurisdiction": "Los Angeles County",
            "rate": 0.0025,
            "amount": 0.25
          },
          "cityRate": {
            "jurisdiction": "Los Angeles",
            "rate": 0.0225,
            "amount": 2.25
          },
          "categoryModifier": {
            "category": "SOFTWARE",
            "rate": 0.01,
            "amount": 1.00
          }
        },
        "totalFee": 9.50
      }
    ],
    "totalFees": 9.50,
    "effectiveRate": 0.095
  },
  "auditTrail": [
    "Address validated via cache",
    "Merchant volume: $2.3M in CA (threshold: $100K)",
    "No exemptions applied",
    "Applied CA state rate: 6%",
    "Applied LA County rate: 0.25%",
    "Applied LA City rate: 2.25%",
    "Applied SOFTWARE category modifier: 1%"
  ]
}
```

## HTTP API Server

The compliance engine can be run as an HTTP API server for testing with Postman or other HTTP clients.

### Starting the API Server

```bash
# Development mode (with ts-node)
npm run dev:api

# Production mode (requires build first)
npm run build
npm run start:api
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

### API Endpoints

#### Health Check
- **GET** `/health`
- Returns service status

**Example Response:**
```json
{
  "status": "ok",
  "service": "compliance-engine-api",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Calculate Compliance Fees
- **POST** `/api/compliance/calculate`
- Calculates compliance fees for a transaction

**Request Body:**
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
  "currency": "USD",
  "context": {
    "customerType": "WHOLESALE"
  }
}
```

**Note:** The `context` field is optional and can be used to pass additional information like customer type for exemptions.

**Response:** Returns ComplianceResponse matching Appendix A format (see Example Output above)

### Testing with Postman

1. **Health Check:**
   - Method: `GET`
   - URL: `http://localhost:3000/health`

2. **Valid Transaction:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/compliance/calculate`
   - Headers: `Content-Type: application/json`
   - Body: Valid transaction JSON (see Request Body above)

3. **Exempt Customer:**
   - Same as above, but include `"context": { "customerType": "WHOLESALE" }` in body

4. **Invalid Input:**
   - Same endpoint, but with invalid transaction (wrong currency, missing fields, etc.)
   - Returns 400 status with validation error

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
compliance-engine/
├── src/                    # Library code (ComplianceEngine)
│   ├── types/              # TypeScript type definitions
│   ├── gates/              # Gate implementations
│   │   ├── InputValidationGate.ts
│   │   ├── AddressValidationGate.ts
│   │   ├── ApplicabilityGate.ts
│   │   ├── ExemptionGate.ts
│   │   └── GateOrchestrator.ts
│   ├── calculation/       # Fee calculation engine
│   │   ├── RateTable.ts
│   │   └── FeeCalculator.ts
│   ├── config/            # Rule configuration
│   │   └── rules.ts
│   ├── ComplianceEngine.ts
│   └── index.ts
├── api/                    # HTTP API wrapper (independent)
│   ├── server.ts           # Express server
│   ├── routes/
│   │   └── compliance.ts   # Compliance endpoints
│   ├── middleware/
│   │   ├── errorHandler.ts # Error handling
│   │   └── validator.ts    # Request validation
│   └── types/
│       └── api.ts         # API-specific types
├── src/__tests__/         # Test files
│   ├── gates/
│   ├── calculation/
│   ├── contract/
│   ├── integration/
│   └── fixtures/
├── docs/
│   └── architecture.md    # Architecture documentation
└── README.md
```

## Assumptions & Simplifications

### Hardcoded Configuration

- **Rates:** State, county, city, and category modifier rates are hardcoded in `src/config/rules.ts`
- **Merchant Thresholds:** Merchant volumes are hardcoded (merchant_456: $2.3M in CA, merchant_789: $50K in NY)
- **Supported Jurisdictions:** CA, NY, TX states with specific cities
- **Exemption Rules:** WHOLESALE customers and FOOD category in CA

**Real System:** Would load from database/API

### Currency Support

- **USD Only:** Only USD currency is supported
- **Real System:** Would support multiple currencies with exchange rates

### External Services

- **Address Validation:** Simulated with timeout + fallback pattern
- **Real System:** Would call actual address validation service

### RateTable Immutability

- **Immutable:** RateTable is loaded once at startup and never mutated during execution
- **Real System:** Would support hot-reloading rates from database

### Customer Data

- **Simplified:** Customer type (WHOLESALE) is passed via context parameter
- **Real System:** Would fetch from customer service/database

## Test Data

### Supported Jurisdictions

- **States:** CA, NY, TX
- **CA Cities:** Los Angeles, San Francisco, San Diego
- **NY Cities:** New York City, Buffalo

### Merchant Thresholds

- **merchant_456:** $2.3M in CA (above $100K threshold) ✅
- **merchant_789:** $50K in NY (below $100K threshold) ❌

### Exemptions

- **WHOLESALE customers:** Fully exempt
- **FOOD category:** Exempt in CA, not exempt in NY

### Rate Structure

- **CA:** 6% state, 0.25% county (LA County), 2.25% city (Los Angeles)
- **NY:** 4% state, 0.5% county, 1% city (New York City)
- **Category Modifiers:** SOFTWARE +1%, PHYSICAL_GOODS +0%

## Future Improvements

### High Priority

1. **Database Integration:** Load rates, thresholds, and exemptions from database
2. **Caching Layer:** Redis cache for address validation results and rate lookups
3. **Metrics & Monitoring:** Extract metrics from structured logs (gate pass rates, execution times)

### Medium Priority

4. **Multi-Currency Support:** Support currencies beyond USD with exchange rate handling
5. **Customer Service Integration:** Fetch customer data from customer service API
6. **Rate Hot-Reloading:** Support updating rates without restart

### Low Priority

7. **Plugin Architecture:** Runtime plugin loading for gates (not in current scope)
8. **Full Circuit Breaker:** Complete circuit breaker implementation for external services
9. **Distributed State:** Support shared state for circuit breakers in distributed systems

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation, including:

- System architecture diagram
- Component design
- Gate pattern rationale
- Extensibility strategy
- Observability approach
- Error handling & resilience patterns
- API contracts (Appendix A & B)

## License

ISC


