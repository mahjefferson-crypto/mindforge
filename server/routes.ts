import type { Express } from "express";
import { Server } from "http";
import { storage, sseClients, broadcastToRoom, dmSseClients, broadcastToDm } from "./storage";
import { insertHabitSchema, insertCheckInSchema, insertJournalEntrySchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(httpServer: Server, app: Express): void {
  // Reset habits daily (call on load)
  app.get("/api/user", (req, res) => {
    storage.resetDailyHabits();
    const user = storage.getUser();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.patch("/api/user", (req, res) => {
    const { name } = req.body;
    if (name && typeof name === "string") {
      const user = storage.updateUser({ name: name.trim() || "Warrior" });
      res.json(user);
    } else {
      res.status(400).json({ error: "Invalid name" });
    }
  });

  // Habits
  app.get("/api/habits", (req, res) => {
    const habits = storage.getHabits();
    res.json(habits);
  });

  app.post("/api/habits", (req, res) => {
    try {
      const data = insertHabitSchema.omit({ userId: true, streak: true, longestStreak: true, completedToday: true, totalCompletions: true, createdAt: true, lastCompletedAt: true }).parse(req.body);
      const habit = storage.createHabit({
        ...data,
        userId: 1,
        streak: 0,
        longestStreak: 0,
        completedToday: 0,
        totalCompletions: 0,
        createdAt: new Date().toISOString(),
      });
      res.json(habit);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/habits/:id/complete", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = storage.completeHabit(id);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/habits/:id", (req, res) => {
    const id = parseInt(req.params.id);
    storage.deleteHabit(id);
    res.json({ success: true });
  });

  // Check-ins
  app.get("/api/checkin/today", (req, res) => {
    const checkIn = storage.getTodayCheckIn();
    res.json(checkIn || null);
  });

  app.post("/api/checkin", (req, res) => {
    try {
      const { mood, energy, note } = req.body;
      if (!mood || !energy) return res.status(400).json({ error: "mood and energy required" });
      const moodLabels = ["", "Low", "Rough", "Steady", "Good", "Fired Up"];
      const checkIn = storage.createCheckIn({
        userId: 1,
        mood: Number(mood),
        moodLabel: moodLabels[Number(mood)] || "Steady",
        energy: Number(energy),
        note: note || null,
        xpEarned: 10,
        createdAt: new Date().toISOString(),
      });
      res.json(checkIn);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Journal
  app.get("/api/journal", (req, res) => {
    const entries = storage.getJournalEntries();
    res.json(entries);
  });

  app.post("/api/journal", (req, res) => {
    try {
      const { prompt, content } = req.body;
      if (!prompt || !content) return res.status(400).json({ error: "prompt and content required" });
      const result = storage.createJournalEntry({
        userId: 1,
        prompt,
        content,
        xpEarned: 30,
        createdAt: new Date().toISOString(),
      });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // XP events
  app.get("/api/xp-events", (req, res) => {
    const events = storage.getXpEvents(20);
    res.json(events);
  });

  // Weekly moods
  app.get("/api/moods/weekly", (req, res) => {
    const moods = storage.getWeeklyMoods();
    res.json(moods);
  });

  // ── Community ────────────────────────────────────────────

  // Get all rooms
  app.get("/api/community/rooms", (req, res) => {
    const rooms = storage.getCommunityRooms();
    // Attach live listener count
    const enriched = rooms.map(r => ({
      ...r,
      liveCount: sseClients.get(r.slug)?.size ?? 0,
    }));
    res.json(enriched);
  });

  // Get messages for a room
  app.get("/api/community/rooms/:slug/messages", (req, res) => {
    const { slug } = req.params;
    const room = storage.getCommunityRoom(slug);
    if (!room) return res.status(404).json({ error: "Room not found" });
    const messages = storage.getRoomMessages(slug);
    res.json(messages);
  });

  // Get visitor's handle
  app.get("/api/community/me", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const handle = storage.getOrCreateHandle(visitorId);
    res.json({ visitorId, handle });
  });

  // Post a message
  app.post("/api/community/rooms/:slug/messages", (req, res) => {
    const { slug } = req.params;
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content required" });
    }
    if (content.trim().length > 500) {
      return res.status(400).json({ error: "max 500 chars" });
    }
    const room = storage.getCommunityRoom(slug);
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Determine handle: use username if showUsername=1 and username set
    const profile = storage.getProfile(visitorId);
    const isAnon = !profile || profile.showUsername === 0 || !profile.username ? 1 : 0;
    const handle = (isAnon === 0 && profile?.username) ? profile.username : storage.getOrCreateHandle(visitorId);

    const message = storage.postMessage({
      roomSlug: slug,
      visitorId,
      handle,
      isAnon,
      content: content.trim(),
      reactions: "{}",
      createdAt: new Date().toISOString(),
    });
    broadcastToRoom(slug, { type: "new_message", message });
    res.json(message);
  });

  // Add a reaction
  app.post("/api/community/messages/:id/react", (req, res) => {
    const id = parseInt(req.params.id);
    const { emoji } = req.body;
    const ALLOWED = ["💪", "❤️", "🙏", "🔥", "👊", "😔"];
    if (!emoji || !ALLOWED.includes(emoji)) {
      return res.status(400).json({ error: "Invalid emoji" });
    }
    const updated = storage.addReaction(id, emoji);
    if (!updated) return res.status(404).json({ error: "Message not found" });
    // Broadcast reaction update to the room
    broadcastToRoom(updated.roomSlug, { type: "reaction_update", message: updated });
    res.json(updated);
  });

  // ── Profile & Identity ───────────────────────────────────────────

  // GET /api/profile — get or create my profile
  app.get("/api/profile", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const profile = storage.getOrCreateProfile(visitorId);
    const handle = storage.getOrCreateHandle(visitorId);
    res.json({ ...profile, handle });
  });

  // PATCH /api/profile — update username / showUsername
  app.patch("/api/profile", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const { username, showUsername } = req.body;
    const updates: Record<string, any> = {};
    if (typeof username === "string") {
      const trimmed = username.trim().slice(0, 24);
      updates.username = trimmed || null;
    }
    if (typeof showUsername === "number") {
      updates.showUsername = showUsername ? 1 : 0;
    }
    const profile = storage.updateProfile(visitorId, updates);
    const handle = storage.getOrCreateHandle(visitorId);
    res.json({ ...profile, handle });
  });

  // POST /api/subscribe — activate Pro (mock, no real payment)
  app.post("/api/subscribe", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const profile = storage.activatePro(visitorId);
    res.json({ success: true, profile });
  });

  // ── Onboarding ────────────────────────────────────────────────

  // POST /api/onboarding — save onboarding data
  app.post("/api/onboarding", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const { displayName, focusAreas, dailyMinutes } = req.body;
    const updates: Record<string, any> = { onboarded: 1 };
    if (typeof displayName === "string" && displayName.trim()) {
      updates.displayName = displayName.trim().slice(0, 30);
      updates.username = displayName.trim().slice(0, 24);
      updates.showUsername = 1;
    }
    if (typeof focusAreas === "string") {
      updates.focusAreas = focusAreas;
    }
    if (typeof dailyMinutes === "number") {
      updates.dailyMinutes = dailyMinutes;
    }
    const profile = storage.updateProfile(visitorId, updates);
    const handle = storage.getOrCreateHandle(visitorId);
    res.json({ ...profile, handle });
  });

  // ── Push Notifications ─────────────────────────────────────────

  // POST /api/push/subscribe — save push subscription
  app.post("/api/push/subscribe", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: "subscription required" });
    const profile = storage.updateProfile(visitorId, {
      pushEnabled: 1,
      pushSubscription: JSON.stringify(subscription),
    });
    res.json({ success: true });
  });

  // POST /api/push/unsubscribe
  app.post("/api/push/unsubscribe", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    storage.updateProfile(visitorId, { pushEnabled: 0, pushSubscription: null });
    res.json({ success: true });
  });

  // ── DMs ─────────────────────────────────────────────────────────

  // GET /api/dm/conversations — list my conversations
  app.get("/api/dm/conversations", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    if (!storage.isPro(visitorId)) {
      return res.status(403).json({ error: "Pro required", code: "PRO_REQUIRED" });
    }
    const convos = storage.getMyConversations(visitorId);
    res.json(convos);
  });

  // POST /api/dm/conversations — start or get a DM with another visitor
  app.post("/api/dm/conversations", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    if (!storage.isPro(visitorId)) {
      return res.status(403).json({ error: "Pro required", code: "PRO_REQUIRED" });
    }
    const { targetVisitorId } = req.body;
    if (!targetVisitorId || typeof targetVisitorId !== "string") {
      return res.status(400).json({ error: "targetVisitorId required" });
    }
    const convo = storage.getOrCreateConversation(visitorId, targetVisitorId);
    res.json(convo);
  });

  // GET /api/dm/conversations/:id/messages
  app.get("/api/dm/conversations/:id/messages", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    if (!storage.isPro(visitorId)) {
      return res.status(403).json({ error: "Pro required", code: "PRO_REQUIRED" });
    }
    const id = parseInt(req.params.id);
    const convo = storage.getConversation(id);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    // Ensure requester is a participant
    if (convo.participantA !== visitorId && convo.participantB !== visitorId) {
      return res.status(403).json({ error: "Not a participant" });
    }
    // Mark as read
    storage.markConversationRead(id, visitorId);
    const messages = storage.getDmMessages(id);
    res.json(messages);
  });

  // POST /api/dm/conversations/:id/messages — send a DM
  app.post("/api/dm/conversations/:id/messages", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    if (!storage.isPro(visitorId)) {
      return res.status(403).json({ error: "Pro required", code: "PRO_REQUIRED" });
    }
    const id = parseInt(req.params.id);
    const convo = storage.getConversation(id);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    if (convo.participantA !== visitorId && convo.participantB !== visitorId) {
      return res.status(403).json({ error: "Not a participant" });
    }
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content required" });
    }
    if (content.trim().length > 1000) {
      return res.status(400).json({ error: "max 1000 chars" });
    }
    const msg = storage.sendDmMessage({
      conversationId: id,
      senderVisitorId: visitorId,
      content: content.trim(),
      readAt: null,
      createdAt: new Date().toISOString(),
    });
    // Broadcast to both participants
    const otherId = convo.participantA === visitorId ? convo.participantB : convo.participantA;
    broadcastToDm(visitorId, { type: "new_dm", message: msg, conversationId: id });
    broadcastToDm(otherId, { type: "new_dm", message: msg, conversationId: id });
    res.json(msg);
  });

  // GET /api/dm/unread — total unread DM count
  app.get("/api/dm/unread", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";
    const count = storage.isPro(visitorId) ? storage.getUnreadDmCount(visitorId) : 0;
    res.json({ count });
  });

  // SSE stream for DMs (visitor-scoped)
  app.get("/api/dm/stream", (req, res) => {
    const visitorId = (req.headers["x-visitor-id"] as string) || "local-dev";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    if (!dmSseClients.has(visitorId)) dmSseClients.set(visitorId, new Set());
    dmSseClients.get(visitorId)!.add(res);

    res.write("data: {\"type\":\"connected\"}\n\n");

    const heartbeat = setInterval(() => {
      try { res.write("data: {\"type\":\"ping\"}\n\n"); } catch { cleanup(); }
    }, 25000);

    const cleanup = () => {
      clearInterval(heartbeat);
      dmSseClients.get(visitorId)?.delete(res);
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
  });

  // SSE stream for a room
  app.get("/api/community/rooms/:slug/stream", (req, res) => {
    const { slug } = req.params;
    const room = storage.getCommunityRoom(slug);
    if (!room) return res.status(404).end();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Register this client
    if (!sseClients.has(slug)) sseClients.set(slug, new Set());
    sseClients.get(slug)!.add(res);

    // Send initial ping
    res.write("data: {\"type\":\"connected\"}\n\n");

    // Heartbeat every 25s to prevent proxy timeout
    const heartbeat = setInterval(() => {
      try { res.write("data: {\"type\":\"ping\"}\n\n"); } catch { cleanup(); }
    }, 25000);

    const cleanup = () => {
      clearInterval(heartbeat);
      sseClients.get(slug)?.delete(res);
    };

    req.on("close", cleanup);
    req.on("error", cleanup);
  });
}
