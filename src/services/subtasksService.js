class SubTaskService {
  constructor(
    subtaskRepository,
    taskRepository,
    actionService,
    authHelper,
    io
  ) {
    this.subtaskRepository = subtaskRepository;
    this.taskRepository = taskRepository;
    this.actionService = actionService;
    this.authHelper = authHelper;
    this.io = io;
  }

  async createSubTask(taskId, subtask, userId) {
    // First check if the user has access to the parent task
    const parentTask = await this.taskRepository.findTaskById(taskId);
    if (!parentTask) {
      const error = new Error("Parent task not found.");
      error.statusCode = 404;
      throw error;
    }

    // Check if the user is authorized to create a subtask (needs edit permission)
    await this.authHelper.requirePermission(taskId, userId, parentTask, "edit");

    const created = await this.subtaskRepository.createSubTask({
      ...subtask,
      parentTask: taskId,
      createdBy: userId,
    });

    // Real-time emit
    this.io.emit("subtaskCreated", created);

    // Action log
    this.actionService.logAndEmit(userId, created._id, "subtask_added", {
      subtaskTitle: subtask.title,
    });

    return created;
  }

  async updateSubTask(subtaskId, subtask, userId) {
    const currentSubtask = await this.subtaskRepository.findSubTaskById(
      subtaskId
    );

    if (!currentSubtask) {
      const err = new Error("Subtask not found");
      err.statusCode = 404;
      throw err;
    }

    const parentTask = await this.taskRepository.findTaskById(
      currentSubtask.parentTask
    );
    if (!parentTask) {
      const error = new Error("Parent task not found.");
      error.statusCode = 404;
      throw error;
    }

    // User needs edit permission on parent task
    await this.authHelper.requirePermission(
      currentSubtask.parentTask,
      userId,
      parentTask,
      "edit"
    );

    const updated = await this.subtaskRepository.updateSubTask(
      subtaskId,
      subtask
    );

    this.io.emit("subtaskUpdated", updated);
    await this.actionService.logAndEmit(
      userId,
      updated.parentTask,
      "subtask_updated"
    );

    return updated;
  }

  async deleteSubTasks(subtaskId, userId) {
    const currentSubtask = await this.subtaskRepository.findSubTaskById(
      subtaskId
    );

    if (!currentSubtask) {
      const err = new Error("Subtask not found");
      err.statusCode = 404;
      throw err;
    }

    const parentTask = await this.taskRepository.findTaskById(
      currentSubtask.parentTask
    );
    if (!parentTask) {
      const error = new Error("Parent task not found.");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check
    const isSubtaskCreator =
      currentSubtask.createdBy.toString() === userId.toString();

    if (isSubtaskCreator) {
      // Subtask creator can delete their own subtask with edit permission
      await this.authHelper.requirePermission(
        currentSubtask.parentTask,
        userId,
        parentTask,
        "edit"
      );
    } else {
      // Non-creators need full permission to delete others' subtasks
      await this.authHelper.requirePermission(
        currentSubtask.parentTask,
        userId,
        parentTask,
        "delete"
      );
    }

    const deleted = await this.subtaskRepository.deleteSubTask(subtaskId);

    this.io.emit("subtaskDeleted", deleted);
    await this.actionService.logAndEmit(
      userId,
      deleted.parentTask,
      "subtask_deleted"
    );

    return deleted;
  }

  async listSubtasks(taskId, userId) {
    // 1. First check if the user has access to the parent task
    const parentTask = await this.taskRepository.findTaskById(taskId);
    if (!parentTask) {
      const err = new Error(
        "Parent task not found or you are not authorized to view it."
      );
      err.statusCode = 404;
      throw err;
    }

    // 2. Check if the user is authorized to view the subtasks (needs view permission)
    await this.authHelper.requirePermission(taskId, userId, parentTask, "view");

    // 3. If authorized, then list the subtasks
    return await this.subtaskRepository.getSubTasksByTaskId(taskId);
  }
}

export default SubTaskService;
