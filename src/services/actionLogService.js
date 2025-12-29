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

  async getRecentActions() {
    return await this.actionRepository.getRecentActions();
  }
}

export default ActionService;
