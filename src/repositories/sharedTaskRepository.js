import SharedTask from "../schemas/sharedTaskSchema.js";

class SharedTaskRepository {
  async shareTaskWithTeam(taskId, teamId, userId, permissions = "edit") {
    try {
      const sharedTask = await SharedTask.create({
        task: taskId,
        team: teamId,
        sharedBy: userId,
        permissions,
      });
      return sharedTask;
    } catch (error) {
      // Handle duplicate key error
      if (error.code === 11000) {
        throw new Error("Task is already shared with this team");
      }
      throw new Error("Error sharing task: " + error.message);
    }
  }

  async unshareTaskFromTeam(taskId, teamId) {
    try {
      const result = await SharedTask.findOneAndDelete({
        task: taskId,
        team: teamId,
      });
      return result;
    } catch (error) {
      throw new Error("Error unsharing task: " + error.message);
    }
  }

  async getTasksByTeam(teamId) {
    try {
      const sharedTasks = await SharedTask.find({ team: teamId })
        .populate("task")
        .populate("sharedBy", "fullName email");
      return sharedTasks;
    } catch (error) {
      throw new Error("Error fetching team tasks: " + error.message);
    }
  }

  async getTeamsByTask(taskId) {
    try {
      const sharedTasks = await SharedTask.find({ task: taskId })
        .populate("team")
        .populate("sharedBy", "fullName email");
      return sharedTasks;
    } catch (error) {
      throw new Error("Error fetching task teams: " + error.message);
    }
  }

  async isTaskSharedWithTeam(taskId, teamId) {
    try {
      const sharedTask = await SharedTask.findOne({
        task: taskId,
        team: teamId,
      });
      return !!sharedTask;
    } catch (error) {
      throw new Error("Error checking task share status: " + error.message);
    }
  }

  async getSharedTaskPermissions(taskId, teamId) {
    try {
      const sharedTask = await SharedTask.findOne({
        task: taskId,
        team: teamId,
      });
      return sharedTask ? sharedTask.permissions : null;
    } catch (error) {
      throw new Error("Error fetching permissions: " + error.message);
    }
  }

  async updateSharedTaskPermissions(taskId, teamId, permissions) {
    try {
      const updatedSharedTask = await SharedTask.findOneAndUpdate(
        { task: taskId, team: teamId },
        { permissions },
        { new: true }
      );
      return updatedSharedTask;
    } catch (error) {
      throw new Error("Error updating permissions: " + error.message);
    }
  }

  async getTaskIdsByTeam(teamId) {
    try {
      const sharedTasks = await SharedTask.find({ team: teamId }).select(
        "task"
      );
      return sharedTasks.map((st) => st.task);
    } catch (error) {
      throw new Error("Error fetching task IDs: " + error.message);
    }
  }
}

export default SharedTaskRepository;
