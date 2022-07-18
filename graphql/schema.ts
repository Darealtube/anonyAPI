import { typeDefs } from "./typedefs";
import { resolvers } from "./resolvers";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { applyMiddleware } from "graphql-middleware";
import { createRateLimitRule } from "graphql-rate-limit";
import { and, rule, shield } from "graphql-shield";
import User from "../models/User";

const rateLimitRule = createRateLimitRule({
  identifyContext: (ctx) => ctx.userID,
});

const isAuthenticated = rule({ cache: "contextual" })(
  async (_parent, _args, ctx, _info) => {
    const user = await User.findById(ctx.userID);
    return user !== null;
  }
);

const ownUser = rule({ cache: "contextual" })(
  async (_parent, { userId }, ctx, _info) => {
    return ctx.userID === userId;
  }
);

export const permissions = shield({
  Mutation: {
    sendMessage: rateLimitRule({ window: "30s", max: 15 }),
    editUser: and(
      isAuthenticated,
      ownUser,
      rateLimitRule({ window: "3600s", max: 3 })
    ),
    sendConfessionRequest: rateLimitRule({ window: "3600s", max: 4 }),
  },
});

export const schema = applyMiddleware(
  makeExecutableSchema({ typeDefs, resolvers }),
  permissions
);
