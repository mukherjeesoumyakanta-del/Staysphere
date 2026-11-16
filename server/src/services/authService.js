import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { userRepository } from "../repositories/userRepository.js";
const dummyHash = bcrypt.hashSync("not-a-real-account-password", 12);
export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
export function createAuthService(config, users = userRepository) {
  function ready() {
    if (!config.jwtSecret)
      throw new ApiError(
        503,
        "AUTH_UNAVAILABLE",
        "Authentication is not configured",
      );
  }
  const tokenFor = (user) =>
    jwt.sign({}, config.jwtSecret, {
      algorithm: "HS256",
      subject: String(user._id),
      expiresIn: config.jwtTtlSeconds,
      issuer: "staysphere-api",
      audience: "staysphere-web",
    });
  return {
    async register(input) {
      ready();
      if (await users.findByEmail(input.email))
        throw new ApiError(
          409,
          "EMAIL_IN_USE",
          "An account with this email already exists",
        );
      try {
        const user = await users.create({
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: await bcrypt.hash(input.password, 12),
        });
        return { user: publicUser(user), token: tokenFor(user) };
      } catch (error) {
        if (error.code === 11000)
          throw new ApiError(
            409,
            "EMAIL_IN_USE",
            "An account with this email already exists",
          );
        throw error;
      }
    },
    async login(input) {
      ready();
      const user = await users.findByEmail(input.email);
      const matches = await bcrypt.compare(
        input.password,
        user?.passwordHash || dummyHash,
      );
      if (!user || !matches)
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect",
        );
      return { user: publicUser(user), token: tokenFor(user) };
    },
    async authenticate(token) {
      ready();
      if (!token)
        throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwtSecret, {
          algorithms: ["HS256"],
          issuer: "staysphere-api",
          audience: "staysphere-web",
        });
      } catch {
        throw new ApiError(
          401,
          "SESSION_EXPIRED",
          "Your session is invalid or expired. Please sign in again",
        );
      }
      if (typeof decoded.sub !== "string")
        throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
      const user = await users.findById(decoded.sub);
      if (!user)
        throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
      return publicUser(user);
    },
    async update(id, values) {
      try {
        const user = await users.updateProfile(id, values);
        if (!user)
          throw new ApiError(401, "UNAUTHENTICATED", "Sign in to continue");
        return publicUser(user);
      } catch (error) {
        if (error.code === 11000)
          throw new ApiError(
            409,
            "EMAIL_IN_USE",
            "An account with this email already exists",
          );
        throw error;
      }
    },
  };
}
