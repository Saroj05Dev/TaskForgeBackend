class TeamController {
  constructor(teamService) {
    this.teamService = teamService;

    this.createTeam = this.createTeam.bind(this);
    this.inviteMember = this.inviteMember.bind(this);
    this.removeMember = this.removeMember.bind(this);
    this.getTeamById = this.getTeamById.bind(this);
    this.getMyTeam = this.getMyTeam.bind(this);
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
      const updatedTeam = await this.teamService.removeMember(teamId, userId);
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

  async getMyTeam(req, res) {
    try {
      const team = await this.teamService.getMyTeam(
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: "Team fetched successfully",
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
}
export default TeamController;