import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME } from "@/lib/session"

export async function GET() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  return Response.redirect(`${baseUrl}/`)
}
