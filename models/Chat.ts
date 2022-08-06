import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const expiryDate = () => {
  return DateTime.utc().plus({ days: 2 });
};

const ChatSchema = new Schema({
  id: ObjectId,
  anonymous: ObjectId,
  confessee: ObjectId,
  endAttempts: Number,
  expireChatAt: {
    type: Date,
    default: expiryDate,
  },
  chatEnded: {
    type: Boolean,
    default: false,
  },
  anonSeen: {
    type: Boolean,
    default: false,
  },
  confesseeSeen: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.models.Chat || mongoose.model("Chat", ChatSchema);
