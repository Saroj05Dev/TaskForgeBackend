class TeamController {
  constructor(teamService) {
    this.teamService = teamService;

    this.createTeam = this.createTeam.bind(this);
    this.inviteMember = this.inviteMember.bind(this);
    this.removeMember = this.removeMember.bind(this);
    this.getTeamById = this.getTeamById.bind(this);
    this.getMyTeams = this.getMyTeams.bind(this);
    this.updateTeam = this.updateTeam.bind(this);
    this.leaveTeam = this.leaveTeam.bind(this);
    this.deleteTeam = this.deleteTeam.bind(this);
  }

  async createTeam(req, res) {
    try {
      const { name, description } = req.body;
      const team = await this.teamService.createTeam(
        req.user.id,
        name,
        description
      );
      res.status(201).json({
        success: true,
        message: "Team created successfully",
        data: team,
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

  async inviteMember(req, res) {
    try {
      const { teamId } = req.params;
      const { email } = req.body;
      const updatedTeam = await this.teamService.inviteMember(
        teamId,
        req.user.id,
        email
      );
      res.status(200).json({
        success: true,
        message: "Member invited successfully",
        data: updatedTeam,
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

  async removeMember(req, res) {
    try {
      const { teamId, userId } = req.params;
      const updatedTeam = await this.teamService.removeMember(
        teamId,
        userId,
        req.user.id // requesterId
      );
      res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: updatedTeam,
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

  async getTeamById(req, res) {
    try {
      const { teamId } = req.params;
      const team = await this.teamService.getTeamById(teamId, req.user.id);
      res.status(200).json({
        success: true,
        message: "Team found successfully",
        data: team,
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

  async getMyTeams(req, res) {
    try {
      const teams = await this.teamService.getMyTeams(req.user.id);

      res.status(200).json({
        success: true,
        message: "Teams fetched successfully",
        data: teams,
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

  async updateTeam(req, res) {
    try {
      const { teamId } = req.params;
      const updates = req.body;
      const updatedTeam = await this.teamService.updateTeam(
        teamId,
        updates,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: "Team updated successfully",
        data: updatedTeam,
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

  async leaveTeam(req, res) {
    try {
      const { teamId } = req.params;
      const result = await this.teamService.leaveTeam(teamId, req.user.id);
      res.status(200).json({
        success: true,
        message: "Left team successfully",
        data: result,
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

  async deleteTeam(req, res) {
    try {
      const { teamId } = req.params;
      const result = await this.teamService.deleteTeam(teamId, req.user.id);
      res.status(200).json({
        success: true,
        message: "Team deleted successfully",
        data: result,
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
}
export default TeamController;
