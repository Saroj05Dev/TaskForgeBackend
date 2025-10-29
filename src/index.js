import express from "express";
import serverConfig from "./config/serverConfig.js";
import { connectDB } from "./config/dbConfig.js";
import userRouter from "./routes/userRoutes.js";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import createTaskRouter from "./routes/taskRoutes.js";
import createActionRouter from "./routes/actionRoutes.js";
import createcommentRouter from "./routes/commentRoutes.js";
import createAttachmentRouter from "./routes/attatchmentRoutes.js";
import createSubTaskRouter from "./routes/subtasksRoutes.js";
import cors from "cors";
import createTeamRouter from "./routes/teamRoutes.js";

const app = express();
const server = http.createServer(app);

// Setup socke.io
const io = new Server(server, {
    cors: {
        origin: "https://todo-collab-frontend.vercel.app", // keep local one while running this app in local
        credentials: true
    }
});

//store io in app locals to access from controllers/serverces
app.set('io', io);

app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: "https://todo-collab-frontend.vercel.app", // keep local one while running this app in local
    credentials: true
}))

app.get('/health', (req, res) => {
    res.status(200).send('Server is alive and breathing.');
});

app.use("/users", userRouter);
app.use("/tasks", createTaskRouter(io));
app.use("/actions", createActionRouter(io));
app.use("/comments", createcommentRouter(io))
app.use("/attachments", createAttachmentRouter(io))
app.use("/subtasks", createSubTaskRouter(io));
app.use("/teams", createTeamRouter(io));

server.listen(serverConfig.PORT, () => {
    connectDB();
    console.log(`Server is running on port ${serverConfig.PORT}`);
});

