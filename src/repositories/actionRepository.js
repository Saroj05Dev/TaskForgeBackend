import Action from "../schemas/ActionLogSchema.js";

class ActionRepository {
  async logAction(data) {
    try {
      const action = await Action.create(data);
      if (!action) {
        throw new Error("Error logging action");
      }
      return action;
    } catch (error) {
      console.error("Error in logAction", error);
      throw error;
    }
  }

  async getRecentActionsForUser(userId, limit = 20) {
    try {
      const actions = await Action.find({
        $or: [
          { user: userId }, // user performed the action

          // task-based access
          {
            task: {
              $ne: null,
            },
          },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("user", "fullName email")
        .populate({
          path: "task",
          select: "title createdBy assignedUser",
        })
        .lean();
      return actions;
    } catch (error) {
      console.error(error);
      throw new Error("Error getting recent actions");
    }
  }

  async findById(id) {
    return Action.findById(id)
      .populate("user", "fullName email")
      .populate("task", "title");
  }
}

export default ActionRepository;
