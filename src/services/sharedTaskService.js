import AppError from "../utils/AppError.js";

class SharedTaskService {
  constructor(
    sharedTaskRepository,
    teamRepository,
    taskRepository,
    actionService,
    io
  ) {
    this.sharedTaskRepository = sharedTaskRepository;
    this.teamRepository = teamRepository;
    this.taskRepository = taskRepository;
    this.actionService = actionService;
    this.io = io;
  }

  async shareTaskWithTeam(taskId, teamId, userId, permissions = "edit") {
    // Verify task exists and user is the creator
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const taskCreatorId =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    if (taskCreatorId !== userId.toString()) {
      throw new AppError("Only the task creator can share this task", 403);
    }

    // Verify team exists
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Check if user is a member of the team
    const isMember = await this.teamRepository.isUserTeamMember(teamId, userId);
    if (!isMember) {
      throw new AppError(
        "You must be a member of the team to share tasks with it",
        403
      );
    }

    // Share the task
    const sharedTask = await this.sharedTaskRepository.shareTaskWithTeam(
      taskId,
      teamId,
      userId,
      permissions
    );

    // Emit Socket.IO event
    this.io.emit("taskShared", {
      taskId,
      teamId,
      sharedBy: userId,
      permissions,
    });

    // Log action
    await this.actionService.logAndEmit(userId, taskId, "shared_with_team", {
      teamName: team.name,
    });

    return sharedTask;
  }

  async unshareTaskFromTeam(taskId, teamId, userId) {
    // Verify task exists and user is the creator
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const taskCreatorId =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    if (taskCreatorId !== userId.toString()) {
      throw new AppError("Only the task creator can unshare this task", 403);
    }

    // Unshare the task
    const result = await this.sharedTaskRepository.unshareTaskFromTeam(
      taskId,
      teamId
    );
    if (!result) {
      throw new AppError("Task is not shared with this team", 404);
    }

    // Emit Socket.IO event
    this.io.emit("taskUnshared", {
      taskId,
      teamId,
    });

    // Log action
    await this.actionService.logAndEmit(userId, taskId, "unshared_from_team");

    return result;
  }

  async getTeamTasks(teamId, userId) {
    // Verify user is a member of the team
    const isMember = await this.teamRepository.isUserTeamMember(teamId, userId);
    if (!isMember) {
      throw new AppError(
        "You must be a member of the team to view its tasks",
        403
      );
    }

    // Get shared tasks
    const sharedTasks = await this.sharedTaskRepository.getTasksByTeam(teamId);

    return sharedTasks;
  }

  async getTaskTeams(taskId, userId) {
    // Verify task exists and user has access
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const taskCreatorId =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    const assignedUserId =
      task.assignedUser?._id?.toString() || task.assignedUser?.toString();

    if (
      taskCreatorId !== userId.toString() &&
      assignedUserId !== userId.toString()
    ) {
      throw new AppError("You don't have access to this task", 403);
    }

    // Get teams this task is shared with
    const sharedTasks = await this.sharedTaskRepository.getTeamsByTask(taskId);

    return sharedTasks;
  }

  async updateSharedTaskPermissions(taskId, teamId, userId, permissions) {
    // Verify task exists and user is the creator
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const taskCreatorId =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    if (taskCreatorId !== userId.toString()) {
      throw new AppError("Only the task creator can update permissions", 403);
    }

    // Update permissions
    const updatedSharedTask =
      await this.sharedTaskRepository.updateSharedTaskPermissions(
        taskId,
        teamId,
        permissions
      );

    if (!updatedSharedTask) {
      throw new AppError("Task is not shared with this team", 404);
    }

    // Emit Socket.IO event
    this.io.emit("taskPermissionsUpdated", {
      taskId,
      teamId,
      permissions,
    });

    return updatedSharedTask;
  }
}

export default SharedTaskService;
