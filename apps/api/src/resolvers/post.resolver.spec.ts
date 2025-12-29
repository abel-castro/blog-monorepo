/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { PostResolver } from "./post.resolver";
import { PrismaService } from "../prisma.service";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("PostResolver", () => {
  let resolver: PostResolver;
  let prismaService: PrismaService;

  const mockPrismaService = {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostResolver,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    resolver = module.get<PostResolver>(PostResolver);
    prismaService = module.get<PrismaService>(PrismaService);

    vi.clearAllMocks();
  });

  describe("getPosts", () => {
    it("should return an array of posts with author and tags", async () => {
      const mockPosts = [
        {
          id: "1",
          title: "First Post",
          content: "Content 1",
          published: true,
          authorId: "author-1",
          author: {
            id: "author-1",
            name: "John Doe",
            email: "john@example.com",
          },
          tags: [
            { id: "tag-1", name: "Technology" },
            { id: "tag-2", name: "Programming" },
          ],
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          title: "Second Post",
          content: "Content 2",
          published: false,
          authorId: "author-2",
          author: {
            id: "author-2",
            name: "Jane Smith",
            email: "jane@example.com",
          },
          tags: [{ id: "tag-3", name: "Design" }],
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ];

      mockPrismaService.post.findMany.mockResolvedValue(mockPosts);

      const result = await resolver.getPosts();

      expect(result).toEqual(mockPosts);
      expect(prismaService.post.findMany).toHaveBeenCalledTimes(1);
      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        include: {
          author: true,
          tags: true,
        },
      });
    });

    it("should return an empty array when no posts exist", async () => {
      mockPrismaService.post.findMany.mockResolvedValue([]);

      const result = await resolver.getPosts();

      expect(result).toEqual([]);
      expect(prismaService.post.findMany).toHaveBeenCalledTimes(1);
    });

    it("should throw an error when database operation fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaService.post.findMany.mockRejectedValue(error);

      await expect(resolver.getPosts()).rejects.toThrow(
        "Database connection failed",
      );
      expect(prismaService.post.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getPost", () => {
    it("should return a post with author and tags when found", async () => {
      const mockPost = {
        id: "1",
        title: "Test Post",
        content: "Test Content",
        published: true,
        authorId: "author-1",
        author: {
          id: "author-1",
          name: "John Doe",
          email: "john@example.com",
        },
        tags: [
          { id: "tag-1", name: "Technology" },
          { id: "tag-2", name: "Programming" },
        ],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      const result = await resolver.getPost("1");

      expect(result).toEqual(mockPost);
      expect(prismaService.post.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        include: {
          author: true,
          tags: true,
        },
      });
    });

    it("should return null when post is not found", async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      const result = await resolver.getPost("non-existent-id");

      expect(result).toBeNull();
      expect(prismaService.post.findUnique).toHaveBeenCalledTimes(1);
      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-id" },
        include: {
          author: true,
          tags: true,
        },
      });
    });

    it("should handle different post IDs correctly", async () => {
      const mockPost1 = {
        id: "post-123",
        title: "Post 123",
        content: "Content 123",
        published: true,
        authorId: "author-1",
        author: {
          id: "author-1",
          name: "John Doe",
          email: "john@example.com",
        },
        tags: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      mockPrismaService.post.findUnique.mockResolvedValue(mockPost1);

      const result = await resolver.getPost("post-123");

      expect(result).toEqual(mockPost1);
      expect(prismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: "post-123" },
        include: {
          author: true,
          tags: true,
        },
      });
    });

    it("should throw an error when database operation fails", async () => {
      const error = new Error("Database connection failed");
      mockPrismaService.post.findUnique.mockRejectedValue(error);

      await expect(resolver.getPost("1")).rejects.toThrow(
        "Database connection failed",
      );
      expect(prismaService.post.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
