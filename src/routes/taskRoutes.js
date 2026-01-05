import express from "express";
import { isLoggedIn } from "../validations/authValidator.js";
import TaskRepository from "../repositories/taskRepository.js";
import TaskController from "../controllers/taskController.js";
import TaskService from "../services/taskService.js";
import ActionRepository from "../repositories/actionRepository.js";
import ActionService from "../services/actionLogService.js";
import UserRepository from "../repositories/userRepository.js";
import SharedTaskRepository from "../repositories/sharedTaskRepository.js";
import TeamRepository from "../repositories/teamRepository.js";

const createTaskRouter = (io) => {
  const taskRouter = express.Router();

  const taskRepository = new TaskRepository();
  const actionRepository = new ActionRepository();
  const userRepository = new UserRepository();
  const sharedTaskRepository = new SharedTaskRepository();
  const teamRepository = new TeamRepository();
  const actionService = new ActionService(actionRepository, io);
  const taskService = new TaskService(
    taskRepository,
    actionService,
    userRepository,
    sharedTaskRepository,
    teamRepository,
    io
  );
  const taskController = new TaskController(taskService, io);

  // CRUD root routes
  taskRouter.post("/", isLoggedIn, taskController.createTask); // Create
  taskRouter.get("/", isLoggedIn, taskController.findTask); // Get all
  taskRouter.get("/count", isLoggedIn, taskController.countAllTasks);

  // Static / special routes
  taskRouter.get("/search", isLoggedIn, taskController.searchAndFilterTasks);
  taskRouter.put("/:id/smart-assign", isLoggedIn, taskController.smartAssign);
  taskRouter.post(
    "/:id/resolve-conflict",
    isLoggedIn,
    taskController.resolveConflict
  );

  // Dynamic id-based routes (must be last)
  taskRouter.put("/:id", isLoggedIn, taskController.updateTask);
  taskRouter.delete("/:id", isLoggedIn, taskController.deleteTask);
  taskRouter.get("/:id", isLoggedIn, taskController.findTaskById);

  return taskRouter;
};

export default createTaskRouter;
