import { Client } from "@xdevplatform/xdk";
import { getSession } from "@/lib/session";
import { type NextRequest } from "next/server";

// The SDK's Media type only defines base fields. The X API returns additional
// fields (url, previewImageUrl) when explicitly requested via mediaFields.
type MediaWithUrl = {
  mediaKey?: string;
  type: string;
  url?: string;
  previewImageUrl?: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The X API uses cursor-based pagination — there's no way to fetch a single
  // random bookmark directly, since the API doesn't expose a total count or
  // support random offset access. Instead, we fetch up to 100 bookmarks per
  // request and let the client handle randomization and caching (see
  // bookmark-client.tsx). An optional `cursor` param lets the client request
  // the next page once the previous batch has been exhausted.
  //
  // Also note that a single request with maxResults: 100 costs ~0.50 cents!
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const client = new Client({ accessToken: session.accessToken });

  const response = await client.users.getBookmarks(session.userId, {
    maxResults: 100,
    paginationToken: cursor,
    tweetFields: ["author_id", "created_at", "text", "entities", "attachments"],
    // attachments.media_keys links each tweet's media references to the
    // expanded media objects returned in response.includes.media
    expansions: ["author_id", "attachments.media_keys"],
    userFields: ["name", "username", "profile_image_url"],
    mediaFields: ["url", "preview_image_url", "type", "width", "height"],
  });

  const bookmarks = response.data ?? [];
  const users = response.includes?.users ?? [];
  // Cast to our extended type so we can access url/previewImageUrl
  const media = (response.includes?.media ?? []) as MediaWithUrl[];

  // `next_token` is present when there are more pages of bookmarks to fetch.
  // We return it to the client so it can request the next page once this
  // batch runs out. When null, the client knows all bookmarks have been seen.
  const nextToken =
    (response.meta as Record<string, string> | undefined)?.next_token ?? null;

  const result = bookmarks.map((tweet) => {
    const author = users.find((u) => u.id === tweet.authorId);

    // Resolve any media attached to this tweet by matching media_keys from
    // the tweet's attachments against the expanded media objects in includes.
    const mediaKeys: string[] =
      (tweet.attachments as Record<string, string[]> | undefined)?.mediaKeys ?? [];
    const images = mediaKeys
      .map((key) => media.find((m) => m.mediaKey === key))
      .filter((m): m is MediaWithUrl => m !== undefined)
      .map((m) => ({
        type: m.type,
        // Photos have a direct url; videos/GIFs expose a preview thumbnail
        url: m.url ?? m.previewImageUrl ?? null,
      }))
      .filter((m) => m.url !== null);

    return {
      id: tweet.id,
      text: tweet.text,
      author: author
        ? {
            name: author.name,
            username: author.username,
            profileImageUrl: author.profileImageUrl,
          }
        : null,
      images,
      url: author
        ? `https://x.com/${author.username}/status/${tweet.id}`
        : null,
    };
  });

  return Response.json({ bookmarks: result, nextToken });
}
