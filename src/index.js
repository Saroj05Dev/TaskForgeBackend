import express from "express";
import serverConfig from "./config/serverConfig.js";
import { connectDB } from "./config/dbConfig.js";
import userRouter from "./routes/userRoutes.js";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import createTaskRouter from "./routes/taskRoutes.js";
import createActionRouter from "./routes/actionRoutes.js";
import createCommentRouter from "./routes/commentRoutes.js";
import createAttachmentRouter from "./routes/attatchmentRoutes.js";
import createSubTaskRouter from "./routes/subtasksRoutes.js";
import cors from "cors";
import createTeamRouter from "./routes/teamRoutes.js";
import createSharedTaskRouter from "./routes/sharedTaskRoutes.js";
import { validateEnv } from "./utils/validateEnv.js";
import errorHandler from "./middlewares/errorHandler.js";

// Validate environment variables at startup
validateEnv();

const app = express();
const server = http.createServer(app);

// REQUIRED for secure cookies behind Render proxy
app.set("trust proxy", 1);

// Core middlewares
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// CORS configuration (cookies + production safe)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

// Lightweight health check (for Render cold start loader)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Socket.IO connection handlers (for debugging)
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log("❌ Client disconnected:", socket.id, "Reason:", reason);
  });
});

// Make io available in controllers/services
app.set("io", io);

// Routes
app.use("/users", userRouter);
app.use("/tasks", createTaskRouter(io));
app.use("/actions", createActionRouter(io));
app.use("/comments", createCommentRouter(io));
app.use("/attachments", createAttachmentRouter(io));
app.use("/subtasks", createSubTaskRouter(io));
app.use("/teams", createTeamRouter(io));
app.use("/shared-tasks", createSharedTaskRouter(io));

// Global error handler (must be last)
app.use(errorHandler);

server.listen(serverConfig.PORT, async () => {
  await connectDB();
  console.log(`Server is running on port ${serverConfig.PORT}`);
});
