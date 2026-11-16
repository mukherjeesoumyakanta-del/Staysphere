import { getHealth } from "../services/healthService.js";
export function health(req, res) {
  res.status(200).json({ data: getHealth() });
}
