import { Server as SocketIOServer } from "socket.io";
import { generatePseudonym } from "../lib/pseudonyms";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function isGuest(userId: string): boolean {
  return userId.startsWith("guest_");
}

// Group chat colors for participants
const GROUP_COLORS = ["#8b5cf6", "#60a5fa", "#f472b6", "#10b981", "#f59e0b"];

// --- Rate Limiting Config ---
const MAX_CHATS_PER_HOUR = 15;
const MIN_MESSAGE_INTERVAL_MS = 500;

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
  startedAt: number;
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

// Completed rooms — kept 5 min for rating/reporting after chat ends
const completedRooms: Map<string, RoomUser[]> = new Map();

// Temporarily disconnected users (grace period for reconnect)
const disconnectedUsers: Map<string, DisconnectedUser> = new Map();
const DISCONNECT_GRACE_MS = 30000;

// "Keep talking" votes per room
const keepTalkingVotes: Map<string, Set<string>> = new Map();

// Direct connect waiting (user waiting for their connection partner)
const directConnectWaiting: Map<string, WaitingUser> = new Map(); // connectionId → WaitingUser

// Rate limiting
const chatStartTimes: Map<string, number[]> = new Map(); // userId → timestamps
const lastMessageTime: Map<string, number> = new Map(); // socketId → timestamp

// Stats tracking
let pendingChatCount = 0;
let pendingMessageCount = 0;
let pendingSoloChats = 0;
let pendingGroupChats = 0;
let pendingRatings = 0;
let pendingReports = 0;
const pendingDurations: number[] = [];
const pendingCategoryUsage: Map<string, number> = new Map();

async function flushStats() {
  const hasStats = pendingChatCount > 0 || pendingMessageCount > 0 || pendingSoloChats > 0 || pendingGroupChats > 0 || pendingRatings > 0 || pendingReports > 0;
  const hasDurations = pendingDurations.length > 0;
  const hasCategory = pendingCategoryUsage.size > 0;
  if (!hasStats && !hasCategory && !hasDurations) return;

  const chats = pendingChatCount;
  const messages = pendingMessageCount;
  const solo = pendingSoloChats;
  const group = pendingGroupChats;
  const ratings = pendingRatings;
  const reports = pendingReports;
  const durations = [...pendingDurations];
  const categoryBatch = new Map(pendingCategoryUsage);
  pendingChatCount = 0;
  pendingMessageCount = 0;
  pendingSoloChats = 0;
  pendingGroupChats = 0;
  pendingRatings = 0;
  pendingReports = 0;
  pendingDurations.length = 0;
  pendingCategoryUsage.clear();

  try {
    // Compute new avg duration
    let durationUpdate = {};
    if (durations.length > 0) {
      const currentStats = await prisma.stats.findUnique({ where: { id: "global" } });
      const oldAvg = currentStats?.avgChatDuration ?? 0;
      const oldTotal = currentStats?.totalChatsCreated ?? 0;
      const newAvg = Math.round(
        (oldAvg * oldTotal + durations.reduce((a, b) => a + b, 0)) / (oldTotal + chats || 1)
      );
      durationUpdate = { avgChatDuration: newAvg };
    }

    await prisma.stats.upsert({
      where: { id: "global" },
      create: { id: "global", totalChatsCreated: chats, totalMessages: messages, soloChats: solo, groupChats: group, totalRatings: ratings, totalReports: reports },
      update: {
        totalChatsCreated: { increment: chats },
        totalMessages: { increment: messages },
        soloChats: { increment: solo },
        groupChats: { increment: group },
        totalRatings: { increment: ratings },
        totalReports: { increment: reports },
        ...durationUpdate,
      },
    });

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

setInterval(flushStats, 30000);

// Clean up completed rooms older than 5 min
setInterval(() => {
  // completedRooms doesn't track time, so just limit size
  if (completedRooms.size > 500) {
    const keys = [...completedRooms.keys()];
    for (let i = 0; i < keys.length - 200; i++) {
      completedRooms.delete(keys[i]);
    }
  }
}, 60000);

// --- Rate Limiting Helpers ---
function isRateLimitedChat(userId: string): number | false {
  const times = chatStartTimes.get(userId) || [];
  const hourAgo = Date.now() - 3600000;
  const recent = times.filter((t) => t > hourAgo);
  chatStartTimes.set(userId, recent);
  if (recent.length >= MAX_CHATS_PER_HOUR) {
    const oldest = recent[0];
    return Math.ceil((oldest + 3600000 - Date.now()) / 1000);
  }
  return false;
}

function recordChatStart(userId: string) {
  const times = chatStartTimes.get(userId) || [];
  times.push(Date.now());
  chatStartTimes.set(userId, times);
}

function isRateLimitedMessage(socketId: string): boolean {
  const last = lastMessageTime.get(socketId) || 0;
  if (Date.now() - last < MIN_MESSAGE_INTERVAL_MS) return true;
  lastMessageTime.set(socketId, Date.now());
  return false;
}

// --- Room Creation ---
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
    while (usedPseudonyms.has(pseudonym)) pseudonym = generatePseudonym();
    usedPseudonyms.add(pseudonym);
    return { socketId: m.socketId, userId: m.userId, pseudonym, color: GROUP_COLORS[i % GROUP_COLORS.length], connected: true };
  });

  const room: ChatRoom = { roomId, isGroup: true, users, startedAt: Date.now() };
  activeRooms.set(roomId, room);

  users.forEach((u) => {
    socketToRoom.set(u.socketId, roomId);
    userToRoom.set(u.userId, roomId);
    recordChatStart(u.userId);
    const userSocket = io.sockets.sockets.get(u.socketId);
    if (userSocket) {
      userSocket.join(roomId);
      userSocket.emit("matched", {
        roomId, isGroup: true, myPseudonym: u.pseudonym, myColor: u.color,
        participants: users.map((p) => ({ pseudonym: p.pseudonym, color: p.color, isMe: p.socketId === u.socketId })),
      });
    }
  });

  pendingChatCount++;
  pendingGroupChats++;
  users.forEach((u) => incrementUserChats(u.userId));
  console.log(`Group created: ${users.map((u) => u.pseudonym).join(", ")} in ${roomId}`);
}

function checkCategoryQueues(io: SocketIOServer) {
  const now = Date.now();
  for (const [categoryId, queue] of categoryQueues) {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (now - queue[i].joinedAt >= 20000) {
        const user = queue.splice(i, 1)[0];
        generalQueue.push(user);
        const userSocket = io.sockets.sockets.get(user.socketId);
        if (userSocket) userSocket.emit("category-timeout");
        tryMatchGeneral(io);
      }
    }
    if (queue.length === 0) categoryQueues.delete(categoryId);
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
    roomId, isGroup: false, category, startedAt: Date.now(),
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
  recordChatStart(user1.userId);
  recordChatStart(user2.userId);

  const s1 = io.sockets.sockets.get(user1.socketId);
  if (s1) {
    s1.join(roomId);
    s1.emit("matched", { roomId, isGroup: false, myPseudonym: pseudonym1, partnerPseudonym: pseudonym2, category });
  }
  const s2 = io.sockets.sockets.get(user2.socketId);
  if (s2) {
    s2.join(roomId);
    s2.emit("matched", { roomId, isGroup: false, myPseudonym: pseudonym2, partnerPseudonym: pseudonym1, category });
  }

  pendingChatCount++;
  pendingSoloChats++;
  if (category) pendingCategoryUsage.set(category, (pendingCategoryUsage.get(category) || 0) + 1);
  incrementUserChats(user1.userId);
  incrementUserChats(user2.userId);
  console.log(`Match: ${pseudonym1} <-> ${pseudonym2}${category ? ` [${category}]` : ""}`);
}

async function incrementUserChats(userId: string) {
  if (isGuest(userId)) return;
  try {
    await prisma.user.update({ where: { id: userId }, data: { totalChats: { increment: 1 } } });
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

  // Track chat duration
  const duration = Math.round((Date.now() - room.startedAt) / 1000);
  pendingDurations.push(duration);

  room.users = room.users.filter((u) => u.userId !== userId);
  socketToRoom.delete(leaver.socketId);
  userToRoom.delete(userId);
  const leaverSocket = io.sockets.sockets.get(leaver.socketId);
  if (leaverSocket) leaverSocket.leave(roomId);

  if (room.isGroup) {
    io.to(roomId).emit("participant-left", { pseudonym: leaver.pseudonym, remainingCount: room.users.length });
    if (room.users.length <= 1) {
      // Save for rating
      completedRooms.set(roomId, [...room.users, leaver]);
      room.users.forEach((u) => {
        socketToRoom.delete(u.socketId);
        userToRoom.delete(u.userId);
        const s = io.sockets.sockets.get(u.socketId);
        if (s) { s.emit("partner-left"); s.leave(roomId); }
      });
      activeRooms.delete(roomId);
    }
  } else {
    // Save for rating
    completedRooms.set(roomId, [...room.users, leaver]);
    room.users.forEach((u) => {
      socketToRoom.delete(u.socketId);
      userToRoom.delete(u.userId);
      const s = io.sockets.sockets.get(u.socketId);
      if (s) { s.emit("partner-left"); s.leave(roomId); }
    });
    activeRooms.delete(roomId);
  }

  // Clean up keep talking votes
  keepTalkingVotes.delete(roomId);
  console.log(`Room ${roomId}: ${leaver.pseudonym} left (${duration}s)`);
}

function generateConnectionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// === MAIN SOCKET HANDLER ===
export function initializeSocket(io: SocketIOServer) {
  setInterval(() => checkGroupQueue(io), 3000);
  setInterval(() => checkCategoryQueues(io), 5000);

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Rejoin ---
    socket.on("rejoin", (data: { userId: string; roomId: string }) => {
      const { userId, roomId } = data;
      const pending = disconnectedUsers.get(userId);
      if (pending) { clearTimeout(pending.timeout); disconnectedUsers.delete(userId); }

      const room = activeRooms.get(roomId);
      if (!room) { socket.emit("rejoin-failed"); return; }

      const user = room.users.find((u) => u.userId === userId);
      if (!user) { socket.emit("rejoin-failed"); return; }

      const oldSocketId = user.socketId;
      socketToRoom.delete(oldSocketId);
      user.socketId = socket.id;
      user.connected = true;
      socketToRoom.set(socket.id, roomId);
      userToRoom.set(userId, roomId);
      socket.join(roomId);

      if (room.isGroup) {
        socket.emit("rejoin-success", {
          roomId, isGroup: true, myPseudonym: user.pseudonym, myColor: user.color, category: room.category, startedAt: room.startedAt,
          participants: room.users.filter((u) => u.connected).map((p) => ({ pseudonym: p.pseudonym, color: p.color, isMe: p.userId === userId })),
        });
      } else {
        const partner = room.users.find((u) => u.userId !== userId);
        socket.emit("rejoin-success", {
          roomId, isGroup: false, myPseudonym: user.pseudonym, partnerPseudonym: partner?.pseudonym || "",
          partnerConnected: partner?.connected ?? false, category: room.category, startedAt: room.startedAt,
        });
      }
      socket.to(roomId).emit("partner-reconnected", { pseudonym: user.pseudonym });
      console.log(`Rejoin: ${user.pseudonym} back in ${roomId}`);
    });

    // --- Find Match ---
    socket.on("find-match", (data: { userId: string; mode: string; category?: string; connectionId?: string }) => {
      const { userId, mode, category, connectionId } = data;

      // Rate limit check
      const waitSec = isRateLimitedChat(userId);
      if (waitSec !== false) {
        socket.emit("rate-limited", { type: "chat", waitSeconds: waitSec });
        return;
      }

      removeFromAllQueues(socket.id, userId);

      const existingRoomId = socketToRoom.get(socket.id) || userToRoom.get(userId);
      if (existingRoomId) {
        const pending = disconnectedUsers.get(userId);
        if (pending) { clearTimeout(pending.timeout); disconnectedUsers.delete(userId); }
        finalizeLeave(io, userId, existingRoomId);
      }

      const now = Date.now();

      // Direct connect by connection ID
      if (mode === "direct" && connectionId) {
        const waiting = directConnectWaiting.get(connectionId);
        if (waiting && waiting.userId !== userId) {
          // Partner is already waiting — match them!
          directConnectWaiting.delete(connectionId);
          createSoloRoom(io, waiting, { socketId: socket.id, userId, joinedAt: now });
        } else {
          // Wait for partner
          directConnectWaiting.set(connectionId, { socketId: socket.id, userId, joinedAt: now });
          socket.emit("waiting", { mode: "direct", connectionId });
        }
        return;
      }

      if (mode === "group") {
        groupQueue.push({ socketId: socket.id, userId, joinedAt: now });
        socket.emit("waiting", { mode: "group", queueSize: groupQueue.length });
        checkGroupQueue(io);
        return;
      }

      if (category) {
        if (!categoryQueues.has(category)) categoryQueues.set(category, []);
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

    // --- Send Message (with rate limit) ---
    socket.on("send-message", (data: { roomId: string; message: string }) => {
      if (isRateLimitedMessage(socket.id)) {
        socket.emit("rate-limited", { type: "message" });
        return;
      }
      const room = activeRooms.get(data.roomId);
      if (!room) return;
      const sender = room.users.find((u) => u.socketId === socket.id);
      if (!sender) return;
      pendingMessageCount++;
      socket.to(data.roomId).emit("receive-message", {
        pseudonym: sender.pseudonym, color: sender.color, message: data.message, timestamp: Date.now(),
      });
    });

    // --- Typing ---
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

    // --- Leave Chat ---
    socket.on("leave-chat", (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      const pending = disconnectedUsers.get(userId);
      if (pending) { clearTimeout(pending.timeout); disconnectedUsers.delete(userId); }
      finalizeLeave(io, userId, roomId);
    });

    // --- Submit Rating ---
    socket.on("submit-rating", async (data: { roomId: string; score: number }) => {
      const { roomId, score } = data;
      if (score < 1 || score > 5) return;

      // Find who this socket is — check active room first, then completed
      let users = activeRooms.get(roomId)?.users || completedRooms.get(roomId);
      if (!users) return;

      const rater = users.find((u) => u.socketId === socket.id);
      if (!rater) return;

      // Rate all partners (in group, rate everyone)
      const partners = users.filter((u) => u.userId !== rater.userId);
      for (const partner of partners) {
        try {
          await prisma.rating.create({
            data: { roomId, raterId: rater.userId, ratedId: partner.userId, score },
          });
          // Update partner's average rating (only for registered users)
          if (!isGuest(partner.userId)) {
            const allRatings = await prisma.rating.findMany({ where: { ratedId: partner.userId }, select: { score: true } });
            const avg = allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length;
            await prisma.user.update({
              where: { id: partner.userId },
              data: { avgRating: Math.round(avg * 10) / 10, totalRatings: allRatings.length },
            });
          }
        } catch (e) {
          console.error("Failed to save rating:", e);
        }
      }
      pendingRatings++;
      socket.emit("rating-submitted");
    });

    // --- Report User ---
    socket.on("report-user", async (data: { roomId: string; reason: string; description?: string }) => {
      const { roomId, reason, description } = data;

      let users = activeRooms.get(roomId)?.users || completedRooms.get(roomId);
      if (!users) return;

      const reporter = users.find((u) => u.socketId === socket.id);
      if (!reporter) return;

      const reported = users.filter((u) => u.userId !== reporter.userId);
      for (const target of reported) {
        try {
          await prisma.report.create({
            data: { roomId, reporterId: reporter.userId, reportedId: target.userId, reason, description },
          });
          // Check if auto-ban threshold reached (5 reports) — only for registered users
          if (!isGuest(target.userId)) {
            const reportCount = await prisma.report.count({
              where: { reportedId: target.userId, status: "PENDING" },
            });
            if (reportCount >= 5) {
              await prisma.user.update({
                where: { id: target.userId },
                data: { banned: true, banReason: "Automatski ban: previše prijava korisnika" },
              });
              console.log(`Auto-banned user ${target.userId} (${reportCount} reports)`);
            }
          }
        } catch (e) {
          console.error("Failed to save report:", e);
        }
      }
      pendingReports++;
      socket.emit("report-submitted");
    });

    // --- Keep Talking ---
    socket.on("keep-talking", async (data: { roomId: string }) => {
      const { roomId } = data;
      const room = activeRooms.get(roomId);
      if (!room) return;

      const user = room.users.find((u) => u.socketId === socket.id);
      if (!user) return;

      if (!keepTalkingVotes.has(roomId)) keepTalkingVotes.set(roomId, new Set());
      const votes = keepTalkingVotes.get(roomId)!;
      votes.add(user.userId);

      // Notify others that this user wants to keep talking
      socket.to(roomId).emit("partner-keep-talking", { pseudonym: user.pseudonym });

      // Check if everyone voted (solo: 2, group: all)
      const requiredVotes = room.isGroup ? room.users.length : 2;
      if (votes.size >= requiredVotes) {
        // Generate connection ID
        let connId = generateConnectionId();
        // Ensure unique
        let existing = await prisma.connection.findUnique({ where: { connectionId: connId } });
        while (existing) {
          connId = generateConnectionId();
          existing = await prisma.connection.findUnique({ where: { connectionId: connId } });
        }

        // Save connection (for solo, use first two users)
        const user1 = room.users[0];
        const user2 = room.users[1] || room.users[0];
        try {
          await prisma.connection.create({
            data: { connectionId: connId, user1Id: user1.userId, user2Id: user2.userId, roomId },
          });
        } catch (e) {
          console.error("Failed to save connection:", e);
        }

        // Emit to everyone in room
        io.to(roomId).emit("connection-created", { connectionId: connId });
        keepTalkingVotes.delete(roomId);
        console.log(`Connection created: ${connId} for room ${roomId}`);
      }
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      removeFromAllQueues(socket.id, "");
      lastMessageTime.delete(socket.id);

      // Clean up direct connect waiting
      for (const [connId, waiting] of directConnectWaiting) {
        if (waiting.socketId === socket.id) { directConnectWaiting.delete(connId); break; }
      }

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = activeRooms.get(roomId);
      if (!room) return;
      const user = room.users.find((u) => u.socketId === socket.id);
      if (!user) return;

      user.connected = false;
      socket.to(roomId).emit("partner-disconnected", { pseudonym: user.pseudonym });

      const timeout = setTimeout(() => {
        disconnectedUsers.delete(user.userId);
        finalizeLeave(io, user.userId, roomId);
      }, DISCONNECT_GRACE_MS);

      disconnectedUsers.set(user.userId, { userId: user.userId, roomId, timeout });
      console.log(`${user.pseudonym} disconnected, ${DISCONNECT_GRACE_MS / 1000}s grace period`);
    });
  });
}
