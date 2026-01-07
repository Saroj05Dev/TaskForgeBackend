import Teams from "../schemas/teamSchema.js";

class TeamRepository {
  async createTeam(teamData) {
    try {
      const newTeam = await Teams.create(teamData);
      return newTeam;
    } catch (error) {
      throw new Error("Error creating team: " + error.message);
    }
  }

  async addMemberToTeam(teamId, userId) {
    return await Teams.findByIdAndUpdate(
      teamId,
      { $addToSet: { members: userId } },
      { new: true }
    ).populate("members", "fullName email");
  }

  async removeMemberFromTeam(teamId, userId) {
    return await Teams.findByIdAndUpdate(
      teamId,
      { $pull: { members: userId } },
      { new: true }
    ).populate("members", "fullName email");
  }

  async getTeamById(teamId) {
    return await Teams.findById(teamId).populate("members", "fullName email");
  }

  async isUserTeamMember(teamId, userId) {
    try {
      const team = await Teams.findOne({
        _id: teamId,
        members: userId,
      });
      return !!team;
    } catch (error) {
      throw new Error("Error checking team membership: " + error.message);
    }
  }

  async getTeamsByUser(userId) {
    try {
      const teams = await Teams.find({
        members: userId,
      }).populate("members createdBy", "fullName email");
      return teams;
    } catch (error) {
      throw new Error("Error finding user teams: " + error.message);
    }
  }

  async updateTeamDetails(teamId, updates) {
    try {
      const updatedTeam = await Teams.findByIdAndUpdate(
        teamId,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate("members createdBy", "fullName email");
      return updatedTeam;
    } catch (error) {
      throw new Error("Error updating team: " + error.message);
    }
  }

  async deleteTeam(teamId) {
    try {
      const deletedTeam = await Teams.findByIdAndDelete(teamId);
      return deletedTeam;
    } catch (error) {
      throw new Error("Error deleting team: " + error.message);
    }
  }
}
export default TeamRepository;
