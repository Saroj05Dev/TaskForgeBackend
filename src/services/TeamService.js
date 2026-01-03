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

    await this.actionService.logAndEmit(inviterId, null, "member_invited", {
      invitedEmail: email,
    });
    this.io.emit("memberInvited", updatedTeam);

    return updatedTeam;
  }

  async removeMember(teamId, userId) {
    const updatedTeam = await this.teamRepository.removeMemberFromTeam(
      teamId,
      userId
    );
    this.io.emit("memberRemoved", updatedTeam);
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

  async getMyTeam(userId) {
  const team = await this.teamRepository.findTeamByMember(
    userId
  );

  if (!team) {
    throw new AppError("No team found for this user", 404);
  }

  return team;
}

}

export default TeamService;
