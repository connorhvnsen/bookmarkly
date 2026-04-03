import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { OAuth2, Client, type OAuth2Config } from "@xdevplatform/xdk"
import { createSession, SESSION_COOKIE_NAME } from "@/lib/session"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

  if (error || !code || !state) {
    return Response.redirect(`${baseUrl}/?error=auth_failed`)
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get("twitter_oauth_state")?.value
  const codeVerifier = cookieStore.get("twitter_oauth_verifier")?.value

  if (!storedState || storedState !== state || !codeVerifier) {
    return Response.redirect(`${baseUrl}/?error=state_mismatch`)
  }

  const oauth2Config: OAuth2Config = {
    clientId: process.env.X_API_CLIENT_ID!,
    clientSecret: process.env.X_API_CLIENT_SECRET!,
    redirectUri: process.env.X_API_REDIRECT_URI!,
    scope: ["bookmark.read", "users.read", "tweet.read", "offline.access"],
  }

  const oauth2: OAuth2 = new OAuth2(oauth2Config)

  let tokens
  try {
    tokens = await oauth2.exchangeCode(code, codeVerifier)
  } catch (e) {
    console.error("Token exchange failed:", e)
    return Response.redirect(`${baseUrl}/?error=token_exchange_failed`)
  }

  const client: Client = new Client({ accessToken: tokens.access_token })

  let userId: string
  let username: string
  try {
    const meRes = await client.users.getMe()
    userId = meRes.data!.id!
    username = meRes.data!.username
  } catch (e) {
    console.error("getMe failed:", e)
    return Response.redirect(`${baseUrl}/?error=user_fetch_failed`)
  }

  const sessionToken = await createSession({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    userId,
    username,
  })

  cookieStore.delete("twitter_oauth_state")
  cookieStore.delete("twitter_oauth_verifier")
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return Response.redirect(`${baseUrl}/`)
}
