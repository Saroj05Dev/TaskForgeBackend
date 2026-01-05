class ActionController {
    constructor(actionService) {
        this.actionService = actionService;

        this.getRecentActions = this.getRecentActions.bind(this);
    }

    async getRecentActions(req, res) {
        try {
            const userId = req.user.id;
            const actions = await this.actionService.getRecentActions(userId);
            res.status(200).json({
                success: true,
                message: "Actions found successfully",
                data: actions,
                error: {}
            })
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message,
                data: {},
                error: error
            })
        }
    }
}

export default ActionController;