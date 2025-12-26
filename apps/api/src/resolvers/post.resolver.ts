import { Resolver, Query, Args, Int } from "@nestjs/graphql";
import { PrismaService } from "../prisma.service";
import { Post } from "src/@generated/post/post.model";

@Resolver(() => Post)
export class PostResolver {
  constructor(private prisma: PrismaService) {}

  @Query(() => [Post], { name: "posts" })
  async getPosts() {
    return this.prisma.post.findMany({
      include: {
        author: true,
        tags: true,
      },
    });
  }

  @Query(() => Post, { name: "post", nullable: true })
  async getPost(@Args("id", { type: () => Int }) id: number) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        tags: true,
      },
    });
  }
}
