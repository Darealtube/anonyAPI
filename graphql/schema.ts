import { typeDefs } from "./typedefs";
import { resolvers } from "./resolvers";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { applyMiddleware } from "graphql-middleware";
import { createRateLimitRule } from "graphql-rate-limit";
import { shield } from "graphql-shield";

const rateLimitRule = createRateLimitRule({
  identifyContext: (ctx) => ctx.userID,
});

export const permissions = shield({
  Mutation: {
    sendMessage: rateLimitRule({ window: "30s", max: 15 }),
    editUser: rateLimitRule({ window: "3600s", max: 3 }),
    sendConfessionRequest: rateLimitRule({ window: "3600s", max: 4 }),
    rejectConfessionRequest: rateLimitRule({ window: "10s", max: 1 }),
  },
});

export const schema = applyMiddleware(
  makeExecutableSchema({ typeDefs, resolvers }),
  permissions
);
