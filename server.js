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
    ],
    credentials: true,
  })
);
//app.use(cors());
console.log("directory name", __dirname);

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

const secretKey =
  "f3c8a3c9b8a9f0b2440a646f3a5b8f9e6d6e46555a4b2b5c6d7c8d9e0a1b2c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8g9h0";

const onlineUserIds = new Set();
let onlinePeople = 0;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  onlinePeople++;
  io.emit("onlineUsers", onlinePeople);

  const cookies = socket.handshake.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.trim().startsWith("token="));

    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      try {
        const userData = jwt.verify(token, secretKey);
        const { userId, username } = userData;

        socket.userId = userId;
        socket.username = username;

        onlineUserIds.add(userId);
        notifyAboutOnlinePeople();
      } catch (err) {
        console.error("Invalid token:", err.message);
      }
    }
  }

  function notifyAboutOnlinePeople() {
    const onlineUsers = [];

    for (const [id, s] of io.sockets.sockets) {
      if (s.userId && s.username) {
        onlineUsers.push({ userId: s.userId, username: s.username });
      }
    }
    console.log("online users", onlineUsers);

    io.emit("online-users", onlineUsers); // send to all clients
  }

  socket.on("message", async (messageData) => {
    console.log("message data",messageData)
    const { recipient, text, file, sender } = messageData;
    console.log("message data",messageData)
    let filename = null;

    if (file) {
      filename = file.name;
      const filePath = path.join(__dirname, "uploads", filename);
      const bufferData = Buffer.from(file.data, "base64");

      fs.writeFile(filePath, bufferData, (err) => {
        if (err) {
          console.error("Error saving file:", err);
        } else {
          console.log("File saved:", filePath);
        }
      });
    }

    if (recipient && (text || file)) {
      console.log("recipient", recipient, text);
      const messageDoc = await Message.create({
        sender,
        recipient,
        text,
        file: file ? filename : null,
      });

      console.log("message doc", messageDoc);

      // Send message to the recipient if online
      for (const [id, s] of io.sockets.sockets) {
        if (s.userId === recipient) {
          s.emit("message", {
            text,
            sender: socket.userId,
            recipient,
            file: file ? filename : null,
            _id: messageDoc._id,
            createdAt: messageDoc.createdAt,
          });
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    onlinePeople--;
    io.emit("onlineUsers", onlinePeople);
    if (socket.userId) {
      onlineUserIds.delete(socket.userId);
    }
    notifyAboutOnlinePeople();
  });
});

server.listen(apiPort, () => {
  console.log(`Server running on port ${apiPort}`);
});
