// Liveness only: no database or external service is connected in Task 1.
export function getHealth() {
  return { status: "ok", service: "staysphere-api" };
}
