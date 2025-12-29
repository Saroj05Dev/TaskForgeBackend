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

  async getRecentActions(limit = 20) {
    try {
      const actions = await Action.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("user", "fullName email")
        .populate("task", "title")
        .lean(); // return plain objects
      return actions;
    } catch (error) {
      console.log(error);
      throw new Error("Error getting recent actions", error);
    }
  }

  async findById(id) {
    return Action.findById(id)
      .populate("user", "fullName email")
      .populate("task", "title");
  }
}

export default ActionRepository;
