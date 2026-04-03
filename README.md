# Bookmarkly

Rediscover your X bookmarks, one at a time.

Bookmarkly lets you authenticate with your X account and surface a random bookmark with each click. Bookmarks are fetched in batches, shuffled, and cached locally — so after the first load, every click is instant and free.

## Setup

### 1. Create an X Developer App

1. Go to the [X Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Create a new **Project**, then create an **App** inside it (v2 API endpoints require an app attached to a project)
3. Under your app's settings, find **User authentication settings** and click **Set up**
   - App type: **Web App**
   - Callback URI: `http://127.0.0.1:3000/api/auth/callback`
   - Website URL: any valid URL
4. Save, then go to the **Keys and Tokens** tab
5. Under **OAuth 2.0 Client ID and Client Secret**, copy both values

### 2. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env
```

Open `.env` and set the following:

```bash
X_API_CLIENT_ID=your_client_id
X_API_CLIENT_SECRET=your_client_secret
X_API_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000
SESSION_SECRET=your_random_secret
```

Generate a secure `SESSION_SECRET` and copy it to your clipboard:

```bash
openssl rand -base64 32 | pbcopy
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

> **Note:** Use `127.0.0.1` rather than `localhost` — the X OAuth callback requires an exact match with the URI registered in the developer portal.

## Required X API scopes

Your app must have the following OAuth 2.0 scopes enabled:

- `tweet.read`
- `users.read`
- `bookmark.read`
- `offline.access`

These are configured under **User authentication settings** in the developer portal.

## How it works

The X API uses cursor-based pagination with no support for random access, so fetching a single random bookmark in one call isn't possible. Instead, Bookmarkly fetches up to 100 bookmarks per API call, shuffles them client-side using a Fisher-Yates shuffle, and stores the remaining unseen bookmarks in `localStorage`. Each click draws from that local cache — making subsequent picks instant with no additional API calls. When the cache runs out, the next page is fetched automatically using the stored pagination cursor.
