import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";

const ChatSchema = new Schema({
  id: ObjectId,
  anonymous: String,
  confessee: String,
  updatedAt: Number,
  anonLastSeen: Number,
  confesseeLastSeen: Number,
});

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
