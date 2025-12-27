import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { execSync } from "child_process";

interface TestDatabase {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

/**
 * Creates an isolated test database for a test suite.
 *
 * Uses a separate test database (e.g., `blog_test`) to ensure complete
 * isolation from your development database.
 *
 * Database naming: If DATABASE_URL points to `blog`, tests use `blog_test`.
 * All tests share the same test database but should clean data before each test.
 *
 * @example
 * ```ts
 * describe("My Test Suite", () => {
 *   let db: Awaited<ReturnType<typeof setupTestDatabase>>;
 *
 *   beforeAll(async () => {
 *     db = await setupTestDatabase();
 *   });
 *
 *   afterAll(async () => {
 *     await db.cleanup();
 *   });
 *
 *   it("should work", async () => {
 *     const user = await db.prisma.user.create({ ... });
 *   });
 * });
 * ```
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please set it in your environment variables.",
    );
  }

  // Parse the database URL and change to test database
  const url = new URL(databaseUrl);
  const originalDbName = url.pathname.slice(1); // Remove leading slash
  const testDbName = `${originalDbName}_test`;

  // Create URL for the test database (using public schema)
  const testUrl = new URL(databaseUrl);
  testUrl.pathname = `/${testDbName}`;
  const testDatabaseUrl = testUrl.toString();

  // First, ensure the test database exists
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres"; // Connect to default postgres db
  const adminPool = new Pool({ connectionString: adminUrl.toString() });

  try {
    // Check if test database exists, create if not
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDbName],
    );

    if (result.rowCount === 0) {
      console.log(`Creating test database: ${testDbName}`);
      await adminPool.query(`CREATE DATABASE "${testDbName}"`);
      console.log(`✓ Test database ${testDbName} created`);
    }
  } finally {
    await adminPool.end();
  }

  // Create a connection pool with the test database
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const adapter = new PrismaPg(pool);

  // Create a Prisma client for the test schema with query logging if enabled
  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_COUNT_QUERIES === "1"
        ? [{ emit: "event", level: "query" }]
        : [],
  });

  // Enable query counting if requested
  if (process.env.PRISMA_COUNT_QUERIES === "1") {
    // Import queryCounter - the path is resolved at runtime
    const prismaServiceModule = await import("../src/prisma.service.js");
    const queryCounter = prismaServiceModule.queryCounter;
    prisma.$on("query" as never, () => {
      if (queryCounter.enabled) queryCounter.count += 1;
    });
  }

  try {
    // Connect to the database
    await prisma.$connect();

    // Run migrations on the test database
    console.log(`Setting up test database: ${testDbName}`);
    execSync(`DATABASE_URL="${testDatabaseUrl}" npx prisma migrate deploy`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log(`✓ Test database ${testDbName} ready`);
  } catch (error) {
    await prisma.$disconnect();
    await pool.end();
    throw error;
  }

  // Return the Prisma client and cleanup function
  return {
    prisma,
    cleanup: async () => {
      try {
        await prisma.$disconnect();
        await pool.end();
        console.log(`✓ Test database ${testDbName} connection closed`);
      } catch (error) {
        console.error(`Failed to cleanup:`, error);
      }
    },
  };
}

/**
 * Creates an isolated test database for e2e tests with NestJS.
 * Returns a module override that replaces PrismaService with the test database.
 *
 * @example
 * ```ts
 * describe("Posts E2E", () => {
 *   let app: INestApplication;
 *   let db: Awaited<ReturnType<typeof setupTestDatabase>>;
 *
 *   beforeAll(async () => {
 *     db = await setupTestDatabase();
 *
 *     const moduleFixture = await Test.createTestingModule({
 *       imports: [AppModule],
 *     })
 *       .overrideProvider(PrismaService)
 *       .useValue(db.prisma)
 *       .compile();
 *
 *     app = moduleFixture.createNestApplication();
 *     await app.init();
 *   });
 *
 *   afterAll(async () => {
 *     await app.close();
 *     await db.cleanup();
 *   });
 * });
 * ```
 */
