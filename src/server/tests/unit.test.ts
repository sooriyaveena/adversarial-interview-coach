import { test } from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword, createToken, verifyToken } from "../crypto.js";
import { recursiveCharacterSplit, cosineSimilarity } from "../rag.js";
import { db } from "../db.js";

test("Crypto Module - Password Hashing", () => {
  const password = "mySecurePassword123";
  const hashedPassword = hashPassword(password);
  
  assert.ok(hashedPassword.includes(":"), "Hash format should contain a colon separator");
  assert.ok(verifyPassword(password, hashedPassword), "Should verify correct password");
  assert.ok(!verifyPassword("wrongPassword", hashedPassword), "Should reject incorrect password");
});

test("Crypto Module - Custom JWT Creation and Verification", () => {
  const payload = { userId: "user_test_123", email: "test@example.com" };
  const token = createToken(payload, 30); // 30 seconds expiration
  
  const verified = verifyToken(token);
  assert.ok(verified, "Token should be successfully verified");
  assert.equal(verified.userId, payload.userId, "Payload userId should match");
  assert.equal(verified.email, payload.email, "Payload email should match");
  
  const badToken = token + "corrupted";
  assert.equal(verifyToken(badToken), null, "Corrupted token should return null");
});

test("RAG Module - Custom Recursive Text Splitter", () => {
  const longText = "This is paragraph one.\n\nThis is paragraph two. It contains a bit more text.\n\nAnd here is a third paragraph.";
  const chunks = recursiveCharacterSplit(longText, 50, 10);
  
  assert.ok(chunks.length > 1, "Text should be split into multiple chunks");
  assert.ok(chunks.every(chunk => chunk.length <= 100), "No chunk should exceed reasonable limits");
  assert.ok(chunks[0].includes("paragraph one"), "First chunk should contain the first paragraph text");
});

test("RAG Module - Cosine Similarity Engine", () => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];
  
  const identitySimilarity = cosineSimilarity(vecA, vecB);
  const orthogonalSimilarity = cosineSimilarity(vecA, vecC);
  
  assert.equal(identitySimilarity, 1.0, "Identical vectors should have a cosine similarity of 1.0");
  assert.equal(orthogonalSimilarity, 0.0, "Orthogonal vectors should have a cosine similarity of 0.0");
});

test("Database Module - User Management", () => {
  const tempEmail = `test_${Date.now()}@example.com`.toLowerCase();
  const passwordHash = hashPassword("supersecret");
  
  const newUser = {
    id: `usr_${Date.now()}`,
    email: tempEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null
  };
  
  const createdUser = db.createUser(newUser);
  assert.ok(createdUser, "User should be successfully created");
  assert.equal(createdUser.email, tempEmail, "User email should match");
  
  const fetchedUser = db.getUserByEmail(tempEmail);
  assert.ok(fetchedUser, "Should fetch created user by email");
  assert.equal(fetchedUser.id, createdUser.id, "ID of fetched user should match");
});
