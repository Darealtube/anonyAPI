import { MongoClient } from "mongodb";
import mongoose from "mongoose";

type mongooseConnection = {
  conn: typeof mongoose | null;
  promise: Promise<any> | null;
};

declare global {
  namespace NodeJS {
    interface Global {
      mongoose: mongooseConnection;
      _mongoClientPromise: Promise<MongoClient>;
    }
  }
}

const MONGODB_URI =
  "mongodb+srv://New_John_Doe:tk9YLFaCL1PHxYRu@cluster0.kkxjp.mongodb.net/AnonyLove?retryWrites=true&w=majority";

if (!MONGODB_URI) {
  console.log(process.env.MONGODB_URI);
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const dbConnect = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

export default dbConnect;
