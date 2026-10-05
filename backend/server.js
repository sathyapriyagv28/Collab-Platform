require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Message = require("./models/Message");
const Code = require("./models/Code");
const Whiteboard = require("./models/Whiteboard");
const Attendance = require("./models/Attendance");
const connectDB = require("./config/db");
const path = require("path");
const { ExpressPeerServer } =
  require("peer");


const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use(
  "/api/messages",
  require("./routes/messageRoutes")
);
app.use(
  "/api/code",
  require("./routes/codeRoutes")
);
app.use(
  "/api/whiteboard",
  require("./routes/whiteboardRoutes")
);

app.use(
  "/api/files",
  require("./routes/fileRoutes")
);

app.use(
  "/api/attendance",
  require("./routes/attendanceRoutes")
);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

app.get("/", (req, res) => {
  res.send("Server Running");
});

// Create HTTP server
const server = http.createServer(app);

const peerServer =
  ExpressPeerServer(server, {
    debug: true,
  });

app.use("/peerjs", peerServer);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const roomUsers = {};
const roomSharers = {};
const roomPeers = {};
// ========================
// SOCKET LOGIC START
// ========================
io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on(
  "request-screen-share",
  ({ roomId, user }, callback) => {

    if (
      roomSharers[roomId] &&
      roomSharers[roomId] !== user
    ) {
      callback({
        allowed: false,
        message:
          `${roomSharers[roomId]} is already sharing`,
      });

      return;
    }

    roomSharers[roomId] = user;

    callback({
      allowed: true,
    });

    io.to(roomId).emit(
      "screen-share-user",
      `${user} is sharing their screen`
    );
  }
);

 socket.on(
  "join-room",
  ({ roomId, user }) => {

    socket.join(roomId);

    socket.roomId = roomId;
    socket.user = user;

    Attendance.create({
  roomId,
  user,
  joinTime: new Date(),
});

    if (!roomUsers[roomId]) {
      roomUsers[roomId] = [];
    }

    roomUsers[roomId].push(user);

    io.to(roomId).emit(
      "users-update",
      roomUsers[roomId]
    );

    socket.on(
  "get-users",
  (roomId) => {
    socket.emit(
      "users-update",
      roomUsers[roomId] || []
    );
  }
);

    io.to(roomId).emit(
      "room-notification",
      `🔔 ${user} joined the room`
    );

    console.log(
      `${user} joined ${roomId}`
    );
  }
);



socket.on(
  "peer-id",
  ({ roomId, peerId, user }) => {

    // Create room peer mapping if it doesn't exist
    if (!roomPeers[roomId]) {
      roomPeers[roomId] = {};
    }

    // Store peerId → username
    roomPeers[roomId][peerId] = user;

    // Send the complete mapping to everyone in the room
    io.to(roomId).emit(
      "peer-users-update",
      roomPeers[roomId]
    );

    // Notify others about the new user
    socket.to(roomId).emit(
      "user-connected",
      {
        peerId,
        user,
      }
    );
  }
);

socket.on(
  "raise-hand",
  ({ roomId, user }) => {

    io.to(roomId).emit(
      "hand-raised",
      user
    );
  }
);

socket.on(
  "reaction",
  (data) => {

    console.log(
      "Reaction received in server:",
      data
    );

    io.to(data.roomId).emit(
      "show-reaction",
      data
    );
  }
);


  // 💬 CHAT EVENT
  socket.on("send-message", async (data) => {
    const { roomId, message, user } = data;

    await Message.create({
      roomId,
      user,
      message,
    });

    io.to(roomId).emit("receive-message", {
      roomId,
      message,
      user,
      time: new Date(),
    });

    socket.to(roomId).emit(
  "chat-notification",
  `💬 ${user} sent a message`
);
  });

  socket.on("code-change", async (data) => {
    const { roomId, code, language } = data;

    await Code.findOneAndUpdate(
      { roomId },
      {
        code,
        language,
      },
      {
        upsert: true,
        new: true,
      }
    );

    socket.to(roomId).emit(
      "code-update",
      code
    );
  });

  socket.on("code-output", ({ roomId, output }) => {
    if (
      typeof roomId !== "string" ||
      !socket.rooms.has(roomId) ||
      typeof output !== "string"
    ) {
      return;
    }

    socket.to(roomId).emit("code-output", {
      roomId,
      output,
    });
  });

  socket.on("whiteboard-update", async (data) => {
    const { roomId, canvasData } = data;

    await Whiteboard.findOneAndUpdate(
      { roomId },
      { canvasData },
      {
        upsert: true,
        new: true,
      }
    );

    socket.to(roomId).emit(
      "whiteboard-sync",
      canvasData
    );
  });

  socket.on("file-uploaded", (data) => {
    socket.to(data.roomId).emit(
      "file-added",
      data
    );
  });

  socket.on("file-deleted", (roomId) => {
  socket.to(roomId).emit("file-deleted");
});

socket.on(
  "screen-share-stop",
  ({ roomId, user }) => {

    if (
      roomSharers[roomId] === user
    ) {
      delete roomSharers[roomId];

      io.to(roomId).emit(
        "screen-share-user",
        null
      );
    }
  }
);

  socket.on("disconnect", () => {

    const roomId = socket.roomId;
    const user = socket.user;

    Attendance.findOne({
  roomId,
  user,
  leaveTime: null,
})
  .sort({ joinTime: -1 })
  .then((record) => {
    if (record) {
      record.leaveTime = new Date();

      record.duration =
        Math.floor(
          (record.leaveTime -
            record.joinTime) /
            1000
        );

      record.save();
    }
  });

    if (
  roomSharers[roomId] === user
) {
  delete roomSharers[roomId];

  io.to(roomId).emit(
    "screen-share-user",
    null
  );
}

    if (
      roomId &&
      roomUsers[roomId]
    ) {

      roomUsers[roomId] =
        roomUsers[roomId].filter(
          (u) => u !== user
        );

      io.to(roomId).emit(
        "users-update",
        roomUsers[roomId]
      );

      io.to(roomId).emit(
        "room-notification",
        `🔔 ${user} left the room`
      );
    }

    console.log(
      "User Disconnected:",
      socket.id
    );
  });
});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});