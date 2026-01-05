import mongoose from "mongoose";

const sharedTaskSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      type: String,
      enum: ["view", "edit", "full"],
      default: "edit",
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate shares and optimize queries
sharedTaskSchema.index({ team: 1, task: 1 }, { unique: true });

// Index for fast lookup of tasks shared with a team
sharedTaskSchema.index({ team: 1 });

// Index for fast lookup of teams a task is shared with
sharedTaskSchema.index({ task: 1 });

const SharedTask = mongoose.model("SharedTask", sharedTaskSchema);

export default SharedTask;
