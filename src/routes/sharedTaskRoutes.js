import SharedTaskController from "../controllers/sharedTaskController.js";
import SharedTaskRepository from "../repositories/sharedTaskRepository.js";
import TeamRepository from "../repositories/teamRepository.js";
import TaskRepository from "../repositories/taskRepository.js";
import SharedTaskService from "../services/sharedTaskService.js";
import ActionRepository from "../repositories/actionRepository.js";
import ActionService from "../services/actionLogService.js";
import express from "express";
import { isLoggedIn } from "../validations/authValidator.js";

const createSharedTaskRouter = (io) => {
  const sharedTaskRouter = express.Router();

  // Initialize repositories and services
  const sharedTaskRepository = new SharedTaskRepository();
  const teamRepository = new TeamRepository();
  const taskRepository = new TaskRepository();

  const actionRepository = new ActionRepository();
  const actionService = new ActionService(actionRepository, io);

  const sharedTaskService = new SharedTaskService(
    sharedTaskRepository,
    teamRepository,
    taskRepository,
    actionService,
    io
  );

  const sharedTaskController = new SharedTaskController(sharedTaskService);

  // Routes
  sharedTaskRouter.post("/", isLoggedIn, (req, res) =>
    sharedTaskController.shareTaskWithTeam(req, res)
  );

  sharedTaskRouter.delete("/:taskId/:teamId", isLoggedIn, (req, res) =>
    sharedTaskController.unshareTaskFromTeam(req, res)
  );

  sharedTaskRouter.get("/team/:teamId", isLoggedIn, (req, res) =>
    sharedTaskController.getTeamTasks(req, res)
  );

  sharedTaskRouter.get("/task/:taskId", isLoggedIn, (req, res) =>
    sharedTaskController.getTaskTeams(req, res)
  );

  sharedTaskRouter.patch(
    "/:taskId/:teamId/permissions",
    isLoggedIn,
    (req, res) => sharedTaskController.updatePermissions(req, res)
  );

  return sharedTaskRouter;
};

export default createSharedTaskRouter;
