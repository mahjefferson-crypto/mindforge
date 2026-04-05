import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import { users, habits, checkIns, journalEntries, xpEvents, communityRooms, communityMessages, visitorProfiles, dmConversations, dmMessages } from "@shared/schema";
import type {
  User, InsertUser,
  Habit, InsertHabit,
  CheckIn, InsertCheckIn,
  JournalEntry, InsertJournalEntry,
  XpEvent, InsertXpEvent,
  CommunityRoom, CommunityMessage, InsertCommunityMessage,
  VisitorProfile, InsertVisitorProfile,
  DmConversation, DmMessage, InsertDmMessage
} from "@shared/schema";

const sqlite = new Database("mindforge.db");
const db = drizzle(sqlite, { schema });

// SSE broadcaster — map of roomSlug -> set of Response objects
export const sseClients = new Map<string, Set<any>>();

export function broadcastToRoom(roomSlug: string, data: object) {
  const clients = sseClients.get(roomSlug);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// DM SSE broadcaster — map of visitorId -> set of Response objects
export const dmSseClients = new Map<string, Set<any>>();

export function broadcastToDm(visitorId: string, data: object) {
  const clients = dmSseClients.get(visitorId);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// Anonymous handle generator
const ADJECTIVES = ["Iron", "Steel", "Bold", "Calm", "Steady", "Quiet", "Brave", "Grounded", "Silent", "Forge", "Sharp", "Focused", "Lone", "Dark", "Strong"];
const NOUNS = ["Wolf", "Bear", "Eagle", "Hawk", "Stone", "Mountain", "River", "Storm", "Oak", "Ridge", "Ember", "Ash", "Cliff", "Tide", "Frost"];
export function generateHandle(visitorId: string): string {
  // deterministic but appears random per visitor
  const id = visitorId || "anonymous";
  let h1 = 0, h2 = 0;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    h1 = (h1 * 31 + c) >>> 0;
    h2 = (h2 * 37 + c * 7) >>> 0;
  }
  const adj = ADJECTIVES[h1 % ADJECTIVES.length];
  const noun = NOUNS[h2 % NOUNS.length];
  return `${adj}${noun}`;
}

// Init tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Warrior',
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    xp_to_next_level INTEGER NOT NULL DEFAULT 100,
    total_xp INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT 'Recruit',
    joined_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🎯',
    category TEXT NOT NULL DEFAULT 'mindset',
    xp_reward INTEGER NOT NULL DEFAULT 20,
    streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    completed_today INTEGER NOT NULL DEFAULT 0,
    total_completions INTEGER NOT NULL DEFAULT 0,
    last_completed_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    mood INTEGER NOT NULL,
    mood_label TEXT NOT NULL,
    energy INTEGER NOT NULL,
    note TEXT,
    xp_earned INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    prompt TEXT NOT NULL,
    content TEXT NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS community_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS community_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_slug TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    handle TEXT NOT NULL,
    is_anon INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    reactions TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS visitor_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL UNIQUE,
    username TEXT,
    show_username INTEGER NOT NULL DEFAULT 0,
    is_pro INTEGER NOT NULL DEFAULT 0,
    pro_since TEXT,
    pro_expires_at TEXT,
    onboarded INTEGER NOT NULL DEFAULT 0,
    display_name TEXT,
    focus_areas TEXT,
    daily_minutes INTEGER,
    push_enabled INTEGER NOT NULL DEFAULT 0,
    push_subscription TEXT,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dm_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_a TEXT NOT NULL,
    participant_b TEXT NOT NULL,
    last_message_at TEXT,
    last_message_preview TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS dm_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_visitor_id TEXT NOT NULL,
    content TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL
  );
`);

// Migrate: add new columns if missing
const migrateCols: [string, string][] = [
  ["onboarded", "ALTER TABLE visitor_profiles ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 0"],
  ["display_name", "ALTER TABLE visitor_profiles ADD COLUMN display_name TEXT"],
  ["focus_areas", "ALTER TABLE visitor_profiles ADD COLUMN focus_areas TEXT"],
  ["daily_minutes", "ALTER TABLE visitor_profiles ADD COLUMN daily_minutes INTEGER"],
  ["push_enabled", "ALTER TABLE visitor_profiles ADD COLUMN push_enabled INTEGER NOT NULL DEFAULT 0"],
  ["push_subscription", "ALTER TABLE visitor_profiles ADD COLUMN push_subscription TEXT"],
  ["stripe_customer_id", "ALTER TABLE visitor_profiles ADD COLUMN stripe_customer_id TEXT"],
];
for (const [col, sql] of migrateCols) {
  try { sqlite.exec(sql); } catch (e: any) {
    if (!e.message?.includes("duplicate column")) throw e;
  }
}

// Seed community rooms
const existingRooms = db.select().from(communityRooms).get();
if (!existingRooms) {
  const rooms = [
    { slug: "anxiety", name: "Anxiety", description: "Managing worry, overthinking, panic. You're not alone.", emoji: "🌊", color: "#4ea8de" },
    { slug: "depression", name: "Depression", description: "Dark days, low motivation, numbness. Real talk only.", emoji: "🌑", color: "#7b5ea7" },
    { slug: "social", name: "Social Skills", description: "Loneliness, friendships, dating, connecting with people.", emoji: "🤝", color: "#06d6a0" },
    { slug: "anger", name: "Anger & Stress", description: "Pressure, rage, frustration. Let's work through it.", emoji: "🔥", color: "#e85d04" },
    { slug: "purpose", name: "Purpose & Identity", description: "Who am I? What's my direction? The big questions.", emoji: "🎯", color: "#ffbe0b" },
    { slug: "relationships", name: "Relationships", description: "Family, partners, toxic patterns. Real conversations.", emoji: "💬", color: "#e63946" },
    { slug: "wins", name: "Daily Wins", description: "Share your progress, celebrate small victories.", emoji: "🏆", color: "#06d6a0" },
  ];
  for (const r of rooms) {
    db.insert(communityRooms).values(r).run();
  }
}

// Seed default user if none exists
const existingUser = db.select().from(users).get();
if (!existingUser) {
  db.insert(users).values({
    name: "Warrior",
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalXp: 0,
    title: "Recruit",
    joinedAt: new Date().toISOString(),
  }).run();

  // Seed starter habits across all 4 categories
  const now = new Date().toISOString();
  const starterHabits = [
    // Mindset
    { name: "10 Min Meditation", icon: "🧘", category: "mindset", xpReward: 20 },
    { name: "No Phone First Hour", icon: "📵", category: "mindset", xpReward: 20 },
    { name: "Read 20 Pages", icon: "📖", category: "mindset", xpReward: 15 },
    { name: "Write in Journal", icon: "🖊️", category: "mindset", xpReward: 20 },
    // Body
    { name: "Morning Cold Shower", icon: "🧊", category: "body", xpReward: 25 },
    { name: "Workout / Move", icon: "💪", category: "body", xpReward: 30 },
    { name: "Drink 2L Water", icon: "🥗", category: "body", xpReward: 10 },
    // Social
    { name: "Connect With Someone", icon: "🤝", category: "social", xpReward: 15 },
    // Sleep
    { name: "In Bed by 10:30pm", icon: "💤", category: "sleep", xpReward: 20 },
    { name: "No Screens 1hr Before Bed", icon: "🌅", category: "sleep", xpReward: 15 },
  ];
  for (const h of starterHabits) {
    db.insert(habits).values({ ...h, userId: 1, streak: 0, longestStreak: 0, completedToday: 0, totalCompletions: 0, createdAt: now }).run();
  }
}

export const LEVEL_TITLES = [
  "Recruit", "Initiate", "Challenger", "Steadfast", "Iron Will",
  "Focused", "Disciplined", "Grounded", "Resilient", "Forged",
  "Unshakeable", "Battle-Hardened", "Sovereign", "Apex", "Legend"
];

function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

export interface IStorage {
  getUser(): User | undefined;
  updateUser(data: Partial<InsertUser>): User | undefined;
  addXp(amount: number, reason: string): { user: User; leveledUp: boolean; newLevel?: number };

  getHabits(): Habit[];
  createHabit(data: InsertHabit): Habit;
  completeHabit(id: number): { habit: Habit; xpGained: number; leveledUp: boolean };
  deleteHabit(id: number): void;
  resetDailyHabits(): void;

  getTodayCheckIn(): CheckIn | undefined;
  createCheckIn(data: InsertCheckIn): { checkIn: CheckIn; leveledUp: boolean };

  getJournalEntries(): JournalEntry[];
  createJournalEntry(data: InsertJournalEntry): { entry: JournalEntry; leveledUp: boolean };

  getXpEvents(limit?: number): XpEvent[];
  getWeeklyMoods(): CheckIn[];

  // Community
  getCommunityRooms(): CommunityRoom[];
  getCommunityRoom(slug: string): CommunityRoom | undefined;
  getRoomMessages(slug: string, limit?: number): CommunityMessage[];
  postMessage(data: InsertCommunityMessage): CommunityMessage;
  addReaction(messageId: number, emoji: string): CommunityMessage | undefined;
  getOrCreateHandle(visitorId: string): string;

  // Visitor identity & subscription
  getProfile(visitorId: string): VisitorProfile | undefined;
  getOrCreateProfile(visitorId: string): VisitorProfile;
  updateProfile(visitorId: string, data: Partial<InsertVisitorProfile>): VisitorProfile;
  activatePro(visitorId: string): VisitorProfile;
  isPro(visitorId: string): boolean;

  // DMs
  getOrCreateConversation(visitorA: string, visitorB: string): DmConversation;
  getConversation(id: number): DmConversation | undefined;
  getMyConversations(visitorId: string): (DmConversation & { otherHandle: string; otherUsername: string | null; otherShowUsername: boolean; unreadCount: number })[]
  getDmMessages(conversationId: number, limit?: number): DmMessage[];
  sendDmMessage(data: InsertDmMessage): DmMessage;
  markConversationRead(conversationId: number, visitorId: string): void;
  getUnreadDmCount(visitorId: string): number;
}

class Storage implements IStorage {
  getUser(): User | undefined {
    return db.select().from(users).get();
  }

  updateUser(data: Partial<InsertUser>): User | undefined {
    db.update(users).set(data).where(eq(users.id, 1)).run();
    return this.getUser();
  }

  addXp(amount: number, reason: string): { user: User; leveledUp: boolean; newLevel?: number } {
    const user = this.getUser()!;
    let newXp = user.xp + amount;
    let newLevel = user.level;
    let newTitle = user.title;
    let leveledUp = false;
    let xpToNext = user.xpToNextLevel;

    while (newXp >= xpToNext) {
      newXp -= xpToNext;
      newLevel++;
      xpToNext = xpForLevel(newLevel);
      newTitle = LEVEL_TITLES[Math.min(newLevel - 1, LEVEL_TITLES.length - 1)];
      leveledUp = true;
    }

    db.update(users).set({
      xp: newXp,
      level: newLevel,
      xpToNextLevel: xpToNext,
      totalXp: user.totalXp + amount,
      title: newTitle,
    }).where(eq(users.id, 1)).run();

    db.insert(xpEvents).values({
      userId: 1,
      amount,
      reason,
      createdAt: new Date().toISOString(),
    }).run();

    return { user: this.getUser()!, leveledUp, newLevel: leveledUp ? newLevel : undefined };
  }

  getHabits(): Habit[] {
    return db.select().from(habits).where(eq(habits.userId, 1)).all();
  }

  createHabit(data: InsertHabit): Habit {
    return db.insert(habits).values(data).returning().get();
  }

  completeHabit(id: number): { habit: Habit; xpGained: number; leveledUp: boolean } {
    const habit = db.select().from(habits).where(eq(habits.id, id)).get();
    if (!habit || habit.completedToday) throw new Error("Already completed or not found");

    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const lastDate = habit.lastCompletedAt?.split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = lastDate === yesterday ? habit.streak + 1 : 1;
    const longestStreak = Math.max(habit.longestStreak, newStreak);

    // Streak bonus XP
    let xpGained = habit.xpReward;
    if (newStreak >= 7) xpGained = Math.floor(xpGained * 1.5);
    else if (newStreak >= 3) xpGained = Math.floor(xpGained * 1.25);

    db.update(habits).set({
      completedToday: 1,
      streak: newStreak,
      longestStreak,
      totalCompletions: habit.totalCompletions + 1,
      lastCompletedAt: now,
    }).where(eq(habits.id, id)).run();

    const { leveledUp } = this.addXp(xpGained, `Completed: ${habit.name}`);
    return { habit: db.select().from(habits).where(eq(habits.id, id)).get()!, xpGained, leveledUp };
  }

  deleteHabit(id: number): void {
    db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, 1))).run();
  }

  resetDailyHabits(): void {
    const today = new Date().toISOString().split("T")[0];
    const allHabits = this.getHabits();
    for (const h of allHabits) {
      const lastDate = h.lastCompletedAt?.split("T")[0];
      if (lastDate !== today && h.completedToday === 1) {
        db.update(habits).set({ completedToday: 0 }).where(eq(habits.id, h.id)).run();
      }
    }
  }

  getTodayCheckIn(): CheckIn | undefined {
    const today = new Date().toISOString().split("T")[0];
    return db.select().from(checkIns)
      .where(and(eq(checkIns.userId, 1), gte(checkIns.createdAt, today)))
      .get();
  }

  createCheckIn(data: InsertCheckIn): { checkIn: CheckIn; leveledUp: boolean } {
    const checkIn = db.insert(checkIns).values(data).returning().get();
    const { leveledUp } = this.addXp(data.xpEarned, "Daily check-in");
    return { checkIn, leveledUp };
  }

  getJournalEntries(): JournalEntry[] {
    return db.select().from(journalEntries)
      .where(eq(journalEntries.userId, 1))
      .orderBy(desc(journalEntries.createdAt))
      .all();
  }

  createJournalEntry(data: InsertJournalEntry): { entry: JournalEntry; leveledUp: boolean } {
    const entry = db.insert(journalEntries).values(data).returning().get();
    const { leveledUp } = this.addXp(data.xpEarned, "Journal entry written");
    return { entry, leveledUp };
  }

  getXpEvents(limit = 20): XpEvent[] {
    return db.select().from(xpEvents)
      .where(eq(xpEvents.userId, 1))
      .orderBy(desc(xpEvents.createdAt))
      .limit(limit)
      .all();
  }

  getWeeklyMoods(): CheckIn[] {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return db.select().from(checkIns)
      .where(and(eq(checkIns.userId, 1), gte(checkIns.createdAt, weekAgo)))
      .orderBy(checkIns.createdAt)
      .all();
  }

  // Community
  getCommunityRooms(): CommunityRoom[] {
    return db.select().from(communityRooms).all();
  }

  getCommunityRoom(slug: string): CommunityRoom | undefined {
    return db.select().from(communityRooms).where(eq(communityRooms.slug, slug)).get();
  }

  getRoomMessages(slug: string, limit = 60): CommunityMessage[] {
    const msgs = db.select().from(communityMessages)
      .where(eq(communityMessages.roomSlug, slug))
      .orderBy(desc(communityMessages.createdAt))
      .limit(limit)
      .all();
    return msgs.reverse(); // oldest first for display
  }

  postMessage(data: InsertCommunityMessage): CommunityMessage {
    return db.insert(communityMessages).values(data).returning().get();
  }

  addReaction(messageId: number, emoji: string): CommunityMessage | undefined {
    const msg = db.select().from(communityMessages).where(eq(communityMessages.id, messageId)).get();
    if (!msg) return undefined;
    const reactions: Record<string, number> = JSON.parse(msg.reactions || "{}");
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    db.update(communityMessages)
      .set({ reactions: JSON.stringify(reactions) })
      .where(eq(communityMessages.id, messageId))
      .run();
    return db.select().from(communityMessages).where(eq(communityMessages.id, messageId)).get();
  }

  getOrCreateHandle(visitorId: string): string {
    return generateHandle(visitorId);
  }

  // ── Visitor Identity & Subscription ─────────────────────────────

  getProfile(visitorId: string): VisitorProfile | undefined {
    return db.select().from(visitorProfiles)
      .where(eq(visitorProfiles.visitorId, visitorId))
      .get();
  }

  getOrCreateProfile(visitorId: string): VisitorProfile {
    const existing = this.getProfile(visitorId);
    if (existing) return existing;
    return db.insert(visitorProfiles).values({
      visitorId,
      username: null,
      showUsername: 0,
      isPro: 0,
      proSince: null,
      proExpiresAt: null,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  updateProfile(visitorId: string, data: Partial<InsertVisitorProfile>): VisitorProfile {
    this.getOrCreateProfile(visitorId); // ensure it exists
    db.update(visitorProfiles).set(data).where(eq(visitorProfiles.visitorId, visitorId)).run();
    return this.getProfile(visitorId)!;
  }

  activatePro(visitorId: string): VisitorProfile {
    this.getOrCreateProfile(visitorId);
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.update(visitorProfiles).set({
      isPro: 1,
      proSince: now,
      proExpiresAt: expires,
    }).where(eq(visitorProfiles.visitorId, visitorId)).run();
    return this.getProfile(visitorId)!;
  }

  isPro(visitorId: string): boolean {
    const profile = this.getProfile(visitorId);
    if (!profile) return false;
    if (!profile.isPro) return false;
    // Check expiry
    if (profile.proExpiresAt && new Date(profile.proExpiresAt) < new Date()) {
      // Expired — downgrade
      db.update(visitorProfiles).set({ isPro: 0 }).where(eq(visitorProfiles.visitorId, visitorId)).run();
      return false;
    }
    return true;
  }

  // ── DMs ─────────────────────────────────────────────────────────

  getOrCreateConversation(visitorA: string, visitorB: string): DmConversation {
    // Canonical order: alphabetical so (A,B) == (B,A)
    const [pA, pB] = [visitorA, visitorB].sort();
    const existing = db.select().from(dmConversations)
      .where(and(
        eq(dmConversations.participantA, pA),
        eq(dmConversations.participantB, pB)
      ))
      .get();
    if (existing) return existing;
    return db.insert(dmConversations).values({
      participantA: pA,
      participantB: pB,
      lastMessageAt: null,
      lastMessagePreview: null,
      createdAt: new Date().toISOString(),
    }).returning().get();
  }

  getConversation(id: number): DmConversation | undefined {
    return db.select().from(dmConversations).where(eq(dmConversations.id, id)).get();
  }

  getMyConversations(visitorId: string): (DmConversation & { otherHandle: string; otherUsername: string | null; otherShowUsername: boolean; unreadCount: number })[] {
    const convos = db.select().from(dmConversations)
      .where(or(
        eq(dmConversations.participantA, visitorId),
        eq(dmConversations.participantB, visitorId)
      ))
      .orderBy(desc(dmConversations.lastMessageAt))
      .all();

    return convos.map(c => {
      const otherId = c.participantA === visitorId ? c.participantB : c.participantA;
      const otherProfile = this.getProfile(otherId);
      const otherHandle = generateHandle(otherId);
      const otherUsername = otherProfile?.username ?? null;
      const otherShowUsername = otherProfile?.showUsername === 1;

      // Unread = messages in this convo not sent by me and with no readAt
      const unreadMsgs = db.select().from(dmMessages)
        .where(and(
          eq(dmMessages.conversationId, c.id),
          eq(dmMessages.senderVisitorId, otherId)
        ))
        .all()
        .filter(m => !m.readAt);

      return { ...c, otherHandle, otherUsername, otherShowUsername, unreadCount: unreadMsgs.length };
    });
  }

  getDmMessages(conversationId: number, limit = 80): DmMessage[] {
    const msgs = db.select().from(dmMessages)
      .where(eq(dmMessages.conversationId, conversationId))
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit)
      .all();
    return msgs.reverse();
  }

  sendDmMessage(data: InsertDmMessage): DmMessage {
    const msg = db.insert(dmMessages).values(data).returning().get();
    // Update conversation preview
    db.update(dmConversations).set({
      lastMessageAt: data.createdAt,
      lastMessagePreview: data.content.slice(0, 80),
    }).where(eq(dmConversations.id, data.conversationId)).run();
    return msg;
  }

  markConversationRead(conversationId: number, visitorId: string): void {
    const now = new Date().toISOString();
    // Mark all messages in this conversation NOT sent by me as read
    const msgs = db.select().from(dmMessages)
      .where(and(
        eq(dmMessages.conversationId, conversationId)
      ))
      .all()
      .filter(m => m.senderVisitorId !== visitorId && !m.readAt);
    for (const m of msgs) {
      db.update(dmMessages).set({ readAt: now }).where(eq(dmMessages.id, m.id)).run();
    }
  }

  getUnreadDmCount(visitorId: string): number {
    const convos = db.select().from(dmConversations)
      .where(or(
        eq(dmConversations.participantA, visitorId),
        eq(dmConversations.participantB, visitorId)
      ))
      .all();

    let total = 0;
    for (const c of convos) {
      const otherId = c.participantA === visitorId ? c.participantB : c.participantA;
      const unread = db.select().from(dmMessages)
        .where(and(
          eq(dmMessages.conversationId, c.id),
          eq(dmMessages.senderVisitorId, otherId)
        ))
        .all()
        .filter(m => !m.readAt);
      total += unread.length;
    }
    return total;
  }
}

export const storage = new Storage();
