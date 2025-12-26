import { ObjectType, Field, Int } from "@nestjs/graphql";
import { Author } from "./author.model";
import { Tag } from "./tag.model";

@ObjectType()
export class Post {
  @Field(() => Int)
  id: number;

  @Field()
  title: string;

  @Field()
  content: string;

  @Field()
  published: boolean;

  @Field(() => Int)
  authorId: number;

  @Field(() => Author)
  author: Author;

  @Field(() => [Tag], { nullable: true })
  tags?: Tag[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
