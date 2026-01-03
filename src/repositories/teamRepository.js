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

  async findUserByEmail(UserModel, email) {
    return await UserModel.findOne({ email });
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

  async findTeamByMember(userId) {
    return await Teams.findOne({
      members: userId,
    }).populate("members", "fullName email");
  }
}
export default TeamRepository;
