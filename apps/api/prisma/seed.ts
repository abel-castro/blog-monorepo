import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean up existing data
  await prisma.post.deleteMany();
  await prisma.author.deleteMany();
  await prisma.tag.deleteMany();

  // Create tags
  const techTag = await prisma.tag.create({
    data: { name: "Technology" },
  });

  const programmingTag = await prisma.tag.create({
    data: { name: "Programming" },
  });

  const webDevTag = await prisma.tag.create({
    data: { name: "Web Development" },
  });

  // Create authors
  const author1 = await prisma.author.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      bio: "A passionate software developer and tech enthusiast.",
    },
  });

  const author2 = await prisma.author.create({
    data: {
      name: "Jane Smith",
      email: "jane@example.com",
      bio: "Full-stack developer who loves building web applications.",
    },
  });

  // Create posts
  await prisma.post.create({
    data: {
      title: "Getting Started with GraphQL",
      content:
        "GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data. It provides a complete and understandable description of the data in your API...",
      published: true,
      authorId: author1.id,
      tags: {
        connect: [{ id: techTag.id }, { id: programmingTag.id }],
      },
    },
  });

  await prisma.post.create({
    data: {
      title: "Building Modern Web Applications with NestJS",
      content:
        "NestJS is a progressive Node.js framework for building efficient, reliable and scalable server-side applications. It uses modern JavaScript, is built with TypeScript...",
      published: true,
      authorId: author2.id,
      tags: {
        connect: [
          { id: webDevTag.id },
          { id: programmingTag.id },
          { id: techTag.id },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      title: "Introduction to Prisma ORM",
      content:
        "Prisma is a next-generation ORM that consists of several tools: Prisma Client, Prisma Migrate, and Prisma Studio. It helps developers build faster and make fewer errors...",
      published: true,
      authorId: author1.id,
      tags: {
        connect: [{ id: programmingTag.id }, { id: techTag.id }],
      },
    },
  });

  await prisma.post.create({
    data: {
      title: "Draft: Upcoming Features in TypeScript",
      content:
        "This post discusses the upcoming features in the next version of TypeScript...",
      published: false,
      authorId: author2.id,
      tags: {
        connect: [{ id: programmingTag.id }],
      },
    },
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
