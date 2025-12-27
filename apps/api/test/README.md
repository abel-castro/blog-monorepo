# Test Database Setup

This project uses a separate test database for e2e tests to ensure complete test isolation and prevent interference with development data.

## How It Works

- **Uses a separate test database** (`blog_test` instead of `blog`)
- **Test database is automatically created on first run**
- **Migrations are applied to the test database**
- **Zero interference with development database**
- **Tests clean data between runs using `deleteMany()`**

## Usage

### Basic Setup

To use an isolated test database in your e2e tests, call `setupTestDatabase()` in your `beforeAll` hook:

```typescript
import { setupTestDatabase } from "./setup-test-db";
import { PrismaService } from "../src/prisma.service";
import type { PrismaClient } from "@prisma/client";

describe("My Test Suite", () => {
  let app: INestApplication;
  let db: Awaited<ReturnType<typeof setupTestDatabase>>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Create isolated test database
    db = await setupTestDatabase();
    prisma = db.prisma;

    // Create NestJS app with test database
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await db.cleanup(); // Important: cleanup the test schema
  });

  beforeEach(async () => {
    // Clean data between tests
    await prisma.post.deleteMany();
    await prisma.author.deleteMany();
  });

  it("should work", async () => {
    const author = await prisma.author.create({
      data: { name: "Test", email: "test@example.com" },
    });
    expect(author.name).toBe("Test");
  });
});
```

### Without Test Database (Not Recommended)

If you don't call `setupTestDatabase()`, your tests will use the real database defined in `DATABASE_URL`. This is **not recommended** because:

- Tests can interfere with each other
- Tests can affect development data
- Tests are not properly isolated

### Query Performance Testing

For tests that need to track database queries (e.g., N+1 query detection), enable query counting:

```typescript
import { queryCounter } from "../src/prisma.service";

beforeAll(async () => {
  // Enable query counting
  process.env.PRISMA_COUNT_QUERIES = "1";

  db = await setupTestDatabase();
  // ... rest of setup
});

it("should not have N+1 queries", async () => {
  queryCounter.start();

  // Your test code
  const posts = await prisma.post.findMany({
    include: { author: true }
  });

  const count = queryCounter.count;
  expect(count).toBeLessThan(5); // Assert on query count
});
```

## Examples

See:
- [example-with-test-db.e2e-spec.ts](./example-with-test-db.e2e-spec.ts) - Basic usage
- [posts.e2e-spec.ts](./posts.e2e-spec.ts) - With query performance testing

## Requirements

- PostgreSQL database running (configured in `DATABASE_URL`)
- Prisma migrations must exist in `prisma/migrations/`
- `DATABASE_URL` environment variable must be set

## How It Works Behind the Scenes

1. **First run**: Creates `blog_test` database (if it doesn't exist)
2. **beforeAll**: Connects to `blog_test` and runs migrations
3. **Tests run** with isolated data in the test database
4. **beforeEach**: Cleans data between tests using `deleteMany()`
5. **afterAll**: Closes database connection

Your development database (`blog`) is **never touched**!

### Database Structure

```
blog          ← Your development database (untouched)
  └─ public   ← Dev schema with your dev data

blog_test     ← Test database (auto-created, shared by all test suites)
  └─ public   ← Test schema with test data (cleaned between tests)
```
