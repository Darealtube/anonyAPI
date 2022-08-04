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
  async (_parent, _args, { userID }, _info) => {
    const user = await User.findById(userID);
    return user !== null;
  }
);

const ownProfile = rule({ cache: "contextual" })(
  async (_parent, args, { userID }, _info) => {
    return userID === args.profileId;
  }
);

const authenticatedSubscription = rule({ cache: "contextual" })(
  async (_parent, _args, { subUserID }, _info) => {
    const user = await User.findById(subUserID);
    return user !== null;
  }
);

const ownSubscription = rule({ cache: "contextual" })(
  async (_parent, args, { subUserID }, _info) => {
    return subUserID === args.profileId;
  }
);

export const permissions = shield({
  User: {
    sentConfessionRequests: isAuthenticated,
    receivedConfessionRequests: isAuthenticated,
    userNotifications: isAuthenticated,
  },
  Query: {
    getProfile: and(isAuthenticated, ownProfile),
    getProfileActiveChat: and(isAuthenticated, ownProfile),
  },
  Mutation: {
    sendMessage: and(
      isAuthenticated,
      rateLimitRule({
        window: "30s",
        max: 15,
        message: "Slow down. Don't get too excited.",
      })
    ),
    editUser: and(
      isAuthenticated,
      ownProfile,
      rateLimitRule({
        window: "3600s",
        max: 3,
        message: "You are being rate limited. Try again in an hour.",
      })
    ),
    sendConfessionRequest: and(
      isAuthenticated,
      rateLimitRule({
        window: "3600s",
        max: 4,
        message: "You are being rate limited. Try again in an hour.",
      })
    ),
    rejectConfessionRequest: isAuthenticated,
    acceptConfessionRequest: isAuthenticated,
    seenChat: isAuthenticated,
    endChatRequest: and(
      isAuthenticated,
      rateLimitRule({
        window: "300s",
        max: 1,
        message: "You can request again in 5 minutes.",
      })
    ),
    rejectEndChat: and(
      isAuthenticated,
      rateLimitRule({
        window: "300s",
        max: 1,
        message: "You're rejecting too much.",
      })
    ),
    acceptEndChat: isAuthenticated,
    endChat: isAuthenticated,
    seenNotification: isAuthenticated,
    deleteNotification: isAuthenticated,
  },
  Subscription: {
    profileChat: and(authenticatedSubscription, ownSubscription),
    notifSeen: and(authenticatedSubscription, ownSubscription),
  },
});

export const schema = applyMiddleware(
  makeExecutableSchema({ typeDefs, resolvers }),
  permissions
);
