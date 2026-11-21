# YouTube MCP for Claude

A personal YouTube MCP server that Claude (web and mobile) can use as a custom connector. It runs
[zubeid-youtube-mcp-server](https://github.com/ZubeidHendricks/youtube-mcp-server) behind
[supergateway](https://github.com/supercorp-ai/supergateway), exposed over Streamable HTTP on Render's free tier.

## Tools

| Tool | What it does |
|---|---|
| `videos_searchVideos` | Search YouTube videos |
| `videos_getVideo` | Video details (title, stats, description) |
| `transcripts_getTranscript` | Video transcript |
| `channels_getChannel`, `channels_getChannels` | Channel details |
| `channels_searchChannels`, `channels_findCreators` | Find channels and creators |
| `channels_listVideos` | Latest videos from a channel |
| `playlists_getPlaylist`, `playlists_getPlaylistItems` | Playlist details and videos |

## How the URL is protected

Claude's custom connectors cannot send custom headers, so the endpoint lives at a secret path:

```
https://<your-service>.onrender.com/<MCP_SECRET>/mcp
```

Anyone without the full URL gets a 404. Treat the URL like a password. If it leaks, change `MCP_SECRET` in Render and update the connector.

## Setup

### 1. Google API key

1. In Google Cloud Console, create a project (for example `claude-youtube-mcp`).
2. APIs & Services → Library → **YouTube Data API v3** → Enable.
3. APIs & Services → Credentials → Create credentials → **API key**.
4. Restrict the key to YouTube Data API v3.

### 2. Deploy on Render

1. Render dashboard → **New → Blueprint** → connect this repo. Render reads `render.yaml`.
2. When asked, paste your key into `YOUTUBE_API_KEY`. `MCP_SECRET` is generated for you.
3. After the deploy, open the service → **Environment** and copy the value of `MCP_SECRET`.
4. Your connector URL is `https://<service-name>.onrender.com/<MCP_SECRET>/mcp`.
5. Check it is alive: `https://<service-name>.onrender.com/healthz` should return `ok`.

### 3. Connect to Claude

1. On claude.ai: Settings → Connectors → **Add custom connector**.
2. Name: `YouTube`. URL: the connector URL from step 2. Leave OAuth fields empty.
3. In the Claude app, enable the connector from the **+** menu and try:
   *"Search YouTube for the latest videos on solar irrigation in Zambia and summarise the transcript of the top result."*

## Things to know

- **Quota.** The free 10,000 units a day go further for lookups than searches. A search costs 100 units (about 100 searches a day). Video, channel and playlist lookups cost about 1 unit each. Transcripts do not use the quota.
- **Transcripts from cloud servers.** Transcripts are read from YouTube's public pages, not the API. YouTube sometimes blocks requests from data-centre addresses like Render's. If transcripts fail while search works, that is the cause, not your key.
- **Cold starts.** Render's free tier sleeps after 15 minutes idle. The first request after that takes about 30 to 60 seconds. If Claude times out on the first try, ask again.
- **Extra keys.** You can add `YOUTUBE_API_KEY2` and `YOUTUBE_API_KEY3` (keys from other Google projects). The server rotates through them when one runs out of quota.

## Run locally

```bash
npm install
cp .env.example .env   # fill in the values, then:
set -a; . ./.env; set +a
npm start
# MCP endpoint: http://localhost:8000/<MCP_SECRET>/mcp
```
