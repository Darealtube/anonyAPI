import { GraphQLResolveInfo } from "graphql";
import { DateTime } from "luxon";
import { ObjectId } from "mongodb";
import { PubSub } from "graphql-subscriptions";
import { Context } from "apollo-server-core";
import Chat from "../models/Chat";
import Message from "../models/Message";
import User from "../models/User";
import Request from "../models/Request";
import { Decursorify } from "../utils/cursorify";
import relayPaginate from "../utils/relayPaginate";

const pubsub = new PubSub();

type SubscriptionFn = {
  subscribe: () => AsyncIterator<unknown, any, undefined>;
};

type ResolverFn = (
  parent: any,
  args: any,
  ctx: Context,
  info: GraphQLResolveInfo
) => any;

interface ResolverMap {
  [field: string]: ResolverFn | SubscriptionFn;
}
interface Resolvers {
  [resolver: string]: ResolverMap;
}

export const resolvers: Resolvers = {
  User: {
    sentConfessionRequests: async (parent, args, _context, _info) => {
      const totalCount = await Request.count({ anonymous: parent.name });
      const sentConfessions = await Request.find({
        anonymous: parent.name,
        ...(args.after && { _id: { $lt: Decursorify(args.after) } }),
      })
        .sort({
          _id: -1,
        })
        .limit(args.limit);

      const data = relayPaginate({
        finalArray: sentConfessions,
        cursorIdentifier: "_id",
        limit: args.limit,
      });
      return { ...data, totalCount };
    },
    receivedConfessionRequests: async (parent, args, _context, _info) => {
      const totalCount = await Request.count({ receiver: parent.name });
      const receivedConfessions = await Request.find({
        receiver: parent.name,
        ...(args.after && {
          _id: {
            $lt: Decursorify(args.after),
          },
        }),
      })
        .sort({
          _id: -1,
        })
        .limit(args.limit);
      const data = relayPaginate({
        finalArray: receivedConfessions,
        cursorIdentifier: "_id",
        limit: args.limit,
      });
      return { ...data, totalCount };
    },
    activeChat: async (parent, _args, _context, _info) => {
      return await Chat.findById(parent.activeChat);
    },
    userSentRequest: async (parent, args, _context, _info) => {
      const sentRequest = await Request.findOne({
        anonymous: args.from,
        receiver: parent.name,
      });
      return sentRequest ? true : false;
    },
  },
  Request: {
    anonymous: async (parent, _args, _context, _info) => {
      return await User.findOne({ name: parent.anonymous }).lean();
    },
    receiver: async (parent, _args, _context, _info) => {
      return await User.findOne({ name: parent.receiver }).lean();
    },
  },
  Chat: {
    anonymous: async (parent, _args, _context, _info) => {
      return await User.findOne({ name: parent.anonymous });
    },
    confessee: async (parent, _args, _context, _info) => {
      return await User.findOne({ name: parent.confessee });
    },
    messages: async (parent, args, _context, _info) => {
      const totalCount = await Message.count({ chat: parent._id });
      const messages = await Message.find({
        chat: parent._id,
        ...(args.after && { _id: { $lt: Decursorify(args.after) } }),
      })
        .sort({ _id: -1 })
        .limit(args.limit);

      const data = relayPaginate({
        finalArray: messages,
        cursorIdentifier: "_id",
        limit: args.limit,
      });
      return { ...data, totalCount };
    },
    latestMessage: async (parent, _args, _context, _info) => {
      const latestMessage = await Message.find({ chat: parent._id })
        .sort({
          date: -1,
        })
        .limit(1);
      return latestMessage[0];
    },
  },
  Message: {
    sender: async (parent, _args, _context, _info) => {
      return await User.findOne({ name: parent.sender });
    },
  },
  Query: {
    searchUser: async (_parent, args, _context, _info) => {
      const searchUserResult = await User.find({
        name: {
          $regex: new RegExp(args.key.trim(), "i"),
        },
      })
        .sort({ name: 1 })
        .limit(5);

      return searchUserResult;
    },
    getUser: async (_parent, args, _context, _info) => {
      return await User.findOne({ name: args.name });
    },
    getUserActiveChat: async (_parent, args, _context, _info) => {
      return await Chat.findOne({
        $or: [{ anonymous: args.name }, { confessee: args.name }],
      });
    },
  },

  Mutation: {
    createUser: async (_parent, args, _context, _info) => {
      await User.create(args);
      return true;
    },
    createUniqueTag: async (_parent, args, _context, _info) => {
      await User.updateOne(
        { _id: new ObjectId(args.userId) },
        { name: `${args.name}${Math.floor(1000 + Math.random() * 9000)}` },
        { new: true }
      );
      return true;
    },
    editUser: async (_parent, args, _context, _info) => {
      const { originalName, ...updatedFields } = args;
      await User.updateOne({ name: originalName }, updatedFields, {
        new: true,
      });
      return true;
    },
    sendConfessionRequest: async (_parent, args, _context, _info) => {
      const sentRequest = await Request.create({
        anonymous: args.anonymous,
        receiver: args.receiver,
        accepted: false,
      });
      return sentRequest;
    },
    rejectConfessionRequest: async (_parent, args, _context, _info) => {
      const deletedRequest = await Request.findByIdAndDelete(args.requestID);
      return deletedRequest._id;
    },
    acceptConfessionRequest: async (_parent, args, _context, _info) => {
      const request = await Request.findByIdAndDelete(args.requestID);
      const newChat = await Chat.create({
        anonymous: request.anonymous,
        confessee: request.receiver,
      });
      await User.findOneAndUpdate(
        { name: request.anonymous },
        { activeChat: newChat._id }
      );
      await User.findOneAndUpdate(
        { name: request.receiver },
        { activeChat: newChat._id }
      );
      return newChat;
    },
    sendMessage: async (_parent, args, _context, _info) => {
      const updatedChat = await Chat.findByIdAndUpdate(
        args.chat,
        {
          updatedAt: DateTime.local(),
          ...(args.anonymous
            ? { anonSeen: true, confesseeSeen: false }
            : { confesseeSeen: true, anonSeen: false }),
        },
        { new: true }
      );
      // Calculates the remaining time from the message's created date to the chat's expiry date
      const remainingTime = DateTime.fromJSDate(updatedChat.expiresAt)
        .diff(DateTime.local())
        .toObject();
      // Expires at remaining time
      const expiresAt = DateTime.local()
        .plus(remainingTime.milliseconds as number)
        .toJSDate();
      const message = await Message.create({ ...args, expiresAt });
      await pubsub.publish("NEW_MESSAGE", { newMessage: message });
      await pubsub.publish("SEEN_CHAT", {
        seenChat: updatedChat,
      });

      return message;
    },
    seenChat: async (_parent, args, _context, _info) => {
      const updatedChat = await Chat.findByIdAndUpdate(
        args.chat,
        {
          ...(args.person === "anonymous"
            ? { anonSeen: true }
            : { confesseeSeen: true }),
        },
        { new: true }
      );

      await pubsub.publish("SEEN_CHAT", {
        seenChat: updatedChat,
      });
      return true;
    },
    endChat: async (_parent, args, _context, _info) => {
      const deletedChat = await Chat.findByIdAndDelete(args.chat);
      await Message.deleteMany({ chat: deletedChat._id });
      await User.updateMany(
        { activeChat: deletedChat._id },
        { activeChat: null }
      );
      return true;
    },
  },

  Subscription: {
    newMessage: {
      subscribe: () => pubsub.asyncIterator(["NEW_MESSAGE"]),
    },
    seenChat: {
      subscribe: () => pubsub.asyncIterator(["SEEN_CHAT"]),
    },
  },
};
