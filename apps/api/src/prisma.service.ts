import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

interface QueryCounter {
  enabled: boolean;
  count: number;
  reset(): void;
  start(): void;
  stop(): void;
}

export const queryCounter: QueryCounter = {
  enabled: false,
  count: 0,
  reset(this: QueryCounter) {
    this.count = 0;
  },
  start(this: QueryCounter) {
    this.enabled = true;
    this.count = 0;
  },
  stop(this: QueryCounter) {
    this.enabled = false;
  },
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      // Only enable query event emission in tests to avoid noise/overhead elsewhere
      log:
        process.env.PRISMA_COUNT_QUERIES === "1"
          ? [{ emit: "event", level: "query" }]
          : [],
    });

    if (process.env.PRISMA_COUNT_QUERIES === "1") {
      this.$on("query" as never, () => {
        if (queryCounter.enabled) queryCounter.count += 1;
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }
}
