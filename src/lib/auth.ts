import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionValue, isValidSessionValue, safeEqual, sign } from "./session";

export function checkPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(sign(password), sign(expected));
}

export async function createSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function isAdmin() {
  return isValidSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * À appeler en tête de CHAQUE page et action admin, avant toute lecture de données.
 * Le contrôle du layout ne suffit pas : une page se rend en parallèle de son layout
 * et ses données partiraient dans la réponse malgré la redirection.
 */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
