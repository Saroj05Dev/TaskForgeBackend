import AppError from "./AppError.js";

class TaskAuthorizationHelper {
  constructor(teamRepository, sharedTaskRepository) {
    this.teamRepository = teamRepository;
    this.sharedTaskRepository = sharedTaskRepository;
  }

  /**
   * Check if user can perform action on task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @param {Object} task - Task object (with createdBy, assignedUser)
   * @param {string} action - 'view' | 'edit' | 'delete'
   * @returns {Promise<boolean>}
   */
  async canPerformAction(taskId, userId, task, action) {
    // 1. Creator or assigned user = Full access
    const createdById =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    const assignedUserId =
      task.assignedUser?._id?.toString() || task.assignedUser?.toString();

    if (
      createdById === userId.toString() ||
      assignedUserId === userId.toString()
    ) {
      return true;
    }

    // 2. Check team-based access
    const userTeams = await this.teamRepository.getTeamsByUser(userId);
    const teamIds = userTeams.map((team) => team._id.toString());

    const taskTeams = await this.sharedTaskRepository.getTeamsByTask(taskId);

    for (const sharedTask of taskTeams) {
      const teamId = sharedTask.team._id.toString();

      if (teamIds.includes(teamId)) {
        // User is in this team, check permission level
        const permission = sharedTask.permissions;

        if (action === "view") {
          return true; // All permissions allow view
        }

        if (action === "edit" && ["edit", "full"].includes(permission)) {
          return true;
        }

        if (action === "delete" && permission === "full") {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get user's permission level for a task
   * @returns {Promise<'owner' | 'full' | 'edit' | 'view' | null>}
   */
  async getPermissionLevel(taskId, userId, task) {
    const createdById =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    const assignedUserId =
      task.assignedUser?._id?.toString() || task.assignedUser?.toString();

    if (
      createdById === userId.toString() ||
      assignedUserId === userId.toString()
    ) {
      return "owner";
    }

    const userTeams = await this.teamRepository.getTeamsByUser(userId);
    const teamIds = userTeams.map((team) => team._id.toString());
    const taskTeams = await this.sharedTaskRepository.getTeamsByTask(taskId);

    let highestPermission = null;

    for (const sharedTask of taskTeams) {
      if (teamIds.includes(sharedTask.team._id.toString())) {
        const permission = sharedTask.permissions;

        // Return highest permission found
        if (permission === "full") return "full";
        if (permission === "edit" && highestPermission !== "full") {
          highestPermission = "edit";
        }
        if (permission === "view" && !highestPermission) {
          highestPermission = "view";
        }
      }
    }

    return highestPermission;
  }

  /**
   * Throw error if user cannot perform action
   * @throws {AppError}
   */
  async requirePermission(taskId, userId, task, action) {
    const canPerform = await this.canPerformAction(
      taskId,
      userId,
      task,
      action
    );

    if (!canPerform) {
      const permissionLevel = await this.getPermissionLevel(
        taskId,
        userId,
        task
      );

      if (!permissionLevel) {
        throw new AppError("You are not authorized to access this task.", 403);
      }

      if (action === "edit") {
        throw new AppError(
          `You have ${permissionLevel} permission. Edit or full permission required.`,
          403
        );
      }

      if (action === "delete") {
        throw new AppError(
          `You have ${permissionLevel} permission. Full permission required to delete.`,
          403
        );
      }
    }
  }
}

export default TaskAuthorizationHelper;
