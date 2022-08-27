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
  expireChatAt: {
    type: Date,
    default: expiryDate,
  },
  status: {
    endAttempts: {
      type: Number,
      default: 0,
    },
    chatEnded: {
      type: Boolean,
      default: false,
    },
    endRequesting: {
      type: Boolean,
      default: false,
    },
    endRequester: {
      type: ObjectId,
      default: null,
    },
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
