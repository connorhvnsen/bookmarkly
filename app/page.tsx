import { getSession } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { BookmarkClient } from "@/app/components/bookmark-client"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="flex flex-col items-center gap-8 w-full max-w-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Bookmarkly</h1>
          <p className="text-muted-foreground mt-2">Rediscover your Twitter bookmarks</p>
        </div>

        {session ? (
          <BookmarkClient username={session.username} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <a href="/api/auth/twitter">
              <Button size="lg" className="gap-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
                Sign in with X
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
