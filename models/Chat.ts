import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";

const ChatSchema = new Schema({
  id: ObjectId,
  anonymous: String,
  confessee: String,
  updatedAt: Number,
  anonSeen: Boolean,
  confesseeSeen: Boolean,
});

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
