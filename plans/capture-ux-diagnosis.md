# Capture flow UX diagnosis (2026-08-26)

Written after Yuxi tested the live capture sheet on an Android phone and found it unusable:
photos and notes invisible at capture time, uploads very slow, the upload banner covering
the sheet. Sources: a five-lens critique panel (field use, platform behaviour, copy, trust,
end to end flow) with every browser/OS claim checked against primary sources, plus two
findings from direct inspection of the deployment. Line refs are against db5e413.

## Two findings outside the panel

**Functions run in Virginia, data lives in Singapore.** `x-vercel-id: sin1::iad1` on
`/reports/<token>`. There is no region setting anywhere in the repo, so every server
action and every dynamic page render crosses the Pacific twice, and `/inspections/[id]`
issues 16 sequential queries per render. Each capture upload does `requestUploadUrl`,
`registerCapture` and a `router.refresh()` of that page, so a single photo costs
roughly 3 to 4 s of pure latency before bytes are counted. Fix: pin functions to `sin1`.

**Photos upload at full camera resolution.** 4.5 and 5.8 MB per photo in the screenshot,
no client-side downscale anywhere in `src/`. A 2048 px JPEG at quality 0.85 is 0.5 to
1 MB and still reads a rating plate; Gemini downsamples further anyway. Uploads are also
strictly sequential (`upload-queue.tsx`), and a failed one waits for the 20 s timer.

**Decision taken on the day:** stay on the PWA. None of the three complaints are caused by
being a web app; go-live is 2026-09-13; a native build would ship after that and inherit
the same slow uploads. The one thing native genuinely buys, a continuous shutter, is
reachable on the web with `getUserMedia` and is listed under Later below.

## Panel diagnosis

Line numbers below were checked against the working tree at HEAD (db5e413). The flow lens quoted a stale copy of `room-capture.tsx` (offsets ~30 to 40 lines off); its findings are kept, its line refs are corrected here.

## Root causes

### 1. The sheet shows server state, not device state. The inspector cannot see what they just shot.
Lenses: field, platform, copy, trust, flow (all five).

The capture list (`src/components/room-capture.tsx:331-357`) and the Done button (`:359`) render `room.captures`, which is the server query from `src/app/(app)/inspections/[id]/page.tsx` and is only refreshed by `router.refresh()` after a successful upload (`src/components/upload-queue.tsx:121`). `CaptureSheet` destructures only `add` from `useUploadQueue()` (`:191`); `pending` is never read. `RoomCard` counts `room.captures` too (`:81-82`), so it prints "Nothing captured yet" with twelve photos in IndexedDB.

Consequences, all the same bug:
- Offline: shoot a room, scroll down, no list, no Done button. Only signal is the bottom banner.
- On weak signal: the row pops in seconds or minutes later with no link to the shutter press. Inspector reshoots.
- Close and reopen the sheet: `tookPhoto` / `tookVideo` are component state (`:199-200`), the sheet unmounts on close (`:449`), so the amber "now photograph the labels" nudge returns for labels already photographed.
- Done is tappable while photos are queued: it is disabled only on the local `pending` transition (`:362`). `finishRoomCapture` (`src/lib/actions.ts:251`) sets PROCESSING and extraction reads DB rows only. A late `registerCapture` then flips the room back to CAPTURING (`actions.ts:223`) unconditionally, overwriting PROCESSING or REVIEW. Draft is missing exactly the rating-plate close-ups that were still uploading, and the card goes backwards with no explanation.

The invariant "a capture is never lost" is true in IndexedDB and false on the screen. This is the single failure that makes the inspector distrust the app, and that distrust produces duplicate shots, which double the queue.

### 2. One native camera round trip per photo.
Lenses: field, platform, flow. Verified true (Chromium `SelectFileDialog.java` read directly; Brave has no override).

`:280-293` is `<input type=file accept=image/* capture="environment" multiple>`. With `capture` present and image-only `accept`, Android Chrome/Brave fires `ACTION_IMAGE_CAPTURE` directly and hands back one file; `multiple` is only attached to picker intents. iOS is the same effect via `UIImagePickerController`. So a 12-shot room is 12 loops of: tap Take photos, camera cold start, shutter, OS confirm, return to tab, sheet re-mounts scrolled to top, find the pink button again. The button copy ("Take photos") and the four-bullet shot list promise a session the input cannot deliver. Roughly 40 taps and 26 app switches per room; several hundred per flat.

Each round trip also exposes the tab to being killed behind the camera (verified: Chromium persists only the error string across restart and shows "Unable to complete previous operation due to low memory"; the file result is dropped and never reaches `onChange` at `:288`). Sheet open state, the typed note, and `tookPhoto` are all React state and die with it. The "never lost" guarantee only begins once JS has the file, and the platform cuts exactly that window. Note: the verifier says the mechanism is activity/process restart, not Chrome's "tab discard" feature; the label was wrong, the outcome is as described.

### 3. The room is a modal over a dashboard, not a screen in a walk.
Lenses: field, platform, flow, copy.

`:235-242`: `fixed inset-0 z-40`, `max-h-[90vh] overflow-y-auto`, opened from a card grid. Fallout:
- No next-room path. Done calls `finishRoomCapture` then `onClose()` (`:365-366`); "Mark room reviewed" pushes back to the hub. Room order exists (`orderBy order asc`) and is never used. Nine times per flat the inspector scrolls the grid to find the next card.
- Three exits (scrim tap `:236`, Close `:252`, Escape `:203`) with no confirmation and no statement of what is kept; the scrim is the whole screen and is where an Android user taps to drop the keyboard after typing a note. Android Back is unhandled (verified true: Back never reaches the page as a keydown; with no CloseWatcher or `<dialog>` it navigates away from `/inspections/[id]`).
- The queue banner (`upload-queue.tsx:166`, `z-50 fixed bottom-0`) sits over the z-40 sheet and covers Done and the last row precisely while uploads are in flight. `<main>` gets `pb-24` for it (`layout.tsx:29`); the sheet gets nothing.
- The dimmed app header (Kivilo, Install app, Sign out) still eats the top of the screen for nothing.
- Rationale prose fills the top of the sheet on every open: `:247-250`, `:304-309`, `:311-316`, `:326-329`. The primary button is the fourth block down under a 2-row textarea. On a 570px viewport the list and Done are below the fold on every open.

### 4. "Done" on a room with human edits wipes them.
Lenses: flow, trust.

"Capture more" is offered on REVIEW/REVIEWED rooms (`:148-161`); the sheet's Done and the card's Re-read both run `processRoom`, which does `db.inspectionItem.deleteMany({ where: { roomId } })` (`src/lib/inspection/process.ts:50`) with no `editedByHuman` guard and no confirm. The natural sequence (review kitchen, notice the hob plate is missing, take one photo, tap Done) throws away every correction in that room. AGENTS.md says `editedByHuman` flips to protect a row; the flow does not honour it. Root cause 1 also triggers this path silently via the CAPTURING flip.

### 5. Stuck uploads are effectively discarded from the inspector's point of view.
Lens: trust.

`upload-queue.tsx:19,88`: after 5 attempts a capture is skipped on every future flush, including when signal returns. Attempts are burned by the 20s timer, every `add`, and every online transition, so about 100s of bad signal exhausts them. `lastError` is stored and never shown; the only surfacing is "N failed repeatedly" in 12px red (`:184`) with no room, kind, retry or remove. The banner says "uploading now" whenever `navigator.onLine` is true (`:177`), which is a link-up flag, not a throughput signal (verified partly: no implementation measures throughput, so "lies on lie-fi" is the correct reading). And if the IndexedDB write itself fails, `capture()` (`:208-228`) is try/finally with no catch, so the one genuine loss path has zero feedback (verified partly: QuotaExceededError is the spec'd and Chromium-implemented name; Firefox may throw other errors).

### 6. Rows are unidentifiable and Remove is a one-tap hard delete.
Lenses: field, platform, copy, trust.

`:333-355`: kind, note-or-duration-or-literal "no note", megabytes, Remove. No thumbnail, no ordinal, no time; `CaptureRow` carries no URL. Blur on a meter face is undiscoverable until the model returns low confidence hours later. Remove (`:344-353`, `text-xs text-gray-400`, no padding, no confirm) calls `deleteCapture` which hard-deletes the row (`actions.ts:232-244`). The video row is first in the list, in a scroll container the thumb is dragging.

### 7. The note is designed backwards.
Lenses: field, copy.

Must be typed before the shot (`:257-266`), cleared after every capture (`:224`), attaches to the first file only (`:287-292`), and is the first interactive element in the sheet. Nobody types before shooting one-handed in a corridor, so every row says "no note" and the damage context that matters at check-out is lost.

## Smaller problems

- Copy contradicts itself: pink primary says photos; the only "Recommended:" in the sheet is under the outlined video button (`:318-329`). Commit 86ae553 flipped the buttons and left the badge.
- Nine verbs for one job: Start capture / Capture more / Done with this room / Done with {room} / Review / Open / Re-read / Remove room / Close. Two are identical actions. "Re-read" says nothing about discarding the draft.
- "Reading" as a room status collides with "meter reading" on the same page (`status-badge.tsx:6`, page renders "Reading: {meterReading}").
- Room name is an editable input styled as a heading (`:88-96`), the largest tap target on the card; tapping to open the room raises a keyboard.
- Check-in creates no rooms; the add-room chip box sits below the grid, one server round trip per chip with all chips disabled while pending. Check-out already seeds rooms (`actions.ts:459-460`).
- A 5s video satisfies `hasVideo` and suppresses the only nudge; no threshold or warning.
- Processing state: 160px indeterminate bar with no text below the add-room box; a PROCESSING card still offers Capture more.
- `text-xs text-gray-400` at 2.6:1 contrast (verified: fails every WCAG tier) on Remove, Close, room-remove, list rows.
- Hover-only styles on every control, no active state, disabled is a 50% fade with no message.
- Em dash in the amber nudge copy (`:313`), against the house rule.
- Sheet uses `90vh`; should be `svh`/`dvh`. `env(safe-area-inset-bottom)` does not clear Safari's tab bar in a non-installed tab.

## Verification notes

| Claim | Verdict | Effect on diagnosis |
|---|---|---|
| capture + multiple yields one file per launch on Android Chrome/Brave | True (Chromium source) | Root cause 2 stands at full weight. Removing `multiple` is safe. |
| Same on iOS Safari | Partly | Effect is one file (delegate asserts count == 1); WebKit does forward the flag via SPI. Conclusion holds. |
| Tab discarded during camera, photo dropped | True mechanism, wrong label | Not Chrome "tab discard"; it is Android killing the backgrounded browser activity. Outcome identical. Kept. |
| iOS reloads "frequently" after camera | Partly | Documented on old low-RAM devices and WebKit bug 172533 (WORKSFORME); no evidence for "frequently" on current hardware. Downgraded to "possible". |
| Long video is the case most likely to trigger discard | Partly | Android: confirmed, and the 10 min `videoMaximumDuration` cap on iOS is a bigger practical issue. iOS "backgrounded during transcode" not supported. Kept as Android-only. |
| Android Back leaves the inspection | True (HTML spec, Chromium BackPressManager) | Kept. |
| 90vh plus URL bar overflows the viewport | Mostly wrong mechanism | vh is the large viewport; 90vh fits in portrait. The screenshot overflow is content height, not vh arithmetic. Dropped as a cause; keep svh/dvh as hygiene. |
| Scrim tap is where Android users dismiss the keyboard | Partly | Tap-outside does blur and hide the IME in Chrome; Back is the documented primary route. Kept as "a real secondary route". iOS "Done bar exposes more scrim" is wrong; dropped. |
| Remove/Close well under touch minimums; 12px link is ~20px tall; thumb covers ~40px | Partly | 48dp Material and 44pt HIG hit region confirmed; link box is ~14 to 18px, not 20; "~40px thumb" has no source. Kept: targets are too small; specific numbers dropped. |
| gray-400 on white is ~2.5:1 | Confirmed (2.60:1) | Kept. "8 to 9pt physical" is wrong; it is about 5pt, which is worse. "Invisible in sun" is inference. |
| Hover-only affordances never show on touch | False | Both engines apply :hover on tap and leave it sticky. Rename-input affordance is still invisible before the first tap; demoted to a smaller problem with corrected wording. |
| navigator.onLine true with no throughput | Partly | No implementation measures throughput; iOS uses a private API. Direction of claim correct. |
| IndexedDB write fails silently on low storage / privacy config | Partly | QuotaExceededError is spec'd and Chromium-implemented; Firefox may throw UnknownError; "disabled entirely" is now mostly "open() refused under block-all-cookies". The code path (no catch) is the point and stands. |

## Redesign proposal

Constraint: ships by 2026-09-13 with the existing IndexedDB queue, server actions and extraction untouched in shape. Invariants respected: everything still enters `offline-queue.ts` before anything else; no model output reaches a signature; authorization stays in `src/lib/auth.ts`; extraction stays per room.

### Screen A: Inspection start
Full page, not a grid. On check-in creation, seed rooms from a property template (bedroom count and type on the new-inspection form; check-out already copies rooms). Present the list in walk order, drag-to-reorder later, with a single primary button "Start at Entrance". Each row: name, capture count including queued items, status chip. Rename is behind a pencil icon; tapping the row opens the room.

### Screen B: Room capture (a route, `/inspections/[id]/rooms/[roomId]/capture`)
Not a modal. Header: room name, "3 of 9", a back arrow that goes to Screen A and preserves everything (there is nothing in-memory to lose; see below).

Body, top to bottom:
1. Shot checklist, four rows, each a real toggle the inspector taps after taking that kind of shot: Corners, Appliances, Plates and meters, Damage. Persisted in IndexedDB keyed by room. Done is not blocked by it, but an unticked "Plates and meters" produces an inline warning at Done.
2. Big primary "Photo" button that opens the camera input (no `multiple`, one shot is what you get). Under it, "Video" as a secondary. One line of guidance: "Plates and serials as close-ups. Video is evidence, not what the model reads." Nothing else.
3. The capture strip: thumbnails from the object URL of the queued blob (pending) or the signed URL (uploaded), newest first, each with a state dot: on device / uploading / uploaded / failed, plus a tap-to-retry on failed. This list is the merge of `useUploadQueue().pending` filtered by roomId and `room.captures`. Tapping a thumbnail opens it full screen with the note field ("What is this?") and a Delete that requires a second tap to confirm; delete on a not-yet-uploaded item removes from the queue, on an uploaded item calls `deleteCapture`.
4. Sticky footer, inside the route and above any banner: "Done with Living room" on the left, "Next room" on the right. Done is disabled while any capture for this room is pending or failed, with the count shown on the button ("Waiting for 2 uploads"). Next room is always enabled.

The queue banner is removed from `(app)` layout and replaced by a per-room state in the strip plus a small global count in the app header on Screen A.

The room's UI state (checklist, last open room) lives in IndexedDB or `sessionStorage`, so a browser kill behind the camera returns the inspector to the same room with the same list. A photo lost to a kill before `onChange` is still lost; the strip makes the loss visible immediately, which is the honest fix available this month.

### Screen C: Room review
Unchanged, except "Mark room reviewed" is followed by "Next room to review" instead of a push to the hub.

### Server-side changes needed for the above
- `registerCapture` stops flipping status to CAPTURING when the room is PROCESSING, REVIEW or REVIEWED; instead set a `hasNewCaptures` flag the card shows as "2 new photos since the draft".
- `processRoom` preserves rows with `editedByHuman = true` and only replaces model-authored rows; Re-read prompts with the number of edited rows that will be kept.
- Stuck captures: drop the hard `MAX_ATTEMPTS` skip; back off exponentially and always retry on online transition. Surface `lastError` on the thumbnail.
- `capture()` catches the enqueue rejection and shows a blocking error ("Could not save to this phone: storage full") instead of resetting silently.

### Problem to fix mapping
| Root cause | Removed by |
|---|---|
| 1. Sheet shows server state | Screen B strip merges queue and server; Done gated on queue; checklist persisted |
| 2. One camera round trip per photo | Not removed this month. Reduced: no re-scroll to the button, no lost state on return, honest single-shot label. See Later. |
| 3. Modal over a dashboard | Room becomes a route with Next room; no scrim, Back works as history; banner gone |
| 4. Done wipes human edits | `processRoom` keeps `editedByHuman` rows; `registerCapture` stops the CAPTURING flip |
| 5. Stuck uploads discarded | Retry on every online transition, per-item retry in the strip, `lastError` shown, enqueue failure surfaced |
| 6. Unidentifiable rows, one-tap delete | Thumbnails with state, full-screen view, two-step delete |
| 7. Note designed backwards | Note attaches after the shot, per thumbnail |
| Copy contradictions, nine verbs | Screen B has two capture verbs and two exits; one line of guidance |
| No rooms on check-in | Property template seeds rooms in walk order |

## Later

- In-app camera via `getUserMedia` with a shutter that stays open and a per-room counter. This is the only real fix for root cause 2 and for the kill-behind-camera loss, since the frame never leaves the page. It also enables burst plates. Needs its own permission flow and iOS testing; not for this module.
- In-page `MediaRecorder` for video with chunks written to IndexedDB as they arrive, removing the 10 minute iOS cap and the transient-memory risk.
- Blur detection on photos before leaving the room (Laplacian variance on a canvas) to warn on unreadable plates.
- Drag-to-reorder rooms and per-agency room templates.
- Upload progress by bytes for video (tus or chunked upload to Supabase Storage).