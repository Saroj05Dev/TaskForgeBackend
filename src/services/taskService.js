import AppError from "../utils/AppError.js";

class TaskService {
  constructor(
    taskRepository,
    actionService,
    userRepository,
    sharedTaskRepository,
    teamRepository,
    io
  ) {
    this.taskRepository = taskRepository;
    this.actionService = actionService;
    this.userRepository = userRepository;
    this.sharedTaskRepository = sharedTaskRepository;
    this.teamRepository = teamRepository;
    this.io = io;
  }

  async createTask(task, userId) {
    const newTask = await this.taskRepository.createTask({
      ...task,
      createdBy: userId,
    });
    // Real time task emit
    this.io.emit("taskCreated", newTask);

    // Log the action
    await this.actionService.logAndEmit(userId, newTask._id, "created");

    return newTask;
  }

  async findTask(userId) {
    // Get personal tasks (created by or assigned to user)
    const personalTasks = await this.taskRepository.findTask(userId);

    // Get user's teams
    const userTeams = await this.teamRepository.getTeamsByUser(userId);
    const teamIds = userTeams.map((team) => team._id);

    // Get all task IDs shared with user's teams
    let sharedTaskIds = [];
    for (const teamId of teamIds) {
      const teamTaskIds = await this.sharedTaskRepository.getTaskIdsByTeam(
        teamId
      );
      sharedTaskIds = sharedTaskIds.concat(teamTaskIds);
    }

    // Get shared tasks
    let sharedTasks = [];
    if (sharedTaskIds.length > 0) {
      sharedTasks = await this.taskRepository.findTasksByIds(sharedTaskIds);
    }

    // Merge and remove duplicates
    const allTasks = [...personalTasks, ...sharedTasks];
    const uniqueTasks = allTasks.filter(
      (task, index, self) =>
        index ===
        self.findIndex((t) => t._id.toString() === task._id.toString())
    );

    return uniqueTasks;
  }

  async findTaskById(taskId, userId) {
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Check if user has access to this task
    const taskCreatorId =
      task.createdBy?._id?.toString() || task.createdBy?.toString();
    const assignedUserId =
      task.assignedUser?._id?.toString() || task.assignedUser?.toString();

    // User is creator or assigned user
    if (
      taskCreatorId === userId.toString() ||
      assignedUserId === userId.toString()
    ) {
      return task;
    }

    // Check if task is shared with any of user's teams
    const userTeams = await this.teamRepository.getTeamsByUser(userId);
    const teamIds = userTeams.map((team) => team._id.toString());

    const taskTeams = await this.sharedTaskRepository.getTeamsByTask(taskId);
    const sharedTeamIds = taskTeams.map((st) => st.team._id.toString());

    const hasTeamAccess = teamIds.some((teamId) =>
      sharedTeamIds.includes(teamId)
    );

    if (!hasTeamAccess) {
      throw new AppError("You are not authorized to view this task", 403);
    }

    return task;
  }

  // taskService.js
  async updateTask(taskId, task, userId) {
    // Get current task from DB
    const currentTask = await this.taskRepository.findTaskById(taskId);

    if (!currentTask) {
      throw new AppError("Task not found!", 404);
    }

    // Ownership check (check ObjectId correctly)
    const createdById = currentTask.createdBy?._id?.toString();
    const assignedUserId = currentTask.assignedUser?._id?.toString();

    // Check if user is creator or assigned user (full access)
    let hasEditAccess =
      createdById === String(userId) || assignedUserId === String(userId);

    // If not owner/assigned, check team permissions
    if (!hasEditAccess) {
      const userTeams = await this.teamRepository.getTeamsByUser(userId);
      const teamIds = userTeams.map((team) => team._id.toString());

      const taskTeams = await this.sharedTaskRepository.getTeamsByTask(taskId);

      // Check if user has edit or full permission through any team
      for (const sharedTask of taskTeams) {
        const teamId = sharedTask.team._id.toString();
        if (teamIds.includes(teamId)) {
          // User is in this team, check permission level
          if (
            sharedTask.permissions === "edit" ||
            sharedTask.permissions === "full"
          ) {
            hasEditAccess = true;
            break;
          } else if (sharedTask.permissions === "view") {
            throw new AppError(
              "You have view-only access to this task. Cannot edit.",
              403
            );
          }
        }
      }
    }

    if (!hasEditAccess) {
      throw new AppError("You are not authorized to update this task.", 403);
    }

    // Conflict detection
    if (
      task.lastModified &&
      new Date(task.lastModified) < new Date(currentTask.lastModified) &&
      currentTask.updatedBy?.toString() !== userId.toString()
    ) {
      const error = new Error(
        "Conflict detected, task has been modified by another user."
      );
      error.name = "ConflictError";
      error.task = currentTask;
      throw error;
    }

    // Update task
    const updatedTask = await this.taskRepository.updateTask(taskId, {
      ...task,
      lastModified: Date.now(),
      updatedBy: userId,
    });

    if (!updatedTask) {
      throw new AppError("Task not found during update", 404);
    }

    // Emit real-time update
    this.io.emit("taskUpdated", updatedTask);

    // Log action
    await this.actionService.logAndEmit(userId, updatedTask._id, "updated");

    return updatedTask;
  }

  async deleteTask(taskId, userId) {
    const currentTask = await this.taskRepository.findTaskById(taskId);

    if (!currentTask) {
      throw new AppError("Task not found", 404);
    }

    // Ownership check (check ObjectId correctly)
    const createdById = currentTask.createdBy?._id?.toString();
    const assignedUserId = currentTask.assignedUser?._id?.toString();

    // Check if user is creator or assigned user (full access)
    let hasDeleteAccess =
      createdById === String(userId) || assignedUserId === String(userId);

    // If not owner/assigned, check team permissions
    if (!hasDeleteAccess) {
      const userTeams = await this.teamRepository.getTeamsByUser(userId);
      const teamIds = userTeams.map((team) => team._id.toString());

      const taskTeams = await this.sharedTaskRepository.getTeamsByTask(taskId);

      // Check if user has 'full' permission on any shared team
      let hasTeamAccess = false;
      for (const sharedTask of taskTeams) {
        const teamId = sharedTask.team._id.toString();
        if (teamIds.includes(teamId)) {
          hasTeamAccess = true;
          if (sharedTask.permissions === "full") {
            hasDeleteAccess = true;
            break;
          } else {
            // User has access but not full permission
            throw new AppError(
              `You have ${sharedTask.permissions} access. Only users with 'full' permission can delete this task.`,
              403
            );
          }
        }
      }

      if (!hasTeamAccess) {
        throw new AppError("You are not authorized to delete this task.", 403);
      }
    }

    if (!hasDeleteAccess) {
      throw new AppError("You are not authorized to delete this task.", 403);
    }

    const deletedTask = await this.taskRepository.deleteTask(taskId);

    this.io.emit("taskDeleted", deletedTask);
    await this.actionService.logAndEmit(userId, deletedTask._id, "deleted");

    return deletedTask;
  }

  async countTasks(userId) {
    return this.taskRepository.countAll(userId);
  }

  async smartAssign(taskId, userId) {
    // 1. Find all users
    const users = await this.userRepository.getAllUsers();

    const currentTask = await this.taskRepository.findTaskById(taskId);
    const creatorId = currentTask.createdBy._id
      ? currentTask.createdBy._id.toString()
      : currentTask.createdBy.toString();

    if (creatorId !== userId.toString()) {
      throw new AppError("Only the creator can assign this task.", 403);
    }

    // 2. Count active tasks for each user
    const userTaskCounts = await Promise.all(
      users.map(async (user) => {
        const count = await this.taskRepository.countActiveTasksForUser(
          user._id
        );
        return { userId: user._id, count: count };
      })
    );

    // 3. Pick user with the lowest count
    const targetUser = userTaskCounts.reduce((minUser, currUser) =>
      currUser.count < minUser.count ? currUser : minUser
    );

    // 4. Update the task's assignedTo field
    const updatedTask = await this.taskRepository.updateTask(taskId, {
      assignedUser: targetUser.userId,
    });

    // 5. Emit real-time update
    this.io.emit("taskUpdated", updatedTask);

    // 6. Log the action
    await this.actionService.logAndEmit(
      userId, // the user whod triggered smart assign
      updatedTask._id, // the task id
      "assigned" // the action type
    );

    return updatedTask;
  }

  async resolveConflict(taskId, userId, resolutionType, clientTask) {
    // Resolution type merge | overwrite

    const currentTask = await this.taskRepository.findTaskById(taskId);
    if (!currentTask) {
      throw new AppError("Task not found", 404);
    }

    const createdById =
      currentTask.createdBy?._id?.toString() ||
      currentTask.createdBy?.toString();
    const assignedUserId =
      currentTask.assignedUser?._id?.toString() ||
      currentTask.assignedUser?.toString();

    if (
      createdById !== userId.toString() &&
      assignedUserId !== userId.toString()
    ) {
      throw new AppError(
        "You are not authorized to resolve this conflict.",
        403
      );
    }

    let updatedData;

    if (resolutionType === "overwrite") {
      updatedData = {
        ...clientTask,
        lastModified: Date.now(),
      };
    } else if (resolutionType === "merge") {
      updatedData = {
        ...currentTask.toObject(),
        ...clientTask, // client changes overwrite fields
        lastModified: Date.now(),
      };
    } else {
      throw new AppError("Invalid resolution type", 400);
    }

    const updatedTask = await this.taskRepository.updateTask(
      taskId,
      updatedData
    );

    this.io.emit("taskUpdated", updatedTask);

    await this.actionService.logAndEmit(userId, updatedTask._id, "updated");

    return updatedTask;
  }

  async searchAndFilterTasks(filters) {
    return await this.taskRepository.searchAndFilterTasks(filters);
  }
}

export default TaskService;
