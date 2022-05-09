import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const ChatSchema = new Schema({
  id: ObjectId,
  anonymous: String,
  confessee: String,
  updatedAt: Number,
  anonSeen: {
    type: Boolean,
    default: false,
  },
  confesseeSeen: {
    type: Boolean,
    default: false,
  },
  expiresIn: {
    type: Date,
    default: DateTime.local().plus({ minutes: 15 }),
  },
});

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
