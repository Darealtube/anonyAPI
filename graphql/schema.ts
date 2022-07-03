import { typeDefs } from "./typedefs";
import { resolvers } from "./resolvers";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { applyMiddleware } from "graphql-middleware";
import { createRateLimitRule } from "graphql-rate-limit";
import { shield } from "graphql-shield";

const rateLimitRule = createRateLimitRule({
  identifyContext: (ctx) => {
    console.log(ctx.userIP);
    return ctx.userIP;
  },
});

export const permissions = shield({
  Mutation: {
    sendMessage: rateLimitRule({ window: "5s", max: 1 }),
  },
});

export const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs,
    resolvers,
  }),
  permissions
);
