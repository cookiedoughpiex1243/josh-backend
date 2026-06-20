import { io } from "socket.io-client";
const socket = io("http://localhost:3000");
socket.on("connect", () => {
  console.log("connected");
  socket.emit("join_room", {room: "private", user: "josh"});
  socket.emit("focused", {room: "private", user: "josh", lastID: 123});
});
socket.on("disconnect", () => console.log("disconnected"));
