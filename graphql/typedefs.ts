import { gql } from "apollo-server-core";

export const typeDefs = gql`
  type User {
    _id: ID!
    name: String!
    email: String!
    image: String
    cover: String
    bio: String
    status: String
    sentConfessionRequests(limit: Int, after: String): RequestConnection
    receivedConfessionRequests(limit: Int, after: String): RequestConnection
    activeChat: Chat
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
    updatedAt: Float
    messages(limit: Int, after: String): MessageConnection
    latestMessage: Message
    anonSeen: Boolean
    confesseeSeen: Boolean
    expiresAt: Float
  }

  type Message {
    _id: ID!
    chat: ID!
    date: String!
    sender: User
    message: String!
    anonymous: Boolean
    expiresAt: Float
  }

  type MessageConnection {
    totalCount: Int
    pageInfo: PageInfo
    edges: [MessageEdge]
  }

  type MessageEdge {
    node: Message
  }

  type PageInfo {
    endCursor: ID
    hasNextPage: Boolean
  }

  type Query {
    getUser(name: String!): User
    searchUser(key: String): [User]
    getUserActiveChat(name: String!): Chat
  }

  type Mutation {
    createUser(name: String, email: String): Boolean
    createUniqueTag(userId: ID!, name: String!): Boolean
    sendConfessionRequest(anonymous: String!, receiver: String!): Request
    rejectConfessionRequest(requestID: ID!): Boolean
    acceptConfessionRequest(requestID: ID!): Chat
    sendMessage(
      chat: ID!
      sender: String!
      message: String!
      anonymous: Boolean!
    ): Message
    seenChat(person: String!, chat: ID!): Boolean
    endChat(chat: ID!): Boolean
    editUser(
      originalName: String!
      name: String!
      image: String
      cover: String
      bio: String
      status: String
    ): Boolean
  }

  type Subscription {
    newMessage: Message
    seenChat: Chat
  }
`;
