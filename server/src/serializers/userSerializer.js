/**
 * User Response DTO.
 * Explicitly serializes public and authenticated user profiles,
 * ensuring password hashes and private metadata are never leaked.
 */

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id),
    name: user.name || "",
    email: user.email || "",
    role: user.role || "GUEST",
    avatar: user.avatar || "",
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const serializeSafeUser = serializeUser;
