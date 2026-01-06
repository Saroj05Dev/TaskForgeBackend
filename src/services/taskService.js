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

  // Helper method to populate sharedWith field for tasks
  async populateSharedWith(tasks) {
    // Handle single task or array of tasks
    const tasksArray = Array.isArray(tasks) ? tasks : [tasks];

    // Get all task IDs
    const taskIds = tasksArray.map((task) => task._id.toString());

    // Get all shared task entries for these tasks
    const sharedTaskPromises = taskIds.map((taskId) =>
      this.sharedTaskRepository.getTeamsByTask(taskId)
    );
    const sharedTaskResults = await Promise.all(sharedTaskPromises);

    // Create a map of taskId -> sharedWith array
    const sharedWithMap = {};
    taskIds.forEach((taskId, index) => {
      const sharedEntries = sharedTaskResults[index];
      sharedWithMap[taskId] = sharedEntries.map((entry) => ({
        team: {
          _id: entry.team._id,
          name: entry.team.name,
        },
        permissions: entry.permissions,
        sharedBy: entry.sharedBy,
        sharedAt: entry.sharedAt,
      }));
    });

    // Add sharedWith to each task
    const tasksWithShared = tasksArray.map((task) => {
      const taskObj = task.toObject ? task.toObject() : task;
      return {
        ...taskObj,
        sharedWith: sharedWithMap[task._id.toString()] || [],
      };
    });

    // Return single object or array based on input
    return Array.isArray(tasks) ? tasksWithShared : tasksWithShared[0];
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

    // Populate sharedWith information for all tasks
    const tasksWithSharedInfo = await this.populateSharedWith(uniqueTasks);

    return tasksWithSharedInfo;
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
      // Populate sharedWith information
      const taskWithSharedInfo = await this.populateSharedWith(task);
      return taskWithSharedInfo;
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

    // Populate sharedWith information
    const taskWithSharedInfo = await this.populateSharedWith(task);
    return taskWithSharedInfo;
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

  async smartAssign(taskId, userId, teamId) {
    // 1. Validate teamId is provided
    if (!teamId) {
      throw new AppError("teamId is required for smart assignment", 400);
    }

    // 2. Get current task and verify creator
    const currentTask = await this.taskRepository.findTaskById(taskId);
    if (!currentTask) {
      throw new AppError("Task not found", 404);
    }

    const creatorId = currentTask.createdBy._id
      ? currentTask.createdBy._id.toString()
      : currentTask.createdBy.toString();

    if (creatorId !== userId.toString()) {
      throw new AppError("Only the task creator can use smart assign", 403);
    }

    // 3. Verify team exists
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // 4. Verify user is a member of the team
    const isMember = team.members.some(
      (member) => member._id.toString() === userId.toString()
    );
    if (!isMember) {
      throw new AppError(
        "You must be a member of the team to assign tasks to it",
        403
      );
    }

    // 5. Get team members excluding the creator
    const teamMemberIds = team.members
      .map((member) => member._id.toString())
      .filter((memberId) => memberId !== userId.toString());

    // 6. If no team members available, assign to creator
    if (teamMemberIds.length === 0) {
      const updatedTask = await this.taskRepository.updateTask(taskId, {
        assignedUser: userId,
      });

      this.io.emit("taskUpdated", updatedTask);
      await this.actionService.logAndEmit(userId, updatedTask._id, "assigned", {
        assignedTo: "creator (no team members available)",
      });

      return {
        task: updatedTask,
        message: "No team members available. Task assigned to creator.",
      };
    }

    // 7. Count active tasks for each team member
    const memberTaskCounts = await Promise.all(
      teamMemberIds.map(async (memberId) => {
        const count = await this.taskRepository.countActiveTasksForUser(
          memberId
        );
        return { userId: memberId, count: count };
      })
    );

    // 8. Pick team member with the lowest count
    const targetMember = memberTaskCounts.reduce((minUser, currUser) =>
      currUser.count < minUser.count ? currUser : minUser
    );

    // 9. Update the task's assignedUser field
    const updatedTask = await this.taskRepository.updateTask(taskId, {
      assignedUser: targetMember.userId,
    });

    // 10. Emit real-time update
    this.io.emit("taskUpdated", updatedTask);

    // 11. Log the action
    await this.actionService.logAndEmit(userId, updatedTask._id, "assigned", {
      assignedTo: targetMember.userId,
      teamId: teamId,
      activeTaskCount: targetMember.count,
    });

    return {
      task: updatedTask,
      message: `Task assigned to team member with ${targetMember.count} active tasks`,
    };
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
