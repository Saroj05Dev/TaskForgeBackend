import fs from "fs";
import cloudinary from "../config/cloudinaryConfig.js";
import AppError from "../utils/AppError.js";

class AttachmentService {
  constructor(attachmentRepository, actionService, io) {
    this.attachmentRepository = attachmentRepository;
    this.actionService = actionService;
    this.io = io;
  }

  async addAttachments(taskId, userId, file) {
    const task = await this.attachmentRepository.getTaskById(taskId);

    if (!task) {
      throw new AppError("Task not found!", 404);
    }

    // Check permission: creator or assignedUser
    if (
      task.createdBy.toString() !== userId.toString() &&
      (!task.assignedUser || task.assignedUser.toString() !== userId.toString())
    ) {
      throw new AppError(
        "You are not authorized to add an attachment to this task.",
        403
      );
    }

    // upload to cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "task_attachments",
      resource_type: "auto",
    });

    fs.unlinkSync(file.path); // deleting temp file

    const attachmentsData = {
      filename: file.originalname,
      fileUrl: result.secure_url,
      publicId: result.public_id,
      uploadedBy: userId,
    };
    const updatedTask = await this.attachmentRepository.addAttachmentsToTasks(
      taskId,
      attachmentsData
    );

    this.io.emit("attachmentAdded", { taskId, attachment: attachmentsData });

    await this.actionService.logAndEmit(userId, taskId, "attachment_added");

    return updatedTask;
  }

  async removeAttachments(taskId, userId, publicId) {
    const task = await this.attachmentRepository.getTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const attachment = task.attachments.find(
      (att) => att.publicId === publicId
    );
    if (!attachment) throw new AppError("Attachment not found!", 404);

    // Permission: only uploader or creator can delete
    if (
      task.createdBy.toString() !== userId.toString() &&
      attachment.uploadedBy.toString() !== userId.toString()
    ) {
      throw new AppError(
        "You are not authorized to delete this attachment.",
        403
      );
    }

    // Remove from cloudinary
    await cloudinary.uploader.destroy(publicId);

    const updatedTask =
      await this.attachmentRepository.removeAttachmentsFromTask(
        taskId,
        publicId
      );

    this.io.emit("attachmentDeleted", { taskId, publicId });

    await this.actionService.logAndEmit(userId, taskId, "attachment_deleted");

    return updatedTask;
  }

  async fetchAllAttachments(taskId, userId) {
    const task = await this.attachmentRepository.getTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }
    // Permission: only creator or assignedUser can fetch
    if (
      task.createdBy.toString() !== userId.toString() &&
      (!task.assignedUser || task.assignedUser.toString() !== userId.toString())
    ) {
      throw new AppError(
        "You are not authorized to view this task attachments.",
        403
      );
    }
    const attachments = await this.attachmentRepository.fetchAllAttachments(
      taskId
    );
    return attachments;
  }
}

export default AttachmentService;
