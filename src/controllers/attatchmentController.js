class AttachmentController {
  constructor(attachmentService) {
    this.attachmentService = attachmentService;

    this.addAttachment = this.addAttachment.bind(this);
    this.deleteAttachment = this.deleteAttachment.bind(this);
    this.fetchAllAttachments = this.fetchAllAttachments.bind(this);
  }

  async addAttachment(req, res) {
    try {
      const updatedTask = await this.attachmentService.addAttachments(
        req.params.taskId,
        req.user.id,
        req.file
      );

      res.status(200).json({
        success: true,
        message: "Attachment added successfully",
        data: updatedTask,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async deleteAttachment(req, res) {
    try {
      const updatedTask = await this.attachmentService.removeAttachments(
        req.params.taskId,
        req.user.id,
        req.query.publicId
      );

      res.status(200).json({
        success: true,
        message: "Attachment deleted successfully",
        data: updatedTask,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }

  async fetchAllAttachments(req, res) {
    try {
      const attachments = await this.attachmentService.fetchAllAttachments(
        req.params.taskId,
        req.user.id
      );
      res.status(200).json({
        success: true,
        message: "Attachments fetched successfully",
        data: attachments,
        error: {},
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message,
        data: {},
        error: error,
      });
    }
  }
}

export default AttachmentController;
