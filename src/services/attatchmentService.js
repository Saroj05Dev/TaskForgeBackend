import fs from "fs";
import cloudinary from "../config/cloudinaryConfig.js";
import AppError from "../utils/AppError.js";

class AttachmentService {
  constructor(
    attachmentRepository,
    taskRepository,
    actionService,
    authHelper,
    userRepository,
    io
  ) {
    this.attachmentRepository = attachmentRepository;
    this.taskRepository = taskRepository;
    this.actionService = actionService;
    this.authHelper = authHelper;
    this.userRepository = userRepository;
    this.io = io;
  }

  async addAttachments(taskId, userId, file) {
    const task = await this.attachmentRepository.getTaskById(taskId);

    if (!task) {
      throw new AppError("Task not found!", 404);
    }

    // Check permission: User needs edit or full permission
    await this.authHelper.requirePermission(taskId, userId, task, "edit");

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

    // Fetch user details for event
    const user = await this.userRepository.findUserById(userId);

    // Get the newly added attachment ID
    const newAttachment =
      updatedTask.attachments[updatedTask.attachments.length - 1];

    // Emit with full attachment structure
    this.io.emit("attachmentAdded", {
      _id: newAttachment._id,
      task: taskId,
      filename: attachmentsData.filename,
      url: attachmentsData.fileUrl,
      uploadedBy: {
        _id: userId,
        fullName: user?.fullName || "Unknown",
        email: user?.email || "unknown@example.com",
      },
      createdAt: newAttachment.createdAt || new Date(),
    });

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

    // Authorization check
    const isUploader = attachment.uploadedBy.toString() === userId.toString();

    if (isUploader) {
      // Uploader can delete their own attachment with edit permission
      await this.authHelper.requirePermission(taskId, userId, task, "edit");
    } else {
      // Non-uploaders need full permission to delete others' attachments
      await this.authHelper.requirePermission(taskId, userId, task, "delete");
    }

    // Remove from cloudinary
    await cloudinary.uploader.destroy(publicId);

    const updatedTask =
      await this.attachmentRepository.removeAttachmentsFromTask(
        taskId,
        publicId
      );

    // Fetch user details for event
    const user = await this.userRepository.findUserById(userId);

    // Emit with correct structure
    this.io.emit("attachmentDeleted", {
      attachmentId: attachment._id,
      taskId: taskId,
      deletedBy: {
        _id: userId,
        fullName: user?.fullName || "Unknown",
        email: user?.email || "unknown@example.com",
      },
    });

    await this.actionService.logAndEmit(userId, taskId, "attachment_deleted");

    return updatedTask;
  }

  async fetchAllAttachments(taskId, userId) {
    const task = await this.attachmentRepository.getTaskById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Permission: User needs at least view permission
    await this.authHelper.requirePermission(taskId, userId, task, "view");
    const attachments = await this.attachmentRepository.fetchAllAttachments(
      taskId
    );
    return attachments;
  }
}

export default AttachmentService;
