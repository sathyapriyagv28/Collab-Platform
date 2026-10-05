import { io } from "socket.io-client";

const socket = io(
  "https://collab-platform-backend-31r8.onrender.com"
);

export default socket;
