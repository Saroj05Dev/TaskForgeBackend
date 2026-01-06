import Task from "../schemas/taskSchema.js";
import User from "../schemas/userSchema.js";
import mongoose from "mongoose";

class TaskRepository {
  async createTask(task) {
    try {
      const newTask = await Task.create(task);
      return newTask;
    } catch (error) {
      console.error("Create task error:", error);

      if (error.code === 11000) {
        const err = new Error("Task with this title already exists");
        err.statusCode = 400;
        throw err;
      }

      const err = new Error(error.message || "Error creating task");
      err.statusCode = 500;
      throw err;
    }
  }

  async findTask(userId) {
    try {
      const task = await Task.find({
        $or: [{ createdBy: userId }, { assignedUser: userId }],
      }).populate("createdBy assignedUser updatedBy", "fullName email");
      return task;
    } catch (error) {
      throw new Error("Error finding task", error);
    }
  }

  async findTaskById(taskId) {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return null;
    }

    try {
      const task = await Task.findById(taskId).populate(
        "createdBy assignedUser updatedBy",
        "fullName email"
      );

      return task;
    } catch (error) {
      console.error("Repo.findTaskById error:", error.message);
      throw error;
    }
  }

  async updateTask(taskId, task) {
    try {
      const updatedTask = await Task.findByIdAndUpdate(taskId, task, {
        new: true,
        runValidators: true,
      });

      if (!updatedTask) {
        console.log("Repo: Task not found during update:", taskId);
        return null;
      }

      return updatedTask;
    } catch (error) {
      console.error("Repo.updateTask error:", error.message);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const deletedTask = await Task.findByIdAndDelete(taskId);
      return deletedTask;
    } catch (error) {
      throw new Error("Error deleting task", error);
    }
  }

  async countActiveTasksForUser(userId) {
    try {
      const count = await Task.countDocuments({
        assignedUser: userId,
        status: { $in: ["Todo", "In Progress"] },
      });
      return count;
    } catch (error) {
      console.log(error);
      throw new Error("Error counting active tasks for user", error);
    }
  }

  async searchAndFilterTasks({ search, priority, status, userId }) {
    try {
      // base restriction: user must be creator or assigned
      const query = {
        $or: [{ createdBy: userId }, { assignedUser: userId }],
      };

      // add search filters
      if (search) {
        query.$and = [
          {
            $or: [
              { title: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ],
          },
        ];
      }

      // add extra filters
      if (priority) query.priority = priority;
      if (status) query.status = status;

      const result = await Task.find(query);
      return result;
    } catch (error) {
      console.error("Repo error:", error);
      error.message = error.message || "Error finding task";
      throw error;
    }
  }

  async countAll(userId) {
    try {
      const totalTasks = await Task.countDocuments({
        $or: [{ createdBy: userId }, { assignedUser: userId }],
      });
      return totalTasks;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findTasksByIds(taskIds) {
    try {
      const tasks = await Task.find({
        _id: { $in: taskIds },
      }).populate("createdBy assignedUser", "fullName email");
      return tasks;
    } catch (error) {
      console.error("Repo.findTasksByIds error:", error.message);
      throw new Error("Error finding tasks by IDs: " + error.message);
    }
  }
}

export default TaskRepository;
