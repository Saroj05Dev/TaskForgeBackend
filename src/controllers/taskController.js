class TaskController {
  constructor(taskService, io) {
    this.taskService = taskService;
    this.io = io;

    this.createTask = this.createTask.bind(this);
    this.findTask = this.findTask.bind(this);
    this.findTaskById = this.findTaskById.bind(this);
    this.updateTask = this.updateTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
    this.smartAssign = this.smartAssign.bind(this);
    this.resolveConflict = this.resolveConflict.bind(this);
    this.searchAndFilterTasks = this.searchAndFilterTasks.bind(this);
    this.countAllTasks = this.countAllTasks.bind(this);
  }

  async createTask(req, res) {
    const task = req.body;
    const userId = req.user.id;
    try {
      const newTask = await this.taskService.createTask(task, userId);
      res.status(200).json({
        success: true,
        message: "Task created successfully",
        data: newTask,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async findTask(req, res) {
    const userId = req.user.id;
    try {
      const tasks = await this.taskService.findTask(userId);
      res.status(200).json({
        success: true,
        message: "Tasks found successfully",
        data: tasks,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async findTaskById(req, res) {
    const taskId = req.params.id;
    const userId = req.user.id;
    try {
      const task = await this.taskService.findTaskById(taskId, userId);
      res.status(200).json({
        success: true,
        message: "Task found successfully",
        data: task,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async updateTask(req, res) {
    const taskId = req.params.id;
    const task = req.body;
    const userId = req.user.id;

    try {
      const updatedTask = await this.taskService.updateTask(
        taskId,
        task,
        userId
      );

      res.status(200).json({
        success: true,
        message: "Task updated successfully",
        data: updatedTask,
        error: {},
      });
    } catch (error) {
      console.error("Controller.updateTask error:", error.message);

      if (error.name === "ConflictError") {
        return res.status(409).json({
          success: false,
          message: error.message,
          data: error.task, // send server version
          error: {},
        });
      }

      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: {},
      });
    }
  }

  async deleteTask(req, res) {
    const taskId = req.params.id;
    const userId = req.user.id;
    try {
      const deletedTask = await this.taskService.deleteTask(taskId, userId);
      res.status(200).json({
        success: true,
        message: "Task deleted successfully",
        data: deletedTask,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async countAllTasks(req, res) {
    const userId = req.user.id;
    try {
      const count = await this.taskService.countTasks(userId);
      res.status(200).json({
        success: true,
        message: "Task count found successfully",
        data: count,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async smartAssign(req, res) {
    const taskId = req.params.id;
    const userId = req.user.id;
    const { teamId } = req.body;

    try {
      // Validate teamId is provided
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: "teamId is required in request body",
          data: {},
          error: "teamId is required",
        });
      }

      const result = await this.taskService.smartAssign(taskId, userId, teamId);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.task,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error.message,
      });
    }
  }

  async resolveConflict(req, res) {
    const taskId = req.params.id;
    const { resolutionType, task } = req.body;
    const userId = req.user.id;

    try {
      const resolvedTask = await this.taskService.resolveConflict(
        taskId,
        userId,
        resolutionType,
        task
      );
      res.status(200).json({
        success: true,
        message: `Conflict resolved via ${resolutionType}`,
        data: resolvedTask,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async searchAndFilterTasks(req, res) {
    const userId = req.user.id;
    try {
      const { search, priority, status, assignedUser, createdBy } = req.query;

      const tasks = await this.taskService.searchAndFilterTasks({
        search,
        priority,
        status,
        assignedUser,
        createdBy,
        userId,
      });

      res.status(200).json({ success: true, data: tasks });
    } catch (error) {
      console.error("Error in searchAndFilterTasks:", error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Error finding task",
      });
    }
  }
}

export default TaskController;
