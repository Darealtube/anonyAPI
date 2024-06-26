import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { DateTime } from "luxon";

const RequestSchema = new Schema({
  id: ObjectId,
  date: {
    type: Date,
    default: DateTime.utc,
  },
  anonymous: ObjectId,
  receiver: ObjectId,
});

export default mongoose.models.Request ||
  mongoose.model("Request", RequestSchema);
