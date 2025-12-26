import "dotenv/config";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { PrismaService, queryCounter } from "../src/prisma.service";

describe("Posts Query Performance (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const postsQuery = `
    query {
      posts {
        id
        title
        content
        published
        author {
          id
          name
          email
        }
        tags {
          id
          name
        }
      }
    }
  `;

  beforeEach(async () => {
    // Enable query counting via environment variable
    process.env.PRISMA_COUNT_QUERIES = "1";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up database before each test
    await prisma.post.deleteMany();
    await prisma.author.deleteMany();
    await prisma.tag.deleteMany();

    // Reset counter after cleanup
    queryCounter.reset();
  });

  afterEach(async () => {
    queryCounter.stop();
    await app.close();
  });

  it("should maintain constant query count when fetching posts list", async () => {
    // Create test data
    const author1 = await prisma.author.create({
      data: {
        name: "John Doe",
        email: "john@example.com",
        bio: "A writer",
      },
    });

    const tag1 = await prisma.tag.create({
      data: { name: "Technology" },
    });

    const tag2 = await prisma.tag.create({
      data: { name: "Programming" },
    });

    await prisma.post.create({
      data: {
        title: "First Post",
        content: "Content of first post",
        published: true,
        authorId: author1.id,
        tags: {
          connect: [{ id: tag1.id }, { id: tag2.id }],
        },
      },
    });

    // Start tracking queries
    queryCounter.start();

    // Make first request
    const response1 = await request(app.getHttpServer())
      .post("/graphql")
      .send({ query: postsQuery })
      .expect(200);

    expect(response1.body.data.posts).toHaveLength(1);
    expect(response1.body.data.posts[0].author).toBeDefined();
    expect(response1.body.data.posts[0].tags).toHaveLength(2);

    const firstQueryCount = queryCounter.count;
    console.log(`Query count with 1 post: ${firstQueryCount}`);

    // Create another post with the same author and tags
    await prisma.post.create({
      data: {
        title: "Second Post",
        content: "Content of second post",
        published: true,
        authorId: author1.id,
        tags: {
          connect: [{ id: tag1.id }],
        },
      },
    });

    // Reset query counter
    queryCounter.reset();

    // Make second request
    const response2 = await request(app.getHttpServer())
      .post("/graphql")
      .send({ query: postsQuery })
      .expect(200);

    expect(response2.body.data.posts).toHaveLength(2);
    expect(response2.body.data.posts[0].author).toBeDefined();
    expect(response2.body.data.posts[1].author).toBeDefined();

    const secondQueryCount = queryCounter.count;
    console.log(`Query count with 2 posts: ${secondQueryCount}`);

    // Assert that query count remains the same
    expect(secondQueryCount).toBe(firstQueryCount);
  });
});
