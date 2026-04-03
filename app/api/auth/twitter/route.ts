import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { OAuth2, generateCodeVerifier, generateCodeChallenge, type OAuth2Config } from "@xdevplatform/xdk"

export async function GET(_req: NextRequest) {
  const oauth2Config: OAuth2Config = {
    clientId: process.env.X_API_CLIENT_ID!,
    clientSecret: process.env.X_API_CLIENT_SECRET!,
    redirectUri: process.env.X_API_REDIRECT_URI!,
    scope: ["bookmark.read", "users.read", "tweet.read", "offline.access"],
  }

  const oauth2: OAuth2 = new OAuth2(oauth2Config)

  const state: string = generateCodeVerifier(16)
  const codeVerifier: string = generateCodeVerifier()
  const codeChallenge: string = await generateCodeChallenge(codeVerifier)

  oauth2.setPkceParameters(codeVerifier, codeChallenge)

  const authUrl: string = await oauth2.getAuthorizationUrl(state)

  const cookieStore = await cookies()
  cookieStore.set("twitter_oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  cookieStore.set("twitter_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })

  return Response.redirect(authUrl)
}
