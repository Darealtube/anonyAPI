import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const NotificationSchema = new Schema({
  id: ObjectId,
  date: {
    type: Date,
    default: DateTime.local,
  },
  receiver: String,
});

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
