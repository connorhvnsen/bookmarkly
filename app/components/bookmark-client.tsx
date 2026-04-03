"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type Bookmark = {
  id: string
  text: string
  author: { name: string; username: string; profileImageUrl?: string } | null
  images: { type: string; url: string }[]
  url: string | null
}

// localStorage keys for persisting the bookmark cache across page reloads.
const CACHE_KEY = "bookmarkly_cache"
const NEXT_TOKEN_KEY = "bookmarkly_next_token"

// --- Cache helpers ---
// We store the unshown bookmarks as a JSON array in localStorage so the user
// can close the tab and pick up where they left off without burning another
// API call on their next visit.

function getCache(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]")
  } catch {
    return []
  }
}

function setCache(bookmarks: Bookmark[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(bookmarks))
}

function getNextToken(): string | null {
  return localStorage.getItem(NEXT_TOKEN_KEY)
}

function setNextToken(token: string | null) {
  if (token) {
    localStorage.setItem(NEXT_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(NEXT_TOKEN_KEY)
  }
}

// Fisher-Yates shuffle — produces an unbiased random ordering of the array.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function BookmarkClient({ username }: { username: string }) {
  const [bookmark, setBookmark] = useState<Bookmark | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchBookmark() {
    setLoading(true)
    setError(null)
    try {
      let cache = getCache()

      // Only hit the API when the local cache is empty. This means we make at
      // most 1 API call per 100 bookmark views, keeping costs minimal. The X
      // API returns up to 100 bookmarks per page — we shuffle them on arrival
      // so the user sees them in a random order rather than newest-first.
      if (cache.length === 0) {
        // If we've fetched before, use the stored pagination cursor to request
        // the next page of bookmarks rather than re-fetching the first 100.
        const cursor = getNextToken()
        const url = cursor ? `/api/bookmarks/random?cursor=${cursor}` : "/api/bookmarks/random"

        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to fetch bookmarks")
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        if (!data.bookmarks?.length) {
          setError("No more bookmarks to show")
          return
        }

        // Shuffle the incoming batch so each click feels random, then persist
        // the cursor for the next batch and save the shuffled list locally.
        cache = shuffle(data.bookmarks)
        setNextToken(data.nextToken)
        // Note: when nextToken is null the API has no more pages, so once this
        // batch runs out the user will see "No more bookmarks to show".
      }

      // Pop the first bookmark off the cached array and display it.
      // The remaining items stay in localStorage for the next click.
      const [picked, ...rest] = cache
      setCache(rest)
      setBookmark(picked)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xl">
      <p className="text-muted-foreground text-sm">Logged in as @{username}</p>

      <Button onClick={fetchBookmark} disabled={loading} size="lg" className="w-full">
        {loading ? "Fetching..." : "Show me a bookmark"}
      </Button>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {bookmark && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            {bookmark.author && (
              <div className="flex items-center gap-3">
                {bookmark.author.profileImageUrl && (
                  <Image
                    src={bookmark.author.profileImageUrl}
                    alt={bookmark.author.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                    // X serves profile images from pbs.twimg.com
                    unoptimized
                  />
                )}
                <div className="flex flex-col">
                  <span className="font-semibold text-sm leading-tight">
                    {bookmark.author.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    @{bookmark.author.username}
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{bookmark.text}</p>

            {bookmark.images.length > 0 && (
              <div className={`grid gap-2 ${bookmark.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {bookmark.images.map((img, i) => (
                  <div key={i} className="relative w-full overflow-hidden rounded-lg bg-muted aspect-video">
                    <Image
                      src={img.url}
                      alt={`Attached media ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}

            {bookmark.url && (
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline"
              >
                View on X →
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <a href="/api/auth/logout" className="text-xs text-muted-foreground hover:underline mt-4">
        Sign out
      </a>
    </div>
  )
}
