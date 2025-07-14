const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const memberRoutes = require("./routes/memberRoutes");
const groupRoutes = require("./routes/groupRoutes");
const postRoutes = require("./routes/postRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const newsRoutes = require("./routes/newsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const homeRoutes = require("./routes/homeRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const forumRoutes = require("./routes/forumRoutes");
const eventRoutes = require("./routes/eventRoutes");
const donationRoutes = require("./routes/donationRoutes");
const jobRoutes = require("./routes/jobsRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const sponsorshipRoutes = require("./routes/sponsorshipRoutes");
const searchRoutes = require("./routes/searchRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const pollRoutes = require("./routes/pollRoutes");
const uploadGoogleDriveRoutes = require("./routes/uploadGoogleDriveRoutes");
const forgotPassRoutes = require("./routes/forgotPass");
const imageRoutes = require("./routes/imageRoutes");
const photoGallaryRoutes = require("./routes/photoGallaryRoutes");
const jobApplicationRoutes = require("./routes/jobApplicationRoutes");
const groupMemberRoutes = require("./routes/groupMemberRoutes");
const forumv2Routes = require("./routes/forumv2Routes");


const Message = require("./models/message");
const ws = require("ws");
const fs = require("fs");
const jwt = require("jsonwebtoken");
dotenv.config();

const path = require("path");

const db = require("./db");

const app = express();
const apiPort = 5000;

const server = http.createServer(app); // Create an HTTP server
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://alumni-frontend-4ca1.vercel.app",
      "https://alumni-p-eps.vercel.app",
      "https://api.excelpublicschool.com",
      "https://alumni.excelpublicschool.com",
      "https://alumnify.in",
    ],
    credentials: true,
  },
  transports: ["polling"]  

});

const alumniRoutes = require("./routes/alumni");
const { clearTimeout } = require("timers");
const uploadRoutes = require("./routes/upload");

app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(bodyParser.json({ extended: true, limit: "100mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://alumni-frontend-4ca1.vercel.app",
      "https://alumni-p-eps.vercel.app",
      "https://api.excelpublicschool.com",
      "https://api.excelpublicschool.com/alumni/login",
      "https://api.excelpublicschool.com/settings/",
      "https://alumni.excelpublicschool.com",
      "https://alumnify.in",
      "https://alumnify.in:3000",
      'capacitor://localhost'
    ],
    credentials: true,
  })
);
//app.use(cors());
// console.log("directory name", __dirname);

app.use(bodyParser.json({ extended: true, limit: "100mb" }));
app.use("/uploads", express.static(__dirname + "/uploads"));
// app.use(
//   "/uploads",
//   express.static(path.join(__dirname, "../AlumniFrontendD/public/uploads"))
// );
db.once("open", () => {
  console.log("Connected to MongoDB");
});
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.use("/alumni", alumniRoutes);
app.use("/sessions", alumniRoutes);
app.use("/members", memberRoutes);
app.use("/groups", groupRoutes);
app.use("/posts", postRoutes);
app.use("/topics", topicsRoutes);
app.use("/news", newsRoutes);
app.use("/settings", settingsRoutes);
app.use("/home", homeRoutes);
app.use("/sessions", sessionRoutes);
app.use("/forums", forumRoutes);
app.use("/events", eventRoutes);
app.use("/donations", donationRoutes);
app.use("/jobs", jobRoutes);
app.use("/internships", internshipRoutes);
app.use("/sponsorships", sponsorshipRoutes);
app.use("/messages", messageRoutes);
app.use("/search", searchRoutes);
app.use("/notifications", notificationRoutes);
app.use("/poll", pollRoutes);
app.use("/uploadImage", uploadRoutes);
app.use("/uploadGoogleDrive", uploadGoogleDriveRoutes);
app.use("/forgotPass", forgotPassRoutes);
app.use("/images", imageRoutes);
app.use("/photoGallary", photoGallaryRoutes);
app.use("/jobApplication", jobApplicationRoutes);
app.use("/groupMember", groupMemberRoutes);
app.use("/forumv2", forumv2Routes);

const secretKey =
  "f3c8a3c9b8a9f0b2440a646f3a5b8f9e6d6e46555a4b2b5c6d7c8d9e0a1b2c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8g9h0";

const onlineUserIds = new Set();
let onlinePeople = 0;

// Socket.IO auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  // console.log("🔒 Received token:", token);

  if (!token) {
    console.error("🔒 Auth error: no token provided");
    return next(new Error("Auth error"));
  }

  // Decode WITHOUT verifying signature
  const payload = jwt.decode(token, { complete: false });
  if (!payload || typeof payload !== "object") {
    console.error("🔒 Auth error: invalid token format");
    return next(new Error("Auth error"));
  }

  // Extract userId
  socket.userId = payload.userId;
  // console.log("🛠️  Decoded userId (no verify):", socket.userId);

  // Proceed without signature check
  next();
});
// Socket.IO connection
io.on("connection", socket => {
  // 1) Log the connection
  console.log(`User connected: ${socket.userId}`);
  // 2) Catch any uncaught exceptions in this block
  try {
    socket.join(socket.userId);

    // emit updated online list
    const emitOnline = () => {
      const online = Array.from(io.sockets.sockets.values())
        .map(s => s.userId);
      io.emit("online-users", online);
      // console.log('online', online)
    };
    emitOnline();

    // 3) Wrap your async handler in try/catch
    socket.on("send-message", async ({ recipient, text, file }) => {
      try {
        // console.log('hi')
        const Message = require("./models/message");
        const msg = await Message.create({
          sender:    socket.userId,
          recipient,
          text,
          file: file?.filename || null
        });
        io.to(recipient).emit("receive-message", {
          _id:        msg._id,
          sender:     socket.userId,
          recipient,
          text:       msg.text,
          file:       msg.file,
          createdAt:  msg.createdAt
        });
        io.to(socket.userId).emit("receive-message", {
          _id:        msg._id,
          sender:     socket.userId,
          recipient,
          text:       msg.text,
          file:       msg.file,
          createdAt:  msg.createdAt
        });
      } catch (err) {
        console.error("Error in send-message handler:", err);
        // optionally notify the client:
        socket.emit("error", { message: "Message send failed." });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
      emitOnline();
    });

    // 4) Listen for any socket‑level errors
    socket.on("error", err => {
      console.error("Socket error for user", socket.userId, err);
    });

  } catch (err) {
    // catches sync errors in the connection handler
    console.error("Error in connection handler for user", socket.userId, err);
  }
});

server.listen(apiPort, () => {
  console.log(`Server running on port ${apiPort}`);
});
