import { Server as SocketIOServer } from "socket.io";
import { generatePseudonym } from "../lib/pseudonyms";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getToken } from "next-auth/jwt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MAX_MESSAGE_LENGTH = 2000;

function isGuest(userId: string): boolean {
  return userId.startsWith("guest_");
}

// Group chat colors for participants
const GROUP_COLORS = ["#3b82f6", "#60a5fa", "#f472b6", "#10b981", "#f59e0b"];

// --- Rate Limiting Config ---
const MAX_CHATS_PER_HOUR = 15;
const MIN_MESSAGE_INTERVAL_MS = 500;

interface WaitingUser {
  socketId: string;
  userId: string;
  joinedAt: number;
  isListener?: boolean;
}

interface RoomUser {
  socketId: string;
  userId: string;
  pseudonym: string;
  color: string;
  connected: boolean;
  isListener?: boolean;
}

interface ChatRoom {
  roomId: string;
  isGroup: boolean;
  category?: string;
  users: RoomUser[];
  startedAt: number;
  timeLimitRemoved: boolean;
  expiryTimeout?: ReturnType<typeof setTimeout>;
}

const CHAT_TIME_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

interface DisconnectedUser {
  userId: string;
  roomId: string;
  timeout: ReturnType<typeof setTimeout>;
}

// Queues
const generalQueue: WaitingUser[] = [];
const moodQueues: Map<string, WaitingUser[]> = new Map(); // mood id → waiting users
const listenerQueue: WaitingUser[] = []; // "slusam" mood users wait here
const topicQueue: Map<string, WaitingUser[]> = new Map(); // topic id → waiting users
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
    pendingSoloChats += solo;
    pendingGroupChats += group;
    pendingRatings += ratings;
    pendingReports += reports;
    pendingDurations.push(...durations);
    for (const [catId, count] of categoryBatch) {
      pendingCategoryUsage.set(catId, (pendingCategoryUsage.get(catId) || 0) + count);
    }
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

  const room: ChatRoom = { roomId, isGroup: true, users, startedAt: Date.now(), timeLimitRemoved: false };
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
  startRoomTimer(io, roomId);
  console.log(`Group created: ${users.map((u) => u.pseudonym).join(", ")} in ${roomId}`);
}

function checkMoodQueues(io: SocketIOServer) {
  const now = Date.now();

  // Try to match listeners with any talker in mood queues
  for (let li = listenerQueue.length - 1; li >= 0; li--) {
    const listener = listenerQueue[li];
    let matched = false;
    // Find a talker from any mood queue
    for (const [moodId, queue] of moodQueues) {
      if (queue.length > 0) {
        const talker = queue.shift()!;
        listenerQueue.splice(li, 1);
        createSoloRoom(io, listener, talker, moodId);
        if (queue.length === 0) moodQueues.delete(moodId);
        matched = true;
        break;
      }
    }
    // Timeout: listener waiting > 20s → general queue
    if (!matched && now - listener.joinedAt >= 20000) {
      listenerQueue.splice(li, 1);
      generalQueue.push(listener);
      const s = io.sockets.sockets.get(listener.socketId);
      if (s) s.emit("mood-timeout");
      tryMatchGeneral(io);
    }
  }

  // Timeout talkers in mood queues → general queue
  for (const [moodId, queue] of moodQueues) {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (now - queue[i].joinedAt >= 20000) {
        const user = queue.splice(i, 1)[0];
        generalQueue.push(user);
        const s = io.sockets.sockets.get(user.socketId);
        if (s) s.emit("mood-timeout");
        tryMatchGeneral(io);
      }
    }
    if (queue.length === 0) moodQueues.delete(moodId);
  }

  // Timeout topic queue users → general queue
  for (const [topicId, queue] of topicQueue) {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (now - queue[i].joinedAt >= 20000) {
        const user = queue.splice(i, 1)[0];
        generalQueue.push(user);
        const s = io.sockets.sockets.get(user.socketId);
        if (s) s.emit("mood-timeout");
        tryMatchGeneral(io);
      }
    }
    if (queue.length === 0) topicQueue.delete(topicId);
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
    roomId, isGroup: false, category, startedAt: Date.now(), timeLimitRemoved: false,
    users: [
      { socketId: user1.socketId, userId: user1.userId, pseudonym: pseudonym1, color: GROUP_COLORS[0], connected: true, isListener: user1.isListener },
      { socketId: user2.socketId, userId: user2.userId, pseudonym: pseudonym2, color: GROUP_COLORS[1], connected: true, isListener: user2.isListener },
    ],
  };

  activeRooms.set(roomId, room);
  socketToRoom.set(user1.socketId, roomId);
  socketToRoom.set(user2.socketId, roomId);
  userToRoom.set(user1.userId, roomId);
  userToRoom.set(user2.userId, roomId);
  recordChatStart(user1.userId);
  recordChatStart(user2.userId);

  const partnerIsListener1 = user2.isListener || false;
  const partnerIsListener2 = user1.isListener || false;

  const s1 = io.sockets.sockets.get(user1.socketId);
  if (s1) {
    s1.join(roomId);
    s1.emit("matched", { roomId, isGroup: false, myPseudonym: pseudonym1, partnerPseudonym: pseudonym2, category, partnerIsListener: partnerIsListener1 });
  }
  const s2 = io.sockets.sockets.get(user2.socketId);
  if (s2) {
    s2.join(roomId);
    s2.emit("matched", { roomId, isGroup: false, myPseudonym: pseudonym2, partnerPseudonym: pseudonym1, category, partnerIsListener: partnerIsListener2 });
  }

  pendingChatCount++;
  pendingSoloChats++;
  if (category) pendingCategoryUsage.set(category, (pendingCategoryUsage.get(category) || 0) + 1);
  incrementUserChats(user1.userId);
  incrementUserChats(user2.userId);
  startRoomTimer(io, roomId);
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

function startRoomTimer(io: SocketIOServer, roomId: string) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  // Warn at 4 min (60s left)
  const warnTimeout = setTimeout(() => {
    const r = activeRooms.get(roomId);
    if (r && !r.timeLimitRemoved) {
      io.to(roomId).emit("time-warning", { secondsLeft: 60 });
    }
  }, CHAT_TIME_LIMIT_MS - 60000);

  // Expire at 5 min
  const expiryTimeout = setTimeout(() => {
    const r = activeRooms.get(roomId);
    if (!r || r.timeLimitRemoved) return;
    io.to(roomId).emit("time-expired");
    // Auto-end the room
    for (const u of [...r.users]) {
      finalizeLeave(io, u.userId, roomId);
    }
  }, CHAT_TIME_LIMIT_MS);

  room.expiryTimeout = expiryTimeout;
  // Store warn timeout so we can clear it too
  (room as ChatRoom & { warnTimeout?: ReturnType<typeof setTimeout> }).warnTimeout = warnTimeout;
}

function clearRoomTimers(room: ChatRoom) {
  if (room.expiryTimeout) clearTimeout(room.expiryTimeout);
  if ((room as ChatRoom & { warnTimeout?: ReturnType<typeof setTimeout> }).warnTimeout) {
    clearTimeout((room as ChatRoom & { warnTimeout?: ReturnType<typeof setTimeout> }).warnTimeout);
  }
}

function removeFromAllQueues(socketId: string, userId: string) {
  const match = (u: WaitingUser) => u.socketId === socketId || u.userId === userId;
  const gi = generalQueue.findIndex(match);
  if (gi !== -1) generalQueue.splice(gi, 1);
  for (const [, queue] of moodQueues) {
    const ci = queue.findIndex(match);
    if (ci !== -1) queue.splice(ci, 1);
  }
  const li = listenerQueue.findIndex(match);
  if (li !== -1) listenerQueue.splice(li, 1);
  for (const [, queue] of topicQueue) {
    const ti = queue.findIndex(match);
    if (ti !== -1) queue.splice(ti, 1);
  }
  const gri = groupQueue.findIndex(match);
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
      completedRooms.set(roomId, [...room.users, leaver]);
      clearRoomTimers(room);
      room.users.forEach((u) => {
        socketToRoom.delete(u.socketId);
        userToRoom.delete(u.userId);
        const s = io.sockets.sockets.get(u.socketId);
        if (s) { s.emit("partner-left"); s.leave(roomId); }
      });
      activeRooms.delete(roomId);
    }
  } else {
    completedRooms.set(roomId, [...room.users, leaver]);
    clearRoomTimers(room);
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
  setInterval(() => checkMoodQueues(io), 5000);

  // Cleanup stale directConnectWaiting entries every 60s
  setInterval(() => {
    const cutoff = Date.now() - 300_000; // 5 min
    for (const [id, w] of directConnectWaiting) {
      if (w.joinedAt < cutoff) directConnectWaiting.delete(id);
    }
  }, 60_000);

  // Socket.io auth middleware — extract userId from JWT or assign guest ID
  io.use(async (socket, next) => {
    try {
      // Try to extract JWT from cookie (NextAuth stores session as cookie)
      const cookieHeader = socket.handshake.headers.cookie || "";
      // Parse cookies manually
      const cookies: Record<string, string> = {};
      cookieHeader.split(";").forEach((c) => {
        const [key, ...val] = c.trim().split("=");
        if (key) cookies[key.trim()] = val.join("=");
      });

      const secret = process.env.NEXTAUTH_SECRET;
      if (secret) {
        // Build a minimal request-like object for getToken
        const token = await getToken({
          req: { headers: { cookie: cookieHeader } } as Parameters<typeof getToken>[0]["req"],
          secret,
        });
        if (token?.id) {
          socket.data.userId = token.id as string;
          return next();
        }
      }

      // Fallback: accept client-supplied userId only if it's a guest ID
      const clientUserId = socket.handshake.auth?.userId as string | undefined;
      if (clientUserId && isGuest(clientUserId)) {
        socket.data.userId = clientUserId;
        return next();
      }

      // No valid auth — assign new guest ID
      const crypto = await import("crypto");
      socket.data.userId = `guest_${crypto.randomUUID()}`;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    const authenticatedUserId: string = socket.data.userId || `guest_${socket.id}`;
    console.log(`User connected: ${socket.id} (${isGuest(authenticatedUserId) ? "guest" : "auth"})`);

    // --- Rejoin ---
    socket.on("rejoin", (data: { roomId: string }) => {
      const userId = authenticatedUserId;
      const { roomId } = data;
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
    socket.on("find-match", (data: { mode: string; mood?: string; topic?: string; connectionId?: string; listener?: boolean }) => {
      const userId = authenticatedUserId;
      const { mode, mood, topic, connectionId, listener } = data;

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
          directConnectWaiting.delete(connectionId);
          createSoloRoom(io, waiting, { socketId: socket.id, userId, joinedAt: now });
        } else {
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

      // Topic matching
      if (topic) {
        if (!topicQueue.has(topic)) topicQueue.set(topic, []);
        const queue = topicQueue.get(topic)!;
        if (queue.length > 0) {
          const partner = queue.shift()!;
          if (partner.userId === userId) {
            queue.push({ socketId: socket.id, userId, joinedAt: now });
            socket.emit("waiting", { mode: "topic", topic });
            return;
          }
          createSoloRoom(io, partner, { socketId: socket.id, userId, joinedAt: now }, `topic:${topic}`);
        } else {
          queue.push({ socketId: socket.id, userId, joinedAt: now });
          socket.emit("waiting", { mode: "topic", topic });
        }
        if (topicQueue.get(topic)?.length === 0) topicQueue.delete(topic);
        return;
      }

      // Mood matching
      if (mood) {
        const isListenerMood = mood === "slusam" || listener === true;
        if (isListenerMood) {
          // Listener: try to match with any talker in mood queues immediately
          for (const [moodId, queue] of moodQueues) {
            if (queue.length > 0) {
              const talker = queue.shift()!;
              if (talker.userId !== userId) {
                createSoloRoom(io, talker, { socketId: socket.id, userId, joinedAt: now, isListener: true }, moodId);
                if (queue.length === 0) moodQueues.delete(moodId);
                return;
              }
              queue.unshift(talker); // put back, same user
            }
          }
          // No talker available, wait
          listenerQueue.push({ socketId: socket.id, userId, joinedAt: now, isListener: true });
          socket.emit("waiting", { mode: "mood", mood });
        } else {
          // Talker: try to match with listener first
          if (listenerQueue.length > 0) {
            const listenerUser = listenerQueue.shift()!;
            if (listenerUser.userId !== userId) {
              createSoloRoom(io, listenerUser, { socketId: socket.id, userId, joinedAt: now }, mood);
              return;
            }
            listenerQueue.unshift(listenerUser);
          }
          // Try same mood queue
          if (!moodQueues.has(mood)) moodQueues.set(mood, []);
          const queue = moodQueues.get(mood)!;
          if (queue.length > 0) {
            const partner = queue.shift()!;
            if (partner.userId !== userId) {
              createSoloRoom(io, partner, { socketId: socket.id, userId, joinedAt: now }, mood);
              if (queue.length === 0) moodQueues.delete(mood);
              return;
            }
            queue.unshift(partner);
          }
          queue.push({ socketId: socket.id, userId, joinedAt: now });
          socket.emit("waiting", { mode: "mood", mood });
        }
        // Track mood usage for stats
        pendingCategoryUsage.set(mood, (pendingCategoryUsage.get(mood) || 0) + 1);
        return;
      }

      // General queue (no mood/topic)
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

    // --- Send Message (with rate limit + length check) ---
    socket.on("send-message", (data: { roomId: string; message: string }) => {
      if (typeof data.message !== "string") return;
      const trimmed = data.message.slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed.trim()) return;
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
        pseudonym: sender.pseudonym, color: sender.color, message: trimmed, timestamp: Date.now(),
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
      const room = activeRooms.get(roomId);
      if (!room) return;
      if (!room.users.find((u) => u.socketId === socket.id)) return;
      socket.to(roomId).emit("partner-stop-typing");
    });

    // --- Leave Chat ---
    socket.on("leave-chat", (data: { roomId: string }) => {
      const userId = authenticatedUserId;
      const { roomId } = data;
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

      // Rate all partners (in group, rate everyone) — prevent duplicates
      const partners = users.filter((u) => u.userId !== rater.userId);
      for (const partner of partners) {
        try {
          const existing = await prisma.rating.findFirst({ where: { raterId: rater.userId, roomId } });
          if (existing) return; // already rated this room
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

      // Validate inputs
      const validReasons = ["uvrede", "pretnje", "spam", "ostalo"];
      if (typeof reason !== "string" || !validReasons.includes(reason)) return;
      if (description !== undefined && (typeof description !== "string" || description.length > 1000)) return;
      const safeDescription = description ? description.slice(0, 1000) : undefined;

      let users = activeRooms.get(roomId)?.users || completedRooms.get(roomId);
      if (!users) return;

      const reporter = users.find((u) => u.socketId === socket.id);
      if (!reporter) return;

      const reported = users.filter((u) => u.userId !== reporter.userId);
      for (const target of reported) {
        try {
          await prisma.report.create({
            data: { roomId, reporterId: reporter.userId, reportedId: target.userId, reason, description: safeDescription },
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

    // --- Keep Talking (toggle) ---
    socket.on("keep-talking", async (data: { roomId: string }) => {
      const { roomId } = data;
      const room = activeRooms.get(roomId);
      if (!room) return;

      const user = room.users.find((u) => u.socketId === socket.id);
      if (!user) return;

      if (!keepTalkingVotes.has(roomId)) keepTalkingVotes.set(roomId, new Set());
      const votes = keepTalkingVotes.get(roomId)!;

      // Toggle: if already voted, remove vote
      if (votes.has(user.userId)) {
        votes.delete(user.userId);
        socket.to(roomId).emit("partner-cancel-keep-talking", { pseudonym: user.pseudonym });
        return;
      }

      votes.add(user.userId);
      socket.to(roomId).emit("partner-keep-talking", { pseudonym: user.pseudonym });

      // Check if everyone voted (solo: 2, group: all)
      const requiredVotes = room.isGroup ? room.users.length : 2;
      if (votes.size >= requiredVotes) {
        // Both agreed — remove time limit!
        room.timeLimitRemoved = true;
        clearRoomTimers(room);

        // Generate connection ID for reconnecting later
        let connId = generateConnectionId();
        let existing = await prisma.connection.findUnique({ where: { connectionId: connId } });
        while (existing) {
          connId = generateConnectionId();
          existing = await prisma.connection.findUnique({ where: { connectionId: connId } });
        }

        const user1 = room.users[0];
        const user2 = room.users[1] || room.users[0];
        try {
          await prisma.connection.create({
            data: { connectionId: connId, user1Id: user1.userId, user2Id: user2.userId, roomId },
          });
        } catch (e) {
          console.error("Failed to save connection:", e);
        }

        // Emit matched event + connection ID
        io.to(roomId).emit("keep-talking-matched", { connectionId: connId });
        keepTalkingVotes.delete(roomId);
        console.log(`Keep-talking matched! Connection ${connId} for room ${roomId} — time limit removed`);
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
