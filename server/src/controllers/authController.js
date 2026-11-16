import { COOKIE_NAME, cookieOptions } from "../middleware/auth.js";
export function authController(service, config) {
  const sendSession = (res, result, status) =>
    res
      .cookie(COOKIE_NAME, result.token, {
        ...cookieOptions(config),
        maxAge: config.jwtTtlSeconds * 1000,
      })
      .status(status)
      .json({ data: result.user });
  return {
    register: async (req, res) =>
      sendSession(res, await service.register(req.validated), 201),
    login: async (req, res) =>
      sendSession(res, await service.login(req.validated), 200),
    logout: (req, res) =>
      res.clearCookie(COOKIE_NAME, cookieOptions(config)).json({ data: null }),
    me: (req, res) => res.json({ data: req.user }),
    profile: async (req, res) =>
      res.json({ data: await service.update(req.user.id, req.validated) }),
    hostAccess: (req, res) => res.json({ data: { role: req.user.role } }),
  };
}
