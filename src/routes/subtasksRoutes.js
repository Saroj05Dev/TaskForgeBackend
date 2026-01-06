import express from "express";
import SubTaskRepository from "../repositories/subtasksRepository.js";
import SubTaskService from "../services/subtasksService.js";
import ActionRepository from "../repositories/actionRepository.js";
import ActionService from "../services/actionLogService.js";
import SubTaskController from "../controllers/subtasksController.js";
import { isLoggedIn } from "../validations/authValidator.js";
import TaskRepository from "../repositories/taskRepository.js";
import TeamRepository from "../repositories/teamRepository.js";
import SharedTaskRepository from "../repositories/sharedTaskRepository.js";
import TaskAuthorizationHelper from "../utils/authorizationHelper.js";

const createSubTaskRouter = (io) => {
  const subtaskRouter = express.Router();

  const subtaskRepository = new SubTaskRepository();
  const taskRepository = new TaskRepository();
  const actionRepository = new ActionRepository();
  const teamRepository = new TeamRepository();
  const sharedTaskRepository = new SharedTaskRepository();

  const actionService = new ActionService(actionRepository, io);
  const authHelper = new TaskAuthorizationHelper(
    teamRepository,
    sharedTaskRepository
  );
  const subtaskService = new SubTaskService(
    subtaskRepository,
    taskRepository,
    actionService,
    authHelper,
    io
  );
  const subtaskController = new SubTaskController(subtaskService);

  // Routes
  subtaskRouter.post("/:taskId", isLoggedIn, subtaskController.createSubTask);
  subtaskRouter.put("/:subtaskId", isLoggedIn, subtaskController.updateSubTask);
  subtaskRouter.delete(
    "/:subtaskId",
    isLoggedIn,
    subtaskController.deleteSubTask
  );
  subtaskRouter.get("/:taskId", isLoggedIn, subtaskController.listSubtasks);

  return subtaskRouter;
};

export default createSubTaskRouter;
