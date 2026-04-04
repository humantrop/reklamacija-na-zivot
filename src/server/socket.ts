import { Server as SocketIOServer } from "socket.io";
import { generatePseudonym } from "../lib/pseudonyms";

interface WaitingUser {
  socketId: string;
  userId: string;
}

interface ChatRoom {
  roomId: string;
  users: {
    socketId: string;
    userId: string;
    pseudonym: string;
  }[];
}

const waitingQueue: WaitingUser[] = [];
const activeRooms: Map<string, ChatRoom> = new Map();
const socketToRoom: Map<string, string> = new Map();

export function initializeSocket(io: SocketIOServer) {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("find-match", (userId: string) => {
      // Remove from queue if already waiting
      const existingIndex = waitingQueue.findIndex(
        (u) => u.userId === userId || u.socketId === socket.id
      );
      if (existingIndex !== -1) {
        waitingQueue.splice(existingIndex, 1);
      }

      // Remove from any existing room
      const existingRoomId = socketToRoom.get(socket.id);
      if (existingRoomId) {
        leaveRoom(socket, io, existingRoomId);
      }

      // Check if someone is waiting
      if (waitingQueue.length > 0) {
        const partner = waitingQueue.shift()!;

        // Don't match with yourself
        if (partner.userId === userId) {
          waitingQueue.push({ socketId: socket.id, userId });
          socket.emit("waiting");
          return;
        }

        const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const pseudonym1 = generatePseudonym();
        let pseudonym2 = generatePseudonym();
        while (pseudonym2 === pseudonym1) {
          pseudonym2 = generatePseudonym();
        }

        const room: ChatRoom = {
          roomId,
          users: [
            { socketId: partner.socketId, userId: partner.userId, pseudonym: pseudonym1 },
            { socketId: socket.id, userId, pseudonym: pseudonym2 },
          ],
        };

        activeRooms.set(roomId, room);
        socketToRoom.set(partner.socketId, roomId);
        socketToRoom.set(socket.id, roomId);

        // Join socket.io room
        const partnerSocket = io.sockets.sockets.get(partner.socketId);
        if (partnerSocket) {
          partnerSocket.join(roomId);
          partnerSocket.emit("matched", {
            roomId,
            myPseudonym: pseudonym1,
            partnerPseudonym: pseudonym2,
          });
        }

        socket.join(roomId);
        socket.emit("matched", {
          roomId,
          myPseudonym: pseudonym2,
          partnerPseudonym: pseudonym1,
        });

        console.log(`Match created: ${pseudonym1} <-> ${pseudonym2} in ${roomId}`);
      } else {
        waitingQueue.push({ socketId: socket.id, userId });
        socket.emit("waiting");
        console.log(`User ${socket.id} waiting for match`);
      }
    });

    socket.on("send-message", (data: { roomId: string; message: string }) => {
      const room = activeRooms.get(data.roomId);
      if (!room) return;

      const sender = room.users.find((u) => u.socketId === socket.id);
      if (!sender) return;

      socket.to(data.roomId).emit("receive-message", {
        pseudonym: sender.pseudonym,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    socket.on("typing", (roomId: string) => {
      const room = activeRooms.get(roomId);
      if (!room) return;

      const sender = room.users.find((u) => u.socketId === socket.id);
      if (!sender) return;

      socket.to(roomId).emit("partner-typing", sender.pseudonym);
    });

    socket.on("stop-typing", (roomId: string) => {
      socket.to(roomId).emit("partner-stop-typing");
    });

    socket.on("leave-chat", (roomId: string) => {
      leaveRoom(socket, io, roomId);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      // Remove from waiting queue
      const queueIndex = waitingQueue.findIndex((u) => u.socketId === socket.id);
      if (queueIndex !== -1) {
        waitingQueue.splice(queueIndex, 1);
      }

      // Leave any active room
      const roomId = socketToRoom.get(socket.id);
      if (roomId) {
        leaveRoom(socket, io, roomId);
      }
    });
  });
}

function leaveRoom(
  socket: { id: string; to: (roomId: string) => { emit: (event: string, data?: unknown) => void } },
  io: SocketIOServer,
  roomId: string
) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const leaver = room.users.find((u) => u.socketId === socket.id);

  // Notify the other user
  socket.to(roomId).emit("partner-left", leaver?.pseudonym || "Sagovornik");

  // Clean up
  room.users.forEach((u) => {
    socketToRoom.delete(u.socketId);
    const userSocket = io.sockets.sockets.get(u.socketId);
    if (userSocket) {
      userSocket.leave(roomId);
    }
  });

  activeRooms.delete(roomId);
  console.log(`Room ${roomId} closed`);
}
