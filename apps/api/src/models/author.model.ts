import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Post } from "./post.model";

@ObjectType()
export class Author {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  bio?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Post], { nullable: true })
  posts?: Post[];
}
