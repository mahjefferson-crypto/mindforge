import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profile with XP and level
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Warrior"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  totalXp: integer("total_xp").notNull().default(0),
  title: text("title").notNull().default("Recruit"),
  joinedAt: text("joined_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Habits to track daily
export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().default(1),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("🎯"),
  category: text("category").notNull().default("mindset"), // mindset, body, social, sleep
  xpReward: integer("xp_reward").notNull().default(20),
  streak: integer("streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  completedToday: integer("completed_today").notNull().default(0), // 0 or 1
  totalCompletions: integer("total_completions").notNull().default(0),
  lastCompletedAt: text("last_completed_at"),
  createdAt: text("created_at").notNull(),
});

export const insertHabitSchema = createInsertSchema(habits).omit({ id: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habits.$inferSelect;

// Mood check-ins
export const checkIns = sqliteTable("check_ins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().default(1),
  mood: integer("mood").notNull(), // 1-5 scale
  moodLabel: text("mood_label").notNull(), // "Low", "Rough", "Steady", "Good", "Fired Up"
  energy: integer("energy").notNull(), // 1-5 scale
  note: text("note"),
  xpEarned: integer("xp_earned").notNull().default(10),
  createdAt: text("created_at").notNull(),
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({ id: true });
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

// Journal entries
export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().default(1),
  prompt: text("prompt").notNull(),
  content: text("content").notNull(),
  xpEarned: integer("xp_earned").notNull().default(30),
  createdAt: text("created_at").notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// XP events log for history
export const xpEvents = sqliteTable("xp_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().default(1),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertXpEventSchema = createInsertSchema(xpEvents).omit({ id: true });
export type InsertXpEvent = z.infer<typeof insertXpEventSchema>;
export type XpEvent = typeof xpEvents.$inferSelect;

// Community rooms
export const communityRooms = sqliteTable("community_rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),  // e.g. "anxiety"
  name: text("name").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull(),
  color: text("color").notNull(), // hex
  memberCount: integer("member_count").notNull().default(0),
});

export type CommunityRoom = typeof communityRooms.$inferSelect;

// Visitor identity profiles (one per visitorId)
export const visitorProfiles = sqliteTable("visitor_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull().unique(),
  username: text("username"),          // chosen display name, null = not set
  showUsername: integer("show_username").notNull().default(0), // 0=anon, 1=show name
  isPro: integer("is_pro").notNull().default(0),             // 0=free, 1=pro
  proSince: text("pro_since"),
  proExpiresAt: text("pro_expires_at"),
  onboarded: integer("onboarded").notNull().default(0),       // 0=not started, 1=complete
  displayName: text("display_name"),                          // name from onboarding
  focusAreas: text("focus_areas"),                            // comma-separated: anxiety,depression,...
  dailyMinutes: integer("daily_minutes"),                     // commitment: 5,10,15,20
  pushEnabled: integer("push_enabled").notNull().default(0),  // 0=off, 1=on
  pushSubscription: text("push_subscription"),                // web push JSON subscription
  stripeCustomerId: text("stripe_customer_id"),               // for real Stripe integration
  createdAt: text("created_at").notNull(),
});

export const insertVisitorProfileSchema = createInsertSchema(visitorProfiles).omit({ id: true });
export type InsertVisitorProfile = z.infer<typeof insertVisitorProfileSchema>;
export type VisitorProfile = typeof visitorProfiles.$inferSelect;

// DM conversations (pair of visitorIds)
export const dmConversations = sqliteTable("dm_conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  participantA: text("participant_a").notNull(),
  participantB: text("participant_b").notNull(),
  lastMessageAt: text("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  createdAt: text("created_at").notNull(),
});

export type DmConversation = typeof dmConversations.$inferSelect;

// DM messages
export const dmMessages = sqliteTable("dm_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull(),
  senderVisitorId: text("sender_visitor_id").notNull(),
  content: text("content").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
});

export const insertDmMessageSchema = createInsertSchema(dmMessages).omit({ id: true });
export type InsertDmMessage = z.infer<typeof insertDmMessageSchema>;
export type DmMessage = typeof dmMessages.$inferSelect;

// Community messages
export const communityMessages = sqliteTable("community_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roomSlug: text("room_slug").notNull(),
  visitorId: text("visitor_id").notNull(),
  handle: text("handle").notNull(),          // display name (username or anon handle)
  isAnon: integer("is_anon").notNull().default(1), // 1=anonymous, 0=named
  content: text("content").notNull(),
  reactions: text("reactions").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const insertCommunityMessageSchema = createInsertSchema(communityMessages).omit({ id: true });
export type InsertCommunityMessage = z.infer<typeof insertCommunityMessageSchema>;
export type CommunityMessage = typeof communityMessages.$inferSelect;
