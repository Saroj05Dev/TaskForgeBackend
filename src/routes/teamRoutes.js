import TeamController from "../controllers/teamController.js";
import TeamRepository from "../repositories/teamRepository.js";
import express from "express";
import { isLoggedIn } from "../validations/authValidator.js";
import TeamService from "../services/TeamService.js";
import ActionRepository from "../repositories/actionRepository.js";
import ActionService from "../services/actionLogService.js";
import UserRepository from "../repositories/userRepository.js";

const createTeamRouter = (io) => {
  const teamRouter = express.Router();

  // Initialize repository and services
  const teamRepository = new TeamRepository();

  const actionRepository = new ActionRepository();
  const actionService = new ActionService(actionRepository, io);

  const userRepository = new UserRepository();
  const teamService = new TeamService(
    teamRepository,
    userRepository,
    actionService,
    io
  );
  const teamController = new TeamController(teamService);

  // Routes
  teamRouter.post("/", isLoggedIn, (req, res) =>
    teamController.createTeam(req, res)
  );

  teamRouter.get("/", isLoggedIn, (req, res) =>
    teamController.getMyTeams(req, res)
  );

  teamRouter.post("/:teamId/invite-member", isLoggedIn, (req, res) =>
    teamController.inviteMember(req, res)
  );

  teamRouter.delete("/:teamId/members/:userId", isLoggedIn, (req, res) =>
    teamController.removeMember(req, res)
  );

  teamRouter.patch("/:teamId", isLoggedIn, (req, res) =>
    teamController.updateTeam(req, res)
  );

  teamRouter.post("/:teamId/leave", isLoggedIn, (req, res) =>
    teamController.leaveTeam(req, res)
  );

  teamRouter.get("/:teamId", isLoggedIn, (req, res) =>
    teamController.getTeamById(req, res)
  );

  return teamRouter;
};

export default createTeamRouter;
