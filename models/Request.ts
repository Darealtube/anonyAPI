import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const RequestSchema = new Schema({
  id: ObjectId,
  date: {
    type: Date,
    default: DateTime.local,
  },
  anonymous: String,
  receiver: String,
});

export default mongoose.models.Request ||
  mongoose.model("Request", RequestSchema);
