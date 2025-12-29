## Blog Monorepo

Test project for discovering how to combine a NestJS API and a frontend that consumes it in a single monorepo.

Summary:

- NestJS GraphQL API backed by Prisma
- Type-safe GraphQL schema via generated types from `schema.prisma`
- Tests with a real database (including checks for performance pitfalls like N+1)

Features:

- API: NestJS, Prisma, GraphQL, Vitest
- Frontend: TBD (probably React)
- E2E: Playwright

### API Interesting topics

#### Auto generated Types

The `ObjectType`s, `InputType`s and `ArgsType`s are automatically generated from the definitions in `schema.prisma`.

Why this is good:

- Single source of truth: database schema and API types stay in sync
- Less boilerplate: fewer hand-written DTOs to maintain
- Safer refactors: schema changes surface quickly as type errors

#### Testing with a real Database

The file `posts.e2e-spec.ts` showcases how to write tests against a real database.

Why this is good:

- Catches integration issues that mocks hide (migrations, relations, constraints, query behavior)
- Increases confidence that resolvers behave like production
- Makes it possible to detect performance regressions (e.g., N+1 query patterns)
