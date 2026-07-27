# Local Watch History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save up to 200 locally viewed talks with playback positions, resume unfinished YouTube videos, and expose the history at `/history`.

**Architecture:** Keep validation and playback decisions in pure application functions, isolate browser persistence in one localStorage adapter, and load the YouTube IFrame Player API only after the user starts a video. The history page renders a server shell and a client-only list from the stored metadata snapshot.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Bun test, happy-dom, YouTube IFrame Player API, browser localStorage.

## Global Constraints

- Use the versioned storage key `early-buddhism:watch-history:v1`.
- Record only playback positions of at least 30 seconds.
- Save during playback at 15-second intervals and on pause, end, page hide, and component cleanup.
- Treat playback as completed at 90 percent or when 30 seconds or less remain.
- Resume unfinished playback three seconds before the saved position.
- Keep at most 200 entries, newest first.
- Load the YouTube iframe and IFrame Player API only after explicit playback or transcript-cue activation.
- Explicit transcript-cue playback overrides the saved resume position.
- localStorage or YouTube API failures must not prevent normal playback.
- Do not modify the existing uncommitted search, listing, or pagination work.

---

## File Structure

- Create `app/application/watch-history.ts`: types, parsing, ordering, retention, completion, and resume decisions.
- Create `app/application/watch-history.test.ts`: pure behavior tests.
- Create `app/infrastructure/browser/watch-history-storage.ts`: safe localStorage reads and writes.
- Create `app/infrastructure/browser/watch-history-storage.test.ts`: browser-storage failure and round-trip tests.
- Create `app/infrastructure/youtube/iframe-api.ts`: singleton lazy loader and minimal YouTube player interfaces.
- Create `app/components/lite-youtube-embed.client.test.tsx`: mounted player integration tests with a fake YouTube player.
- Modify `app/components/lite-youtube-embed.tsx`: lazy API initialization, interval lifecycle, persistence, resume, and fallback.
- Modify `app/components/talk-detail-player.tsx`: pass talk identity to the client player.
- Modify `app/components/talk-detail-player.test.tsx`: update required props and preserve server markup behavior.
- Modify `app/talks/[id]/page.tsx`: provide the talk ID to the player.
- Create `app/history/watch-history-list.tsx`: client-only history rendering.
- Create `app/history/watch-history-list.test.tsx`: empty and populated history rendering.
- Create `app/history/page.tsx`: noindex page shell.
- Create `app/history/page.test.tsx`: metadata and shell tests.
- Modify `app/components/header.tsx`: add the “視聴履歴” navigation item.
- Create `app/components/header.test.tsx`: navigation regression test.

---

### Task 1: Pure Watch-History Rules

**Files:**
- Create: `app/application/watch-history.ts`
- Test: `app/application/watch-history.test.ts`

**Interfaces:**
- Produces: `WatchHistoryEntry`, `WatchHistorySnapshot`, `WATCH_HISTORY_LIMIT`, `WATCH_HISTORY_MINIMUM_SECONDS`, `parseWatchHistory(raw)`, `upsertWatchHistory(entries, snapshot)`, `isPlaybackCompleted(positionSeconds, durationSeconds)`, and `getResumeSeconds(entry)`.
- Consumes: no browser or React APIs.

- [ ] **Step 1: Write the failing tests**

Cover malformed JSON, malformed entries, duplicate replacement, newest-first order, 200-entry retention, 30-second minimum, completion thresholds, and three-second rewind:

```ts
expect(parseWatchHistory("invalid")).toEqual([]);
expect(upsertWatchHistory([], { ...snapshot, positionSeconds: 29 })).toEqual([]);
expect(isPlaybackCompleted(90, 100)).toBe(true);
expect(isPlaybackCompleted(69, 100)).toBe(true);
expect(getResumeSeconds({ ...entry, positionSeconds: 125 })).toBe(122);
expect(getResumeSeconds({ ...entry, completed: true })).toBe(0);
```

- [ ] **Step 2: Run the test to verify failure**

Run: `bun test app/application/watch-history.test.ts`

Expected: FAIL because `./watch-history` does not exist.

- [ ] **Step 3: Implement the pure model**

Define the exact persisted shape:

```ts
export type WatchHistoryEntry = {
	talkId: string;
	title: string;
	thumbnailUrl: string | null;
	positionSeconds: number;
	durationSeconds: number | null;
	lastWatchedAt: string;
	completed: boolean;
};

export type WatchHistorySnapshot = Omit<
	WatchHistoryEntry,
	"lastWatchedAt" | "completed"
> & {
	lastWatchedAt?: string;
};
```

`parseWatchHistory` must accept only a JSON object keyed by talk ID, validate every field, discard invalid records, and return valid records sorted by descending `lastWatchedAt`. `upsertWatchHistory` must reject positions below 30 seconds, calculate completion, replace by `talkId`, sort, and slice to 200.

- [ ] **Step 4: Run the focused test**

Run: `bun test app/application/watch-history.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add app/application/watch-history.ts app/application/watch-history.test.ts
git commit -m "feat: define local watch history rules"
```

### Task 2: Safe localStorage Adapter

**Files:**
- Create: `app/infrastructure/browser/watch-history-storage.ts`
- Test: `app/infrastructure/browser/watch-history-storage.test.ts`

**Interfaces:**
- Consumes: `WatchHistoryEntry`, `WatchHistorySnapshot`, `parseWatchHistory`, and `upsertWatchHistory` from Task 1.
- Produces: `readWatchHistory(): WatchHistoryEntry[]`, `findWatchHistory(talkId): WatchHistoryEntry | null`, and `saveWatchProgress(snapshot): WatchHistoryEntry[]`.

- [ ] **Step 1: Write the failing adapter tests**

Install a replaceable fake `localStorage` on `globalThis`. Verify empty reads, round trips, replacement, object-keyed JSON output, and swallowed `getItem`/`setItem` exceptions:

```ts
expect(readWatchHistory()).toEqual([]);
saveWatchProgress(snapshot);
expect(findWatchHistory(snapshot.talkId)?.positionSeconds).toBe(45);
expect(() => saveWatchProgress(snapshot)).not.toThrow();
```

- [ ] **Step 2: Run the test to verify failure**

Run: `bun test app/infrastructure/browser/watch-history-storage.test.ts`

Expected: FAIL because the storage adapter does not exist.

- [ ] **Step 3: Implement safe reads and writes**

Use:

```ts
export const WATCH_HISTORY_STORAGE_KEY =
	"early-buddhism:watch-history:v1";
```

Wrap every localStorage access in `try/catch`. Serialize entries as:

```ts
Object.fromEntries(entries.map((entry) => [entry.talkId, entry]))
```

If reading or writing fails, return the last computed list or an empty list and never throw.

- [ ] **Step 4: Run Tasks 1 and 2 tests**

Run: `bun test app/application/watch-history.test.ts app/infrastructure/browser/watch-history-storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add app/infrastructure/browser/watch-history-storage.ts app/infrastructure/browser/watch-history-storage.test.ts
git commit -m "feat: persist watch history in local storage"
```

### Task 3: Lazy YouTube Playback Tracking

**Files:**
- Create: `app/infrastructure/youtube/iframe-api.ts`
- Create: `app/components/lite-youtube-embed.client.test.tsx`
- Modify: `app/components/lite-youtube-embed.tsx`
- Modify: `app/components/talk-detail-player.tsx`
- Modify: `app/components/talk-detail-player.test.tsx`
- Modify: `app/talks/[id]/page.tsx`

**Interfaces:**
- Consumes: `findWatchHistory`, `saveWatchProgress`, and `getResumeSeconds`.
- Produces: `loadYouTubeIframeApi(): Promise<YouTubeIframeApi>` and a `LiteYouTubeEmbed` accepting `talkId`, `title`, `thumbnailUrl`, and `embedUrl`.

- [ ] **Step 1: Update server-rendered player tests to fail**

Require `talkId` in `TalkDetailPlayer` test fixtures and assert the initial iframe still uses `about:blank`, the thumbnail button remains, and no API script is present in server markup:

```tsx
<TalkDetailPlayer
	talkId="TALK-1"
	title="テスト動画"
	embedUrl="https://www.youtube.com/embed/example"
>
	<div>本文</div>
</TalkDetailPlayer>
```

- [ ] **Step 2: Add failing mounted client tests**

Using the existing happy-dom setup pattern, mount `LiteYouTubeEmbed`, install a fake API loader/player, and verify:

- no API load before the button click;
- saved `positionSeconds: 63` starts at 60;
- explicit `LOAD_TALK_PLAYER_EVENT` source keeps its own `start` value;
- the fake playing state starts one 15-second interval;
- pause and ended states save immediately and stop the interval;
- `pagehide` and unmount save once without leaking listeners;
- rejected API loading leaves the iframe pointed at the normal autoplay URL.

The fake player exposes:

```ts
type FakePlayer = {
	getCurrentTime: () => number;
	getDuration: () => number;
	destroy: () => void;
};
```

- [ ] **Step 3: Run the player tests to verify failure**

Run: `bun test app/components/talk-detail-player.test.tsx app/components/lite-youtube-embed.client.test.tsx`

Expected: FAIL because `talkId` and API-backed tracking are not implemented.

- [ ] **Step 4: Implement the singleton YouTube API loader**

Create one module-level promise. Resolve immediately if `window.YT?.Player` exists; otherwise append:

```html
<script src="https://www.youtube.com/iframe_api"></script>
```

Preserve any prior `window.onYouTubeIframeAPIReady`, resolve all callers once, reject on script error, and allow a later retry after rejection. Export only the minimal player state constants and methods used by the component.

- [ ] **Step 5: Implement player lifecycle and fallback**

Update autoplay URLs with `autoplay=1&enablejsapi=1`; add `start=<seconds>` only for saved unfinished history. Keep an iframe ref, initialize `YT.Player` after its load event and API readiness, and save this snapshot:

```ts
{
	talkId,
	title,
	thumbnailUrl: thumbnailUrl ?? null,
	positionSeconds: player.getCurrentTime(),
	durationSeconds: player.getDuration() || null,
}
```

Start `window.setInterval(save, 15_000)` only in the playing state. Save and clear on pause/end; save on `pagehide`; clear the timer, listener, and player on cleanup. On API rejection, retain the normal iframe source so playback still works without progress tracking.

- [ ] **Step 6: Pass talk identity from the detail page**

Add `talkId` to `TalkDetailPlayer` props and pass `talk.id` from `app/talks/[id]/page.tsx`. Forward it unchanged to `LiteYouTubeEmbed`.

- [ ] **Step 7: Run focused player tests**

Run: `bun test app/components/talk-detail-player.test.tsx app/components/lite-youtube-embed.client.test.tsx app/talks/[id]/page.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit the task**

```bash
git add app/infrastructure/youtube/iframe-api.ts app/components/lite-youtube-embed.tsx app/components/lite-youtube-embed.client.test.tsx app/components/talk-detail-player.tsx app/components/talk-detail-player.test.tsx 'app/talks/[id]/page.tsx'
git commit -m "feat: save and resume YouTube playback"
```

### Task 4: User-Visible History Page

**Files:**
- Create: `app/history/watch-history-list.tsx`
- Create: `app/history/watch-history-list.test.tsx`
- Create: `app/history/page.tsx`
- Create: `app/history/page.test.tsx`
- Modify: `app/components/header.tsx`
- Create: `app/components/header.test.tsx`

**Interfaces:**
- Consumes: `readWatchHistory`, `WatchHistoryEntry`, and `buildTalkDetailHref`.
- Produces: `/history` with a client-populated list and `robots: { index: false, follow: false }`.

- [ ] **Step 1: Write failing rendering tests**

Test empty and populated list states:

```tsx
expect(renderHistory([])).toContain("視聴履歴はまだありません");
expect(renderHistory([unfinished])).toContain("続きから再生");
expect(renderHistory([completed])).toContain("もう一度見る");
```

Verify titles, newest-first order, thumbnail, formatted position, last-watched date, and detail href. Test the page metadata and assert Header includes `href="/history"` and `視聴履歴`.

- [ ] **Step 2: Run the rendering tests to verify failure**

Run: `bun test app/history/watch-history-list.test.tsx app/history/page.test.tsx app/components/header.test.tsx`

Expected: FAIL because the route and components do not exist.

- [ ] **Step 3: Implement the client history list**

Read localStorage once after mount and render:

- a loading-neutral empty shell before hydration;
- the empty-state explanation and `/talks` link;
- each entry’s thumbnail, title, elapsed/total time, last-watched date, completion badge, and detail link;
- “続きから再生” for unfinished entries and “もう一度見る” for completed entries.

Use `buildTalkDetailHref(entry.talkId)` and do not send the full talk catalog to the client.

- [ ] **Step 4: Implement the noindex page and navigation**

Use `SimplePageLayout` with title `視聴履歴`. Export:

```ts
export const metadata: Metadata = {
	title: "視聴履歴",
	robots: { index: false, follow: false },
};
```

Add `{ href: "/history", label: "視聴履歴" }` immediately after the video-list link in `navLinks`. Do not add `/history` to `app/sitemap.ts`.

- [ ] **Step 5: Run focused history tests**

Run: `bun test app/history/watch-history-list.test.tsx app/history/page.test.tsx app/components/header.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the task**

```bash
git add app/history app/components/header.tsx app/components/header.test.tsx
git commit -m "feat: add local watch history page"
```

### Task 5: Full Verification and Regression Check

**Files:**
- Modify only files required to fix failures caused by Tasks 1–4.

**Interfaces:**
- Consumes: completed watch-history feature.
- Produces: verified build with no unrelated changes included.

- [ ] **Step 1: Run all tests**

Run: `bun test`

Expected: all tests pass.

- [ ] **Step 2: Run static checks**

Run: `bun run lint`

Expected: exit 0.

Run: `bun run format:check`

Expected: exit 0. If only new watch-history files fail formatting, run `bun run format` and inspect that unrelated user changes were not rewritten before staging.

- [ ] **Step 3: Run the production build**

Run: `bun run build`

Expected: exit 0 and `/history` appears in the route output without adding a sitemap entry.

- [ ] **Step 4: Review scope and browser-loading behavior**

Run:

```bash
git status --short
git diff --check
git diff -- app/application/watch-history.ts app/infrastructure/browser/watch-history-storage.ts app/infrastructure/youtube/iframe-api.ts app/components/lite-youtube-embed.tsx app/components/talk-detail-player.tsx 'app/talks/[id]/page.tsx' app/history app/components/header.tsx
```

Confirm no search/listing/pagination file is staged, initial markup uses `about:blank`, and the YouTube API URL appears only in the lazy loader.

- [ ] **Step 5: Commit verification-only fixes if needed**

If verification required scoped fixes:

```bash
git add <only-watch-history-files>
git commit -m "fix: verify local watch history"
```

If no fixes were needed, do not create an empty commit.
