import { gql } from "apollo-server-core";

export const typeDefs = gql`
  type User {
    _id: ID!
    name: String!
    email: String
    image: String
    cover: String
    bio: String
    status: String
    activeChat: Chat
    notifSeen: Boolean
    sentConfessionRequests(limit: Int, after: String): RequestConnection
    receivedConfessionRequests(limit: Int, after: String): RequestConnection
    userSentRequest(from: ID!): Boolean
    userNotifications(limit: Int, after: String): NotificationConnection
  }

  type Request {
    _id: ID!
    anonymous: User!
    receiver: User!
    date: String
  }

  type RequestConnection {
    totalCount: Int
    pageInfo: PageInfo
    edges: [RequestEdge]
  }

  type RequestEdge {
    node: Request
  }

  type Chat {
    _id: ID!
    anonymous: User!
    confessee: User!
    messages(limit: Int, after: String): MessageConnection
    latestMessage: Message
    anonSeen: Boolean
    confesseeSeen: Boolean
    chatEnded: Boolean
    expireChatAt: Float
    endAttempts: Int
  }

  type Message {
    _id: ID!
    chat: ID!
    date: String!
    sender: User
    message: String!
    anonymous: Boolean
    endRequestMsg: Boolean!
  }

  type MessageConnection {
    totalCount: Int
    pageInfo: PageInfo
    edges: [MessageEdge]
  }

  type MessageEdge {
    node: Message
  }

  type Notification {
    _id: ID!
    date: String!
    receiver: User
  }

  type NotificationConnection {
    totalCount: Int
    pageInfo: PageInfo
    edges: [NotificationEdge]
  }

  type NotificationEdge {
    node: Notification
  }

  type PageInfo {
    endCursor: ID
    hasNextPage: Boolean
  }

  type Query {
    getUser(name: String!): User
    getProfile(profileId: ID!): User
    searchUser(key: String): [User]
    getProfileActiveChat(profileId: ID!): Chat
  }

  type Mutation {
    createUser(name: String, email: String): Boolean
    createUniqueTag(userId: ID!, name: String!): Boolean
    sendConfessionRequest(anonymous: ID!, receiver: ID!): Request
    rejectConfessionRequest(requestID: ID!): ID
    acceptConfessionRequest(requestID: ID!): Chat
    sendMessage(
      chat: ID!
      sender: ID!
      message: String!
      anonymous: Boolean!
    ): Boolean
    seenChat(person: String!, chat: ID!): Boolean
    endChatRequest(chat: ID!, sender: ID!, anonymous: Boolean!): Message
    acceptEndChat(chat: ID!): Boolean
    rejectEndChat(chat: ID!, sender: ID!, anonymous: Boolean!): Message
    endChat(chat: ID!): Boolean
    editUser(
      profileId: ID!
      name: String!
      image: String
      cover: String
      bio: String
      status: String
    ): Boolean
    seenNotification(profileId: ID!): Boolean
    deleteNotification(notifID: ID!): Boolean
  }

  type Subscription {
    newMessage(chat: ID!): Message
    notifSeen(profileId: ID!): Boolean
    profileChat(profileId: ID!): Chat
    activeChatEnded(chatId: ID!): Boolean
  }
`;
