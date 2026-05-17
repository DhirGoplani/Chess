import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRouter from "./auth/authRoutes.js";
import pvcRouter from "./pvc/pvcRoutes.js";
import { pvcStore } from "./pvc/pvcStore.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,         
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Chess Server is running!");
});

app.use("/api/auth", authRouter);
app.use("/api/pvc",  pvcRouter);
setInterval(() => pvcStore.cleanup(), 60 * 60 * 1000);

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});