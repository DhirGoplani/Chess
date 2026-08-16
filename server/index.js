import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import authRouter from "./auth/authRoutes.js";
import pvcRouter from "./pvc/pvcRoutes.js";
import gameRouter from "./game/gameRoutes.js";  
import friendsRouter from "./friends/friendsRoutes.js";
import { pvcStore } from "./pvc/pvcStore.js";
import socketHandler from "./socket/socketHandler.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const corsOriginDelegate = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return callback(null, true);
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
  // Allow local Wi-Fi / LAN IP addresses (e.g. http://192.168.x.x:5173)
  if (/^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  callback(null, true);
};

app.use(cors({
  origin: corsOriginDelegate,
  credentials: true,         
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: corsOriginDelegate,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Chess Server is running!");
});

app.use("/api/auth", authRouter);
app.use("/api/pvc",  pvcRouter);
app.use("/api/games", gameRouter);  
app.use("/api/friends", friendsRouter);  
setInterval(() => pvcStore.cleanup(), 60 * 60 * 1000);

socketHandler(io);
 
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});