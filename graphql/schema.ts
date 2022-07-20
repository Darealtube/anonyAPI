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

const ownProfile = rule({ cache: "contextual" })(
  async (_parent, args, ctx, _info) => {
    return ctx.userID === args.profileId;
  }
);

export const permissions = shield({
  Mutation: {
    sendMessage: rateLimitRule({
      window: "30s",
      max: 15,
      message: "Slow down. Don't get too excited.",
    }),
    editUser: rateLimitRule({
      window: "3600s",
      max: 3,
      message: "You are being rate limited. Try again in an hour.",
    }),
    sendConfessionRequest: rateLimitRule({
      window: "3600s",
      max: 4,
      message: "You are being rate limited. Try again in an hour.",
    }),
  },
});

export const schema = applyMiddleware(
  makeExecutableSchema({ typeDefs, resolvers }),
  permissions
);
