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

After starting the database, run the migration script to create the schema and seed initial data:

```bash
npm run db:migrate
```

This will run all migration files in order. The script uses the same database configuration as the application (via environment variables or defaults).


### Database Configuration

The database connection is configured via environment variables. Copy `.env.example` to `.env` and adjust as needed:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compliance_engine
DB_USER=compliance_user
DB_PASSWORD=compliance_pass
```

**Note:** The compliance engine requires a database connection to load configuration data (rates, exemptions, thresholds). All configuration is stored in the database.

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

1. **Health Check:**
   - Method: `GET`
   - URL: `http://localhost:3000/health`

**Example Response:**
```json
{
  "service": "compliance-engine-api",
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

2. **Calculate:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/compliance/calculate`
   - Headers: `Content-Type: application/json`

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

## Running Tests

The test suite uses **Jest** as the testing framework and includes unit tests, integration tests, and contract tests covering all major components of the compliance engine.

### Jest Configuration

Jest is configured via `jest.config.js` and uses `ts-jest` to run TypeScript tests directly without compilation. The configuration:
- Uses `ts-jest` preset for TypeScript support
- Runs tests in Node.js environment
- Collects coverage from `src/**/*.ts` files (excluding test files and type definitions)
- Generates coverage reports in multiple formats: text (console), LCOV, and HTML
- Coverage reports are saved to the `coverage/` directory

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs tests on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

After running `npm run test:coverage`, you can view a detailed HTML coverage report by opening `coverage/index.html` in your browser.

### Test Coverage

The test suite covers all scenarios below:

**Unit Tests:**

- **Gate Tests** (`src/__tests__/gates/`):
  - `InputValidationGate.test.ts` - Input validation, required fields, currency checks, amount consistency, invalid input handling (Task 3)
  - `AddressValidationGate.test.ts` - Address validation, jurisdiction checks, external service failure with fallback (Task 3), timeout handling
  - `ApplicabilityGate.test.ts` - Merchant threshold checks, jurisdiction applicability
  - `ExemptionGate.test.ts` - Customer-level and item-level exemption handling

- **Calculation Tests** (`src/__tests__/calculation/`):
  - `FeeCalculator.test.ts` - Multi-layer fee calculation (state, county, city, category modifiers), exemption application, precision handling with 47 items

- **Engine Tests** (`src/__tests__/`):
  - `ComplianceEngine.test.ts` - End-to-end engine processing, gate orchestration, error handling, different transaction paths

### Test Data

Test fixtures are located in `src/__tests__/fixtures/transactions.ts` and include scenarios for:
- Valid transactions (CA, NY, TX)
- Invalid inputs (missing fields, wrong currency, amount mismatches)
- Merchant threshold scenarios
- Exemption scenarios (customer-level, item-level)
- Multiple item transactions

**Note:** Tests require a running PostgreSQL database. Ensure the database is started (`npm run db:up`) and migrations are run (`npm run db:migrate`) before running tests.

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
│   │   ├── GateOrchestrator.ts
│   │   ├── IGate.ts
│   │   └── types.ts
│   ├── calculation/        # Fee calculation engine
│   │   ├── RateTable.ts
│   │   └── FeeCalculator.ts
│   ├── database/           # Database layer
│   │   ├── client.ts
│   │   ├── queries/
│   │   │   ├── configQueries.ts
│   │   │   ├── transactionQueries.ts
│   │   │   └── auditQueries.ts
│   │   └── repositories/
│   │       ├── ConfigRepository.ts
│   │       ├── TransactionRepository.ts
│   │       └── AuditRepository.ts
│   ├── ComplianceEngine.ts
│   └── index.ts
├── api/                    # HTTP API wrapper (independent)
│   ├── server.ts           # Express server
│   ├── routes/
│   │   └── compliance.ts   # Compliance endpoints
│   ├── middleware/
│   │   ├── errorHandler.ts # Error handling
│   │   └── validator.ts    # Request validation
│   ├── types/
│   │   └── api.ts          # API-specific types
│   └── POSTMAN_GUIDE.md    # Postman testing guide
├── database/               # Database migrations
│   ├── migrate.ts          # Migration script
│   └── migrations/         # SQL migration files
│       ├── 001_initial_schema.sql
│       └── 002_seed_data.sql
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

### Database-Driven Configuration

- **Rates:** State, county, city, and category modifier rates are loaded from the database
- **Merchant Thresholds:** Merchant volumes are stored in the database
- **Supported Jurisdictions:** States and cities are configured in the database
- **Exemption Rules:** Customer and item exemptions are stored in the database

**Note:** Configuration data is seeded via database migrations (see `database/migrations/002_seed_data.sql`)

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

## Future Improvements (From high to low priority)

1. **JWT Authentication:** Add JWT token-based authentication to API endpoints for secure access
2. **Redis Caching Layer:** Upgrade from in-memory cache to Redis for address validation results and rate lookups (currently uses in-memory cache)
3. **Detailed Logging:** Enhanced structured logging with request IDs, correlation IDs, execution times, and detailed error context
4. **Metrics & Monitoring:** Extract metrics from structured logs (gate pass rates, execution times)
5. **API Rate Limiting:** Implement rate limiting to prevent API abuse and ensure fair usage
6. **API Documentation:** Generate Swagger/OpenAPI documentation for API endpoints
7. **Multi-Currency Support:** Support currencies beyond USD with exchange rate handling
8. **Customer Service Integration:** Fetch customer data from customer service API (currently accepts customer type via context parameter)
9. **Rate Hot-Reloading:** Support updating rates without restart (currently requires restart to reload RateTable)
10. **Error Tracking:** Integrate error tracking service (e.g., Sentry) for production error monitoring
11. **Batch Processing:** Support batch transaction processing for improved throughput



## Why Gate Pattern?

### 1. Deterministic Execution Flow

- Sequential, predictable execution order
- Easy to debug: "Gate X failed" is immediately clear
- Execution order is explicit in code
- No hidden rule evaluation logic

### 2. Explicit Checkpoints

- Each gate is a clear checkpoint
- Failure point is obvious: "AddressValidationGate failed"
- Easy to add logging/observability at each checkpoint
- Clear separation between validation, applicability, exemptions, calculation

### 3. Easier Unit Testing

- Each gate is independently testable
- Test InputValidationGate with various invalid inputs
- Test AddressValidationGate with different addresses
- Mock dependencies easily (e.g., external service)

### 4. Lower Cognitive Load

- Sequential flow is easy to understand
- Code reads like: "Validate input → Validate address → Check applicability → Check exemptions → Calculate fees"
- New developers can understand the flow quickly

### 5. Better Observability

- Gate-level metrics and logging
- "AddressValidationGate took 50ms"
- "ApplicabilityGate failed 2% of the time"
- Clear audit trail: "Gate X passed/failed with message Y"

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation, including:

- System architecture diagram
- Component design
- Gate pattern implementation
- Error handling & resilience patterns
- Data flow

## License

ISC


