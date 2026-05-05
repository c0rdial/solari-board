# for gek — PRD (tonight cut, v0)

> a deployed departure board. that's it.

**Owner:** Adam
**Status:** Active. Ship before midnight.
**Companion docs:** `spec.md` (full vision), `departures.html` (working mockup, source of truth for behavior).

---

## 1. The problem

A long-distance friendship needs a place where the next meeting is visible. Texting "when do we see each other again" is flat. A split-flap departure board, live-counting down to the next confirmed reunion, is not flat.

Tonight ships only the board. The desk, the notebook, the messages, the altar are all deferred to v0.5 and beyond.

## 2. Audience

Adam. On phone in bed. On laptop in the morning. One user, two contexts.

## 3. Goals (tonight)

1. Convert `departures.html` into a Vite + React app.
2. Deploy to a Vercel URL that resolves on phone.
3. The board feels as warm and mechanical in production as it does in the mockup.

## 4. Non-goals (tonight)

- No desk, no notebook, no other sections, no "back to the desk" link.
- No lock screen, no auth, no passphrase.
- No Supabase. Seed data in a TS file.
- No real audio recording from flipoff. Synthesized clack is fine.
- No custom domain.
- No palette tweaks.
- No real content. Seed departures stay as-is, edited only to reflect actual past or planned meetings if that takes 5 minutes or less.

## 5. The one flow

1. Open URL on phone.
2. Board cascades in.
3. Tap anywhere to enable audio.
4. Watch the countdown on the BOARDING row.
5. Close tab.

That is all this does tonight.

## 6. Functional requirements

P0 = required. P1 = if time.

- **P0-1** Renders the split-flap board from `departures.html`.
- **P0-2** Header with title, eyebrow, live clock, live date.
- **P0-3** All rows render with correct status styling (ARRIVED faded green, BOARDING amber with pulse, ON TIME standard, TBD dimmed).
- **P0-4** Initial cascade animation on load, per-character flip with stagger.
- **P0-5** Live countdown format: `87 DAYS` into `6D 14H` into `04:32:00` as depart time approaches.
- **P0-6** Periodic re-flip (~25s) on a random non-arrived row.
- **P0-7** Synthesized multi-component clack. Default on. Toggleable via the `♪` button.
- **P0-8** Info modal explains the metaphor. Close via button, overlay click, or Escape.
- **P0-9** Mobile collapses flight and gate columns gracefully.
- **P0-10** No console errors.
- **P1-1** Replace the seed departures with your actual past meetings and next planned trip. If this takes more than 15 minutes, defer.

## 7. Tech decisions

| Decision | Choice |
|---|---|
| Build tool | Vite |
| Framework | React 19 + TypeScript |
| Routing | None. Single page at `/`. |
| Styling | Tailwind 4 + CSS variables for design tokens |
| Content | `src/content/departures.ts` |
| Fonts | Google Fonts via `<link>` in `index.html` |
| Hosting | Vercel. Auto-detected. |
| Browser support | Modern only |

## 8. Build order

1. **(10 min)** `npm create vite@latest forgek -- --template react-ts`. Install Tailwind 4 per their Vite guide.
2. **(15 min)** Set up `src/styles/globals.css` with CSS variables from the top of `departures.html`. Add Google Fonts link in `index.html`.
3. **(10 min)** Define `src/content/departures.ts` exporting the seed data and a `Departure` type.
4. **(90 min)** Build `src/App.tsx` as a single page that renders `<Board />`. Build `src/components/Board.tsx` by porting the `<script>` block of `departures.html`:
   - `useState` for the row data
   - `useRef` for the AudioContext (survives re-renders, one instance)
   - `useEffect` for the cascade on mount, with cleanup
   - `useEffect` for the live clock (1s interval)
   - `useEffect` for countdown updates (60s interval)
   - `useEffect` for periodic flips (25s interval)
   - Extract `<Row />` and `<Flap />` subcomponents. Keep them in the same file.
5. **(15 min)** Mobile pass. iPhone 14 width. Fix anything broken.
6. **(10 min)** Push to GitHub, connect to Vercel, deploy, open on phone.
7. **(open)** Pick one actual past meeting and edit the seed data to reflect it. Optional.

**Estimated total: ~2.5 hours.** Start at 9pm. Done by 11:30.

## 9. Definition of done

- [ ] Lives at a public Vercel URL
- [ ] Cascade animation plays on first load
- [ ] Clock ticks, countdown updates
- [ ] Sound toggles on and off
- [ ] Info modal opens and closes
- [ ] Works on iPhone
- [ ] No console errors
- [ ] Feels warm (subjective, but the main test)

Ship when 7 of 8 pass.

## 10. Temptations to refuse tonight

1. **Adding the desk back in because the board feels lonely without it.** It will. Ship it anyway. The desk is a week of work.
2. **Swapping in the flipoff recorded audio.** Clone their repo another night.
3. **Tweaking the amber color.** It is fine.
4. **Building routing so you can add the desk later without refactoring.** You will refactor when you add the desk. Don't pay that cost tonight.
5. **Writing a custom flap animation library.** The one in the mockup works.
6. **Buying a domain.** Vercel URL is fine.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Porting vanilla JS to React introduces subtle bugs in the flip timing. | Use `setTimeout` and `setInterval` the same way the mockup does. Don't React-ify the animation logic into state updates. Direct DOM mutation via refs is fine here. |
| AudioContext fails on iOS Safari without gesture. | Initialize inside the first click handler. Keep the `started` flag pattern from the mockup. |
| Intervals leak on unmount. | Cleanup functions in every `useEffect`. Standard. Flagged because it is easy to miss when tired. |
| Tailwind theme does not pick up your CSS variables. | Use arbitrary values where needed: `text-[var(--amber)]`. Don't fight the theme config. |

## 12. Followups (v0.5)

1. Real past meetings in the data.
2. Integrate flipoff recorded audio.
3. Add routing and the desk landing page.
4. Scatter notebook.
5. Lock screen and passphrase.
6. Supabase for real data.

## 13. Followups (v1)

Per `spec.md` phases 3-4. Messages, altar, living state, custom domain, lamp brightness, page-flip animation.

---

*close this. `npm create vite@latest` now.*
