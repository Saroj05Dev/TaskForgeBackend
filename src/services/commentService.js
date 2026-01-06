class CommentService {
  constructor(
    commentRepository,
    taskRepository,
    actionService,
    authHelper,
    io
  ) {
    this.commentRepository = commentRepository;
    this.actionService = actionService;
    this.taskRepository = taskRepository;
    this.authHelper = authHelper;
    this.io = io;
  }

  async addComment(taskId, userId, commentText) {
    // Check if the task exists
    const task = await this.taskRepository.findTaskById(taskId);
    if (!task) {
      const error = new Error("Task not found!");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check: User needs edit or full permission
    await this.authHelper.requirePermission(taskId, userId, task, "edit");

    // Create the comment in the database
    const newComment = await this.commentRepository.createComment({
      taskId,
      userId,
      comment: commentText,
    });

    // Broadcast real-time update
    this.io.emit("commentAdded", newComment);

    // Log the action
    await this.actionService.logAndEmit(
      userId,
      newComment._id,
      "comment_added",
      { commentText }
    );

    return newComment;
  }

  async removeComment(commentId, userId) {
    // Find the comment first
    const comment = await this.commentRepository.findCommentById(commentId);
    if (!comment) {
      const error = new Error("Comment not found!");
      error.statusCode = 404;
      throw error;
    }

    // Get the task to check permissions
    const task = await this.taskRepository.findTaskById(comment.taskId);
    if (!task) {
      const error = new Error("Task not found!");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check
    const isCommentOwner = comment.userId.toString() === userId.toString();

    if (isCommentOwner) {
      // Comment owner can delete their own comment with edit permission
      await this.authHelper.requirePermission(
        comment.taskId,
        userId,
        task,
        "edit"
      );
    } else {
      // Non-owners need full permission to delete others' comments
      await this.authHelper.requirePermission(
        comment.taskId,
        userId,
        task,
        "delete"
      );
    }

    const deletedComment = await this.commentRepository.deleteComment(
      commentId
    );

    // Emit real-time event
    this.io.emit("commentDeleted", deletedComment);

    // Log action
    await this.actionService.logAndEmit(
      userId,
      deletedComment.taskId,
      "comment_deleted"
    );

    return deletedComment;
  }

  async getTaskComment(taskId, userId) {
    const currentTask = await this.taskRepository.findTaskById(taskId);
    if (!currentTask) {
      const error = new Error("Task not found!");
      error.statusCode = 404;
      throw error;
    }

    // Authorization check: User needs at least view permission
    await this.authHelper.requirePermission(
      taskId,
      userId,
      currentTask,
      "view"
    );

    return await this.commentRepository.getCommentsByTaskId(taskId);
  }
}

export default CommentService;
