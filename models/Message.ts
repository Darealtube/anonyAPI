import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const MessageSchema = new Schema({
  id: ObjectId,
  chat: ObjectId,
  sender: String,
  message: String,
  anonymous: Boolean,
  date: {
    type: Date,
    default: DateTime.utc,
  },
});

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);
