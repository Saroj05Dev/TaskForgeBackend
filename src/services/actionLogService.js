class ActionService {
  constructor(actionRepository, io) {
    this.actionRepository = actionRepository;
    this.io = io;
  }

  async logAndEmit(userId, taskId, actionType, metadata = {}) {
    // 1️ Create action (raw)
    const action = await this.actionRepository.logAction({
      user: userId,
      task: taskId,
      actionType,
      metadata,
    });

    // 2️ Re-fetch populated action
    const populatedAction = await this.actionRepository.findById(action._id);

    // 3️ Emit populated payload
    this.io.emit("actionLogged", populatedAction);

    return populatedAction;
  }

  async getRecentActions(userId) {
    const actions = await this.actionRepository.getRecentActionsForUser(
      userId,
      20
    );

    /**
     * Filter actions so user sees only:
     * - their own actions
     * - actions on tasks they created
     * - actions on tasks assigned to them
     */
    const filteredActions = actions.filter((action) => {
      // Always allow actions performed by the user
      if (action.user?._id?.toString() === userId.toString()) {
        return true;
      }

      // If action has no task (team actions)
      if (!action.task) {
        return false;
      }

      const createdBy = action.task.createdBy?.toString();
      const assignedUser = action.task.assignedUser?.toString();

      return (
        createdBy === userId.toString() || assignedUser === userId.toString()
      );
    });

    return filteredActions;
  }
}

export default ActionService;
