import { GraphQLResolveInfo } from "graphql";
import { ObjectId } from "mongodb";
import { PubSub } from "graphql-subscriptions";
import {
  ApolloError,
  ForbiddenError,
  UserInputError,
} from "apollo-server-core";
import Chat from "../models/Chat";
import Message from "../models/Message";
import User from "../models/User";
import Request from "../models/Request";
import { Decursorify } from "../utils/cursorify";
import relayPaginate from "../utils/relayPaginate";
import Notification from "../models/Notification";

const pubsub = new PubSub();

type DumbSub = () => ApolloError | AsyncIterator<unknown, any, undefined>;
type SmartSub = (
  parent?: any,
  args?: any,
  ctx?: any,
  info?: GraphQLResolveInfo
) => ApolloError | AsyncIterator<unknown, any, undefined>;

type SubscriptionFn = {
  subscribe: DumbSub | SmartSub;
};

type ResolverFn = (
  parent: any,
  args: any,
  ctx: any,
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
      const totalCount = await Request.count({ anonymous: parent._id });
      const sentConfessions = await Request.find({
        anonymous: parent._id,
        ...(args.after && { _id: { $lt: Decursorify(args.after) } }),
      })
        .sort({ _id: -1 })
        .limit(args.limit);

      const data = relayPaginate({
        finalArray: sentConfessions,
        cursorIdentifier: "_id",
        limit: args.limit,
      });
      return { ...data, totalCount };
    },
    receivedConfessionRequests: async (parent, args, _context, _info) => {
      const totalCount = await Request.count({ receiver: parent._id });
      const receivedConfessions = await Request.find({
        receiver: parent._id,
        ...(args.after && { _id: { $lt: Decursorify(args.after) } }),
      })
        .sort({ _id: -1 })
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
        receiver: parent._id,
      });
      return sentRequest ? true : false;
    },
    userNotifications: async (parent, args, _context, _info) => {
      const notifCount = await Notification.count({ receiver: parent._id });
      const notifications = await Notification.find({
        receiver: parent._id,
        ...(args.after && { _id: { $lt: Decursorify(args.after) } }),
      })
        .sort({ _id: -1 })
        .limit(args.limit);

      const data = relayPaginate({
        finalArray: notifications,
        cursorIdentifier: "_id",
        limit: args.limit,
      });
      return { ...data, totalCount: notifCount };
    },
  },
  Request: {
    anonymous: async (parent, _args, _context, _info) => {
      return await User.findOne({ _id: parent.anonymous });
    },
    receiver: async (parent, _args, _context, _info) => {
      return await User.findOne({ _id: parent.receiver });
    },
  },
  Notification: {
    receiver: async (parent, _args, _context, _info) => {
      return await User.findOne({ _id: parent.receiver });
    },
  },
  Chat: {
    anonymous: async (parent, _args, _context, _info) => {
      return await User.findOne({ _id: parent.anonymous });
    },
    confessee: async (parent, _args, _context, _info) => {
      return await User.findOne({ _id: parent.confessee });
    },
    messages: async (parent, args, _context, _info) => {
      if (!parent._id) {
        return new ForbiddenError("Chat does not exist");
      }
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
        .sort({ date: -1 })
        .limit(1);
      return latestMessage[0];
    },
  },
  Message: {
    sender: async (parent, _args, _context, _info) => {
      return await User.findOne({ _id: parent.sender });
    },
  },
  Query: {
    searchUser: async (_parent, args, _context, _info) => {
      const searchUserResult = await User.find({
        name: { $regex: new RegExp(args.key.trim(), "i") },
      })
        .sort({ name: 1 })
        .limit(5);

      return searchUserResult;
    },
    getUser: async (_parent, args, _context, _info) => {
      return await User.findOne({ name: args.name });
    },
    getProfile: async (_parent, args, _context, _info) => {
      return await User.findById(args.profileId);
    },
    getProfileActiveChat: async (_parent, args, _context, _info) => {
      return await Chat.findOne({
        $or: [{ anonymous: args.profileId }, { confessee: args.profileId }],
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
    editUser: async (
      _parent,
      { profileId, ...updatedFields },
      _context,
      _info
    ) => {
      await User.updateOne({ _id: profileId }, updatedFields, { new: true });
      return true;
    },
    sendConfessionRequest: async (_parent, args, _context, _info) => {
      const sentRequest = await Request.create({
        anonymous: args.anonymous,
        receiver: args.receiver,
        accepted: false,
      });
      await Notification.create({ receiver: args.receiver });
      await User.updateOne({ _id: args.receiver }, { notifSeen: false });
      await pubsub.publish(`NOTIF_SEEN_${args.receiver}`, { notifSeen: false });
      return sentRequest;
    },
    rejectConfessionRequest: async (_parent, args, _context, _info) => {
      const deletedRequest = await Request.findByIdAndDelete(args.requestID);
      return deletedRequest._id;
    },
    acceptConfessionRequest: async (_parent, args, _context, _info) => {
      const request = await Request.findByIdAndDelete(args.requestID);
      if (!request) {
        return new UserInputError("Request does not exist.");
      }
      const newChat = await Chat.create({
        anonymous: request.anonymous,
        confessee: request.receiver,
      });
      await User.updateMany(
        {
          $or: [{ _id: request.anonymous }, { _id: request.receiver }],
        },
        { activeChat: newChat._id }
      );
      await pubsub.publish(`PROFILE_CHAT_${request.anonymous}`, {
        profileChat: newChat,
      });
      await pubsub.publish(`PROFILE_CHAT_${request.receiver}`, {
        profileChat: newChat,
      });
      return newChat;
    },
    sendMessage: async (_parent, args, _context, _info) => {
      const message = await Message.create(args);
      const updatedChat = await Chat.findByIdAndUpdate(
        args.chat,
        {
          ...(args.anonymous
            ? { anonSeen: true, confesseeSeen: false }
            : { confesseeSeen: true, anonSeen: false }),
        },
        { new: true }
      );
      await pubsub.publish(`${updatedChat._id}_NEW_MESSAGE`, {
        newMessage: message,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.confessee}`, {
        profileChat: updatedChat,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.anonymous}`, {
        profileChat: updatedChat,
      });
      return true;
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
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.confessee}`, {
        profileChat: updatedChat,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.anonymous}`, {
        profileChat: updatedChat,
      });
      return true;
    },
    endChatRequest: async (_parent, args, _context, _info) => {
      const message = await Message.create({
        ...args,
        endRequestMsg: true,
        message: "I would like to end the confession.",
      });
      const updatedChat = await Chat.findByIdAndUpdate(
        args.chat,
        {
          ...(args.anonymous
            ? { anonSeen: true, confesseeSeen: false }
            : { confesseeSeen: true, anonSeen: false }),
        },
        { new: true }
      );
      await pubsub.publish(`${updatedChat._id}_NEW_MESSAGE`, {
        newMessage: message,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.confessee}`, {
        profileChat: updatedChat,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.anonymous}`, {
        profileChat: updatedChat,
      });
      return message;
    },
    rejectEndChat: async (_parent, args, _context, _info) => {
      const message = await Message.create({
        ...args,
        message: "Let's not end this yet.",
      });
      const updatedChat = await Chat.findByIdAndUpdate(
        args.chat,
        {
          ...(args.anonymous
            ? { anonSeen: true, confesseeSeen: false }
            : { confesseeSeen: true, anonSeen: false }),
          $inc: { endAttempts: 1 },
        },
        { new: true }
      );
      await pubsub.publish(`${updatedChat._id}_NEW_MESSAGE`, {
        newMessage: message,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.confessee}`, {
        profileChat: updatedChat,
      });
      await pubsub.publish(`PROFILE_CHAT_${updatedChat.anonymous}`, {
        profileChat: updatedChat,
      });
      return message;
    },
    acceptEndChat: async (_parent, args, _context, _info) => {
      await Chat.findByIdAndUpdate(
        args.chat,
        { chatEnded: true },
        { new: true }
      );
      return true;
    },
    endChat: async (_parent, args, _context, _info) => {
      const deletedChat = await Chat.findByIdAndDelete(args.chat);
      await Message.deleteMany({ chat: deletedChat._id });
      await User.updateMany(
        { activeChat: deletedChat._id },
        { activeChat: null }
      );
      await pubsub.publish(`PROFILE_CHAT_${deletedChat.confessee}`, {
        profileChat: null,
      });
      await pubsub.publish(`PROFILE_CHAT_${deletedChat.anonymous}`, {
        profileChat: null,
      });
      return true;
    },
    seenNotification: async (_parent, args, _context, _info) => {
      await User.updateOne({ _id: args.profileId }, { notifSeen: true });
      await pubsub.publish(`NOTIF_SEEN_${args.profileId}`, { notifSeen: true });
      return true;
    },
    deleteNotification: async (_parent, args, _context, _info) => {
      await Notification.deleteOne({ _id: args.notifID });
      return true;
    },
  },

  Subscription: {
    newMessage: {
      subscribe: (_parent, args, _context, _info) => {
        if (!args.chat) {
          return new UserInputError("Chat does not exist");
        }
        return pubsub.asyncIterator([`${args.chat}_NEW_MESSAGE`]);
      },
    },
    profileChat: {
      subscribe: (_parent, args, _context, _info) => {
        return pubsub.asyncIterator([`PROFILE_CHAT_${args.profileId}`]);
      },
    },
    notifSeen: {
      subscribe: (_parent, args, _context, _info) => {
        return pubsub.asyncIterator([`NOTIF_SEEN_${args.profileId}`]);
      },
    },
  },
};
