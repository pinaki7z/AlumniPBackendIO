// utils/socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://alumni-frontend-4ca1.vercel.app",
        "https://alumni-p-eps.vercel.app",
        "https://api.excelpublicschool.com",
        "https://alumni.excelpublicschool.com",
        "https://alumnify.in",
        'capacitor://localhost'
      ],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Socket.IO auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    
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

    socket.userId = payload.userId;
    next();
  });

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    try {
      // Join user-specific rooms
      socket.join(socket.userId);
      socket.join('global');
      socket.join(`notifications_${socket.userId}`);

      // Emit updated online list
      const emitOnline = () => {
        const online = Array.from(io.sockets.sockets.values())
          .map(s => s.userId);
        io.emit("online-users", online);
      };
      emitOnline();

      // Handle notification room joining
      socket.on("join-notification-room", (userId) => {
        socket.join(`notifications_${userId}`);
        console.log(`User ${userId} joined notification room`);
      });

      // Handle messages
      socket.on("send-message", async ({ recipient, text, file }) => {
        try {
          const Message = require("../models/message");
          const msg = await Message.create({
            sender: socket.userId,
            recipient,
            text,
            file: file?.filename || null
          });
          
          const messageData = {
            _id: msg._id,
            sender: socket.userId,
            recipient,
            text: msg.text,
            file: msg.file,
            createdAt: msg.createdAt
          };

          io.to(recipient).emit("receive-message", messageData);
          io.to(socket.userId).emit("receive-message", messageData);
        } catch (err) {
          console.error("Error in send-message handler:", err);
          socket.emit("error", { message: "Message send failed." });
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.userId}`);
        emitOnline();
      });

      socket.on("error", err => {
        console.error("Socket error for user", socket.userId, err);
      });

    } catch (err) {
      console.error("Error in connection handler for user", socket.userId, err);
    }
  });

  console.log("Socket.IO initialized successfully");
  return io;
};

// Get the io instance
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

// Notification helper functions
const emitNotification = (notification) => {
  if (!io) return;
  
  try {
    if (notification.global) {
      // Send to all connected users
      io.emit("new-notification", notification);
    } else {
      // Send to specific user
      io.to(`notifications_${notification.userId}`).emit("new-notification", notification);
      io.to(notification.userId).emit("new-notification", notification);
    }
    console.log(`📧 Notification emitted: ${notification.title}`);
  } catch (error) {
    console.error("Error emitting notification:", error);
  }
};

const emitNotificationRead = (notificationId, userId, isGlobal = false) => {
  if (!io) return;
  
  try {
    const data = { notificationId };
    if (isGlobal) {
      io.emit("notification-read", data);
    } else {
      io.to(`notifications_${userId}`).emit("notification-read", data);
      io.to(userId).emit("notification-read", data);
    }
    console.log(`👁️ Notification read emitted: ${notificationId}`);
  } catch (error) {
    console.error("Error emitting notification read:", error);
  }
};

const emitNotificationRemoved = (notificationId, userId, isGlobal = false) => {
  if (!io) return;
  
  try {
    const data = { notificationId };
    if (isGlobal) {
      io.emit("notification-removed", data);
    } else {
      io.to(`notifications_${userId}`).emit("notification-removed", data);
      io.to(userId).emit("notification-removed", data);
    }
    console.log(`🗑️ Notification removal emitted: ${notificationId}`);
  } catch (error) {
    console.error("Error emitting notification removal:", error);
  }
};

// Message helper functions
const emitMessage = (messageData) => {
  if (!io) return;
  
  try {
    io.to(messageData.recipient).emit("receive-message", messageData);
    io.to(messageData.sender).emit("receive-message", messageData);
    console.log(`💬 Message emitted from ${messageData.sender} to ${messageData.recipient}`);
  } catch (error) {
    console.error("Error emitting message:", error);
  }
};

// General broadcast function
const broadcastToUser = (userId, event, data) => {
  if (!io) return;
  
  try {
    io.to(userId).emit(event, data);
    console.log(`📡 Event '${event}' broadcasted to user ${userId}`);
  } catch (error) {
    console.error(`Error broadcasting to user ${userId}:`, error);
  }
};

const broadcastGlobal = (event, data) => {
  if (!io) return;
  
  try {
    io.emit(event, data);
    console.log(`🌐 Global event '${event}' broadcasted`);
  } catch (error) {
    console.error("Error broadcasting globally:", error);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitNotification,
  emitNotificationRead,
  emitNotificationRemoved,
  emitMessage,
  broadcastToUser,
  broadcastGlobal
};
