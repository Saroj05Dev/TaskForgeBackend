import AppError from "../utils/AppError.js";

class TeamService {
  constructor(teamRepository, userRepository, actionService, io) {
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.actionService = actionService;
    this.io = io;
  }

  async createTeam(userId, name, description) {
    const teamData = {
      name,
      description,
      createdBy: userId,
      members: [userId],
    };
    const newTeam = await this.teamRepository.createTeam(teamData);
    await this.actionService.logAndEmit(userId, null, "team_created", {
      teamName: name,
    });
    this.io.emit("teamCreated", newTeam);
    return newTeam;
  }

  async inviteMember(teamId, inviterId, email) {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    if (team.createdBy.toString() !== inviterId.toString()) {
      throw new AppError(
        "You are not authorized to invite members to this team.",
        403
      );
    }

    const user = await this.userRepository.findUser({ email: email });
    if (!user) {
      throw new AppError("User with this email doesn't exist", 404);
    }

    const updatedTeam = await this.teamRepository.addMemberToTeam(
      teamId,
      user._id
    );

    // Fetch user details for event
    const inviter = await this.userRepository.findUserById(inviterId);
    const invitedUser = await this.userRepository.findUserById(user._id);

    // Emit with correct structure
    this.io.emit("memberInvited", {
      teamId: teamId,
      member: {
        user: {
          _id: user._id,
          fullName: invitedUser?.fullName || "Unknown",
          email: invitedUser?.email || email,
        },
        permission: "edit", // Default permission
      },
      invitedBy: {
        _id: inviterId,
        fullName: inviter?.fullName || "Unknown",
        email: inviter?.email || "unknown@example.com",
      },
    });

    await this.actionService.logAndEmit(inviterId, null, "member_invited", {
      invitedEmail: email,
    });

    return updatedTeam;
  }

  async removeMember(teamId, userId, requesterId) {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Only team creator can remove members
    if (team.createdBy.toString() !== requesterId.toString()) {
      throw new AppError("Only the team creator can remove members", 403);
    }

    // Cannot remove the creator
    if (team.createdBy.toString() === userId.toString()) {
      throw new AppError("Cannot remove the team creator", 400);
    }

    const updatedTeam = await this.teamRepository.removeMemberFromTeam(
      teamId,
      userId
    );

    // Fetch user details for event
    const remover = await this.userRepository.findUserById(requesterId);

    // Emit minimal payload
    this.io.emit("memberRemoved", {
      teamId: teamId,
      userId: userId,
      removedBy: {
        _id: requesterId,
        fullName: remover?.fullName || "Unknown",
        email: remover?.email || "unknown@example.com",
      },
    });

    await this.actionService.logAndEmit(requesterId, null, "member_removed", {
      removedUserId: userId,
    });

    return updatedTeam;
  }

  async getTeamById(teamId, userId) {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Check if the user is a member of the team
    const isMember = team.members.some(
      (member) => member._id.toString() === userId.toString()
    );
    if (!isMember) {
      throw new AppError("You are not authorized to view this team.", 403);
    }

    return team;
  }

  async getMyTeams(userId) {
    const teams = await this.teamRepository.getTeamsByUser(userId);
    if (!teams || teams.length === 0) {
      return [];
    }
    return teams;
  }

  async updateTeam(teamId, updates, userId) {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Only creator can update team
    if (team.createdBy.toString() !== userId.toString()) {
      throw new AppError("Only the team creator can update team details", 403);
    }

    // Validate updates (only allow name and description)
    const allowedUpdates = {};
    if (updates.name) allowedUpdates.name = updates.name;
    if (updates.description !== undefined)
      allowedUpdates.description = updates.description;

    const updatedTeam = await this.teamRepository.updateTeamDetails(
      teamId,
      allowedUpdates
    );

    // Fetch user details for event
    const user = await this.userRepository.findUserById(userId);

    // Add updatedBy to payload
    const updatedWithUser = {
      ...updatedTeam.toObject(),
      updatedBy: {
        _id: userId,
        fullName: user?.fullName || "Unknown",
        email: user?.email || "unknown@example.com",
      },
    };

    this.io.emit("teamUpdated", updatedWithUser);

    await this.actionService.logAndEmit(userId, null, "team_updated", {
      teamName: updatedTeam.name,
    });

    return updatedTeam;
  }

  async leaveTeam(teamId, userId) {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Creator cannot leave, must delete team or transfer ownership
    if (team.createdBy.toString() === userId.toString()) {
      throw new AppError(
        "Team creator cannot leave the team. Delete the team instead.",
        400
      );
    }

    // Check if user is a member
    const isMember = team.members.some(
      (member) => member._id.toString() === userId.toString()
    );
    if (!isMember) {
      throw new AppError("You are not a member of this team", 400);
    }

    const updatedTeam = await this.teamRepository.removeMemberFromTeam(
      teamId,
      userId
    );

    await this.actionService.logAndEmit(userId, null, "left_team", {
      teamName: team.name,
    });

    this.io.emit("memberLeft", { teamId, userId });
    return updatedTeam;
  }

  async deleteTeam(teamId, userId) {
    const team = await this.teamRepository.getTeamById(teamId);
    if (!team) {
      throw new AppError("Team not found", 404);
    }

    // Only creator can delete
    if (team.createdBy.toString() !== userId.toString()) {
      throw new AppError("Only the team creator can delete this team", 403);
    }

    // Delete team
    await this.teamRepository.deleteTeam(teamId);

    // Fetch user details
    const user = await this.userRepository.findUserById(userId);

    // Emit event
    this.io.emit("teamDeleted", {
      teamId: teamId,
      deletedBy: {
        _id: userId,
        fullName: user?.fullName || "Unknown",
        email: user?.email || "unknown@example.com",
      },
    });

    // Log action
    await this.actionService.logAndEmit(userId, null, "team_deleted", {
      teamName: team.name,
    });

    return { message: "Team deleted successfully" };
  }
}

export default TeamService;
