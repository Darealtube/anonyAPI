import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";

const ChatSchema = new Schema({
  id: ObjectId,
  anonymous: ObjectId,
  confessee: ObjectId,
  endAttempts: Number,
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
