import mongoose from "mongoose";

const actionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false, // make it false to be worked with quick actions
    },

    actionType: {
      type: String,
      enum: [
        "created",
        "updated",
        "deleted",
        "assigned",
        "moved",
        "attachment_added",
        "attachment_deleted",
        "comment_added",
        "comment_deleted",
        "subtask_added",
        "subtask_updated",
        "subtask_deleted",
        "team_created",
        "team_updated",
        "member_invited",
        "member_removed",
        "left_team",
        "shared_with_team",
        "unshared_from_team",
        "conflict_resolved",
      ],
      required: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { type: Date, default: Date.now },
  }
);

const Action = mongoose.model("Action", actionSchema);

export default Action;
