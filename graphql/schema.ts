import { typeDefs } from "./typedefs";
import { resolvers } from "./resolvers";
import { makeExecutableSchema } from "@graphql-tools/schema";

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
