class SharedTaskController {
  constructor(sharedTaskService) {
    this.sharedTaskService = sharedTaskService;

    this.shareTaskWithTeam = this.shareTaskWithTeam.bind(this);
    this.unshareTaskFromTeam = this.unshareTaskFromTeam.bind(this);
    this.getTeamTasks = this.getTeamTasks.bind(this);
    this.getTaskTeams = this.getTaskTeams.bind(this);
    this.updatePermissions = this.updatePermissions.bind(this);
  }

  async shareTaskWithTeam(req, res) {
    try {
      const { taskId, teamId, permissions } = req.body;
      const sharedTask = await this.sharedTaskService.shareTaskWithTeam(
        taskId,
        teamId,
        req.user.id,
        permissions
      );
      res.status(201).json({
        success: true,
        message: "Task shared with team successfully",
        data: sharedTask,
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

  async unshareTaskFromTeam(req, res) {
    try {
      const { taskId, teamId } = req.params;
      const result = await this.sharedTaskService.unshareTaskFromTeam(
        taskId,
        teamId,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: "Task unshared from team successfully",
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

  async getTeamTasks(req, res) {
    try {
      const { teamId } = req.params;
      const sharedTasks = await this.sharedTaskService.getTeamTasks(
        teamId,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: "Team tasks fetched successfully",
        data: sharedTasks,
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

  async getTaskTeams(req, res) {
    try {
      const { taskId } = req.params;
      const taskTeams = await this.sharedTaskService.getTaskTeams(
        taskId,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: "Task teams fetched successfully",
        data: taskTeams,
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

  async updatePermissions(req, res) {
    try {
      const { taskId, teamId } = req.params;
      const { permissions } = req.body;
      const updatedSharedTask =
        await this.sharedTaskService.updateSharedTaskPermissions(
          taskId,
          teamId,
          req.user.id,
          permissions
        );
      res.status(200).json({
        success: true,
        message: "Permissions updated successfully",
        data: updatedSharedTask,
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

export default SharedTaskController;
