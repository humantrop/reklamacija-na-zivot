import { Server as SocketIOServer } from "socket.io";
import { generatePseudonym } from "../lib/pseudonyms";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Group chat colors for participants
const GROUP_COLORS = ["#8b5cf6", "#60a5fa", "#f472b6", "#10b981", "#f59e0b"];

interface WaitingUser {
  socketId: string;
  userId: string;
  category?: string;
  joinedAt: number;
}

interface RoomUser {
  socketId: string;
  userId: string;
  pseudonym: string;
  color: string;
  connected: boolean;
}

interface ChatRoom {
  roomId: string;
  isGroup: boolean;
  category?: string;
  users: RoomUser[];
}

interface DisconnectedUser {
  userId: string;
  roomId: string;
  timeout: ReturnType<typeof setTimeout>;
}

// Queues
const generalQueue: WaitingUser[] = [];
const categoryQueues: Map<string, WaitingUser[]> = new Map();
const groupQueue: WaitingUser[] = [];

// Active state
const activeRooms: Map<string, ChatRoom> = new Map();
const socketToRoom: Map<string, string> = new Map();
const userToRoom: Map<string, string> = new Map();

// Temporarily disconnected users (grace period for reconnect)
const disconnectedUsers: Map<string, DisconnectedUser> = new Map();

// How long to wait before kicking a disconnected user (30s)
const DISCONNECT_GRACE_MS = 30000;

// Stats tracking
let pendingChatCount = 0;
let pendingMessageCount = 0;
let pendingSoloChats = 0;
let pendingGroupChats = 0;
const pendingCategoryUsage: Map<string, number> = new Map();

async function flushStats() {
  const hasStats = pendingChatCount > 0 || pendingMessageCount > 0 || pendingSoloChats > 0 || pendingGroupChats > 0;
  const hasCategory = pendingCategoryUsage.size > 0;
  if (!hasStats && !hasCategory) return;

  const chats = pendingChatCount;
  const messages = pendingMessageCount;
  const solo = pendingSoloChats;
  const group = pendingGroupChats;
  const categoryBatch = new Map(pendingCategoryUsage);
  pendingChatCount = 0;
  pendingMessageCount = 0;
  pendingSoloChats = 0;
  pendingGroupChats = 0;
  pendingCategoryUsage.clear();

  try {
    await prisma.stats.upsert({
      where: { id: "global" },
      create: { id: "global", totalChatsCreated: chats, totalMessages: messages, soloChats: solo, groupChats: group },
      update: {
        totalChatsCreated: { increment: chats },
        totalMessages: { increment: messages },
        soloChats: { increment: solo },
        groupChats: { increment: group },
      },
    });

    // Flush category usage
    for (const [catId, count] of categoryBatch) {
      await prisma.categoryStat.upsert({
        where: { id: catId },
        create: { id: catId, label: catId, usageCount: count },
        update: { usageCount: { increment: count } },
      });
    }
  } catch (e) {
    console.error("Failed to flush stats:", e);
    pendingChatCount += chats;
    pendingMessageCount += messages;
  }
}

// Flush stats every 30s
setInterval(flushStats, 30000);

// Group queue check — form group when 3+ are waiting or timeout (30s with 2+)
function checkGroupQueue(io: SocketIOServer) {
  const now = Date.now();

  if (groupQueue.length >= 3) {
    const groupSize = Math.min(groupQueue.length, 5);
    const members = groupQueue.splice(0, groupSize);
    createGroupRoom(io, members);
    return;
  }

  if (groupQueue.length >= 2) {
    const oldest = groupQueue[0];
    if (now - oldest.joinedAt >= 30000) {
      const members = groupQueue.splice(0, groupQueue.length);
      createGroupRoom(io, members);
    }
  }
}

function createGroupRoom(io: SocketIOServer, members: WaitingUser[]) {
  const roomId = `group_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const usedPseudonyms = new Set<string>();
  const users: RoomUser[] = members.map((m, i) => {
    let pseudonym = generatePseudonym();
    while (usedPseudonyms.has(pseudonym)) {
      pseudonym = generatePseudonym();
    }
    usedPseudonyms.add(pseudonym);
    return {
      socketId: m.socketId,
      userId: m.userId,
      pseudonym,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
      connected: true,
    };
  });

  const room: ChatRoom = { roomId, isGroup: true, users };
  activeRooms.set(roomId, room);

  users.forEach((u) => {
    socketToRoom.set(u.socketId, roomId);
    userToRoom.set(u.userId, roomId);
    const userSocket = io.sockets.sockets.get(u.socketId);
    if (userSocket) {
      userSocket.join(roomId);
      userSocket.emit("matched", {
        roomId,
        isGroup: true,
        myPseudonym: u.pseudonym,
        myColor: u.color,
        participants: users.map((p) => ({
          pseudonym: p.pseudonym,
          color: p.color,
          isMe: p.socketId === u.socketId,
        })),
      });
    }
  });

  pendingChatCount++;
  pendingGroupChats++;
  users.forEach((u) => incrementUserChats(u.userId));
  console.log(`Group created: ${users.map((u) => u.pseudonym).join(", ")} in ${roomId}`);
}

// Category queue timeout check — fallback to general after 20s
function checkCategoryQueues(io: SocketIOServer) {
  const now = Date.now();
  for (const [categoryId, queue] of categoryQueues) {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (now - queue[i].joinedAt >= 20000) {
        const user = queue.splice(i, 1)[0];
        generalQueue.push(user);
        const userSocket = io.sockets.sockets.get(user.socketId);
        if (userSocket) {
          userSocket.emit("category-timeout");
        }
        tryMatchGeneral(io);
      }
    }
    if (queue.length === 0) {
      categoryQueues.delete(categoryId);
    }
  }
}

function tryMatchGeneral(io: SocketIOServer) {
  while (generalQueue.length >= 2) {
    const user1 = generalQueue.shift()!;
    const user2 = generalQueue.shift()!;
    if (user1.userId === user2.userId) {
      generalQueue.unshift(user2);
      break;
    }
    createSoloRoom(io, user1, user2);
  }
}

function createSoloRoom(io: SocketIOServer, user1: WaitingUser, user2: WaitingUser, category?: string) {
  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const pseudonym1 = generatePseudonym();
  let pseudonym2 = generatePseudonym();
  while (pseudonym2 === pseudonym1) pseudonym2 = generatePseudonym();

  const room: ChatRoom = {
    roomId,
    isGroup: false,
    category,
    users: [
      { socketId: user1.socketId, userId: user1.userId, pseudonym: pseudonym1, color: GROUP_COLORS[0], connected: true },
      { socketId: user2.socketId, userId: user2.userId, pseudonym: pseudonym2, color: GROUP_COLORS[1], connected: true },
    ],
  };

  activeRooms.set(roomId, room);
  socketToRoom.set(user1.socketId, roomId);
  socketToRoom.set(user2.socketId, roomId);
  userToRoom.set(user1.userId, roomId);
  userToRoom.set(user2.userId, roomId);

  const s1 = io.sockets.sockets.get(user1.socketId);
  if (s1) {
    s1.join(roomId);
    s1.emit("matched", {
      roomId,
      isGroup: false,
      myPseudonym: pseudonym1,
      partnerPseudonym: pseudonym2,
      category,
    });
  }

  const s2 = io.sockets.sockets.get(user2.socketId);
  if (s2) {
    s2.join(roomId);
    s2.emit("matched", {
      roomId,
      isGroup: false,
      myPseudonym: pseudonym2,
      partnerPseudonym: pseudonym1,
      category,
    });
  }

  pendingChatCount++;
  pendingSoloChats++;
  if (category) {
    pendingCategoryUsage.set(category, (pendingCategoryUsage.get(category) || 0) + 1);
  }
  incrementUserChats(user1.userId);
  incrementUserChats(user2.userId);
  console.log(`Match: ${pseudonym1} <-> ${pseudonym2}${category ? ` [${category}]` : ""}`);
}

async function incrementUserChats(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { totalChats: { increment: 1 } },
    });
  } catch (e) {
    console.error("Failed to increment user chats:", e);
  }
}

function removeFromAllQueues(socketId: string, userId: string) {
  const gi = generalQueue.findIndex((u) => u.socketId === socketId || u.userId === userId);
  if (gi !== -1) generalQueue.splice(gi, 1);

  for (const [, queue] of categoryQueues) {
    const ci = queue.findIndex((u) => u.socketId === socketId || u.userId === userId);
    if (ci !== -1) queue.splice(ci, 1);
  }

  const gri = groupQueue.findIndex((u) => u.socketId === socketId || u.userId === userId);
  if (gri !== -1) groupQueue.splice(gri, 1);
}

function finalizeLeave(io: SocketIOServer, userId: string, roomId: string) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const leaver = room.users.find((u) => u.userId === userId);
  if (!leaver) return;

  // Remove from room
  room.users = room.users.filter((u) => u.userId !== userId);
  socketToRoom.delete(leaver.socketId);
  userToRoom.delete(userId);

  const leaverSocket = io.sockets.sockets.get(leaver.socketId);
  if (leaverSocket) leaverSocket.leave(roomId);

  if (room.isGroup) {
    // Notify remaining members
    io.to(roomId).emit("participant-left", {
      pseudonym: leaver.pseudonym,
      remainingCount: room.users.length,
    });

    if (room.users.length <= 1) {
      room.users.forEach((u) => {
        socketToRoom.delete(u.socketId);
        userToRoom.delete(u.userId);
        const s = io.sockets.sockets.get(u.socketId);
        if (s) {
          s.emit("partner-left");
          s.leave(roomId);
        }
      });
      activeRooms.delete(roomId);
    }
  } else {
    // Solo — notify partner and close room
    room.users.forEach((u) => {
      socketToRoom.delete(u.socketId);
      userToRoom.delete(u.userId);
      const s = io.sockets.sockets.get(u.socketId);
      if (s) {
        s.emit("partner-left");
        s.leave(roomId);
      }
    });
    activeRooms.delete(roomId);
  }

  console.log(`Room ${roomId}: ${leaver.pseudonym} left`);
}

export function initializeSocket(io: SocketIOServer) {
  // Periodic checks
  setInterval(() => checkGroupQueue(io), 3000);
  setInterval(() => checkCategoryQueues(io), 5000);

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Rejoin after refresh/reconnect
    socket.on("rejoin", (data: { userId: string; roomId: string }) => {
      const { userId, roomId } = data;

      // Cancel disconnect timeout if pending
      const pending = disconnectedUsers.get(userId);
      if (pending) {
        clearTimeout(pending.timeout);
        disconnectedUsers.delete(userId);
      }

      const room = activeRooms.get(roomId);
      if (!room) {
        socket.emit("rejoin-failed");
        return;
      }

      const user = room.users.find((u) => u.userId === userId);
      if (!user) {
        socket.emit("rejoin-failed");
        return;
      }

      // Update socketId and reconnect
      const oldSocketId = user.socketId;
      socketToRoom.delete(oldSocketId);
      user.socketId = socket.id;
      user.connected = true;
      socketToRoom.set(socket.id, roomId);
      userToRoom.set(userId, roomId);
      socket.join(roomId);

      // Send room state back to client
      if (room.isGroup) {
        socket.emit("rejoin-success", {
          roomId,
          isGroup: true,
          myPseudonym: user.pseudonym,
          myColor: user.color,
          category: room.category,
          participants: room.users.filter((u) => u.connected).map((p) => ({
            pseudonym: p.pseudonym,
            color: p.color,
            isMe: p.userId === userId,
          })),
        });
      } else {
        const partner = room.users.find((u) => u.userId !== userId);
        socket.emit("rejoin-success", {
          roomId,
          isGroup: false,
          myPseudonym: user.pseudonym,
          partnerPseudonym: partner?.pseudonym || "",
          partnerConnected: partner?.connected ?? false,
          category: room.category,
        });
      }

      // Notify others that user reconnected
      socket.to(roomId).emit("partner-reconnected", { pseudonym: user.pseudonym });
      console.log(`Rejoin: ${user.pseudonym} back in ${roomId}`);
    });

    socket.on("find-match", (data: { userId: string; mode: string; category?: string }) => {
      const { userId, mode, category } = data;

      removeFromAllQueues(socket.id, userId);

      // Leave existing room explicitly
      const existingRoomId = socketToRoom.get(socket.id) || userToRoom.get(userId);
      if (existingRoomId) {
        // Cancel any pending disconnect timeout
        const pending = disconnectedUsers.get(userId);
        if (pending) {
          clearTimeout(pending.timeout);
          disconnectedUsers.delete(userId);
        }
        finalizeLeave(io, userId, existingRoomId);
      }

      const now = Date.now();

      if (mode === "group") {
        groupQueue.push({ socketId: socket.id, userId, joinedAt: now });
        socket.emit("waiting", { mode: "group", queueSize: groupQueue.length });
        checkGroupQueue(io);
        return;
      }

      if (category) {
        if (!categoryQueues.has(category)) {
          categoryQueues.set(category, []);
        }
        const queue = categoryQueues.get(category)!;

        if (queue.length > 0) {
          const partner = queue.shift()!;
          if (partner.userId === userId) {
            queue.push({ socketId: socket.id, userId, category, joinedAt: now });
            socket.emit("waiting", { mode: "category", category });
            return;
          }
          createSoloRoom(io, partner, { socketId: socket.id, userId, category, joinedAt: now }, category);
        } else {
          queue.push({ socketId: socket.id, userId, category, joinedAt: now });
          socket.emit("waiting", { mode: "category", category });
        }
        return;
      }

      if (generalQueue.length > 0) {
        const partner = generalQueue.shift()!;
        if (partner.userId === userId) {
          generalQueue.push({ socketId: socket.id, userId, joinedAt: now });
          socket.emit("waiting", { mode: "general" });
          return;
        }
        createSoloRoom(io, partner, { socketId: socket.id, userId, joinedAt: now });
      } else {
        generalQueue.push({ socketId: socket.id, userId, joinedAt: now });
        socket.emit("waiting", { mode: "general" });
      }
    });

    socket.on("send-message", (data: { roomId: string; message: string }) => {
      const room = activeRooms.get(data.roomId);
      if (!room) return;

      const sender = room.users.find((u) => u.socketId === socket.id);
      if (!sender) return;

      pendingMessageCount++;

      socket.to(data.roomId).emit("receive-message", {
        pseudonym: sender.pseudonym,
        color: sender.color,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    socket.on("typing", (roomId: string) => {
      const room = activeRooms.get(roomId);
      if (!room) return;
      const sender = room.users.find((u) => u.socketId === socket.id);
      if (!sender) return;
      socket.to(roomId).emit("partner-typing", { pseudonym: sender.pseudonym, color: sender.color });
    });

    socket.on("stop-typing", (roomId: string) => {
      socket.to(roomId).emit("partner-stop-typing");
    });

    socket.on("leave-chat", (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      // Cancel any pending disconnect timeout
      const pending = disconnectedUsers.get(userId);
      if (pending) {
        clearTimeout(pending.timeout);
        disconnectedUsers.delete(userId);
      }
      finalizeLeave(io, userId, roomId);
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      removeFromAllQueues(socket.id, "");

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = activeRooms.get(roomId);
      if (!room) return;

      const user = room.users.find((u) => u.socketId === socket.id);
      if (!user) return;

      // Mark as temporarily disconnected
      user.connected = false;

      // Notify others
      socket.to(roomId).emit("partner-disconnected", { pseudonym: user.pseudonym });

      // Start grace period — if they don't reconnect in time, finalize leave
      const timeout = setTimeout(() => {
        disconnectedUsers.delete(user.userId);
        finalizeLeave(io, user.userId, roomId);
      }, DISCONNECT_GRACE_MS);

      disconnectedUsers.set(user.userId, {
        userId: user.userId,
        roomId,
        timeout,
      });

      console.log(`${user.pseudonym} disconnected, ${DISCONNECT_GRACE_MS / 1000}s grace period`);
    });
  });
}
