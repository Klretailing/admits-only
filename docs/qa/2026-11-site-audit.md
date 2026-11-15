# Site audit, November 2026

A full pass over AdmitsOnly, run like a release cycle: automated discovery, code review, triage, fixes, regression testing.

## How it was run

- **Site-walker** (`npm run audit:site`, `scripts/site-audit/walk.mjs`). It signs in as every role, including a brand-new student, follows the links a visitor would see, and opens every page on desktop and phone, in light and dark. It checks for errors, broken links, layout overflow, clipped text, broken values ("NaN", "undefined"), unnamed controls, contrast, tap-target size and layout shift. Run it before every release.
- **Three code reviewers**, each covering one area:
  - the server API (authorization, injection, crashes, data integrity);
  - the student app;
  - the tutor, parent, admin and public pages.
- **Verification.** Every finding was checked against the code before it was fixed. The security fixes were then exercised against a local build.

## Results

| | Before | After |
|---|---|---|
| Site-walker: broken links | 8 | 0 |
| Site-walker: failed requests | 24 | 4 (only the deliberate /no-such-page test) |
| Site-walker: console errors | 28 | 0 after the favicon fix |
| Site-walker: unnamed controls | 176 | 0 |
| Site-walker: unlabeled inputs | 390 | 336 (deferred, see below) |
| Code-review findings | 82 | 64 fixed, 6 partly fixed, 12 deferred (remaining work below) |

## Fixed

### Critical and high: security and data loss
- **Admin password published in the repository.** Admin is now created only from `ADMIN_PASSWORD`. An account still on the old password is rotated on the next start, and the old password is refused for admin sign-in regardless.
- **Community channels could be deleted.** Any user "leaving" a community channel deleted it, along with every message.
- **Admin sign-up failed open** when `ADMIN_SECRET_KEY` was unset.
- **Session secret fallback.** A missing `NEXTAUTH_SECRET` meant session cookies were signed with a public string.
- **Data visible to the wrong people:**
  - students saw every booking their tutor had, for all students;
  - any user could read any pod document by id;
  - Adam conversations could be read and written across accounts;
  - motif boards, earnings, parent checklist items, bookings, pod sessions, reactions, polls and message reports were not scoped to their owner;
  - tutor review claims needed no connection to the student;
  - a tutor kept access to a student's work after the student removed them.
- **Lost work:**
  - switching essays within a second could write one essay into another;
  - a failed profile load let autosave wipe the profile;
  - "+ Track" on the College Map replaced the whole application list;
  - fast edits on Applications were dropped;
  - tutor lesson notes and essay reviews lost edits.
- **Crashes:**
  - Applications crashed on the first decision;
  - "Submit for review" always failed (`updatedAt` had no database default; this is now fixed for every table);
  - one malformed analytics event took down admin analytics;
  - one malformed tracker stopped the reminder-email job.

### Essay analyzer
- **Readable feedback.** Body text is 14px and nothing is under 12px. Feedback leads with "Start here", the three changes worth making with examples, then what's working and words to look at. One headline score sits above four parts, and every bar reads higher-is-better.
- **Consistent advice.** "Word choice" no longer rewards SAT words that the readability check tells students to remove.
- **First visit.** A welcome with three steps and "Try it on a sample essay".
- **Layout.** The editor overflowed off the right edge at every width because of a `1fr` grid trap. It now fits at every width from phone to desktop.

### Broken flows
- **Missing pages.** `/privacy-policy` and `/terms` were 404s; new Privacy and Terms pages now exist.
- **Tutor student pages.** "View details" and the overview links landed on "Student not found".
- **Sessions.** Join disappeared at the start time, and the sessions page wasn't linked from anywhere.
- **Dates and countdowns:**
  - dates showed a day early in US time zones (deadlines, earnings, checklist, lesson notes);
  - countdowns read "NaNd left", and the deadline day said "1 day left".
- **Missing options.** There was no Deferred column on the board, phones couldn't submit an essay for review, and existing students couldn't accept a tutor invite.
- **Inputs that didn't match.** Connection codes failed without the hyphen, and sign-in was case-sensitive on email.
- **Study Pods:**
  - switching pods quickly showed the wrong messages;
  - community channels showed a blank invite code;
  - documents deleted with one click;
  - closing a document discarded edits silently;
  - sessions and polls could be created twice.
- **Content.** The FAQ was template copy for programs that don't exist. The newsletter form claimed reCAPTCHA and couldn't be submitted from outside two regions.
- **Error states.** Silent failures now show messages: Adam, tutor reviews, essay create and save, and parent and tutor dashboards that looked empty when they had failed to load.

### Accessibility
- **Escape closes** every student modal, the Adam panel and the mobile menus.
- **The closed Adam panel** is out of the tab order.
- **Icon-only buttons** have names; essay cards open from the keyboard; admin toggles are real switches.
- **Contrast.** The newsletter form's muted text was raised to 4.5:1.

## Deferred (backlog)

| Area | Issue | Why deferred / suggested fix |
|---|---|---|
| Tutor | "Today" and "this month" on the tutor overview and earnings use server time (UTC) | Needs the tutor's time zone stored or sent from the browser |
| Pods | Toggling a reaction off and on earns XP each time | Award XP once per message, per user |
| Admin | Unknown id on `admin/contacts` returns 500 | Use `deleteMany` / `updateMany` and return 404 on no match |
| Student | Applications list rows, sort headers and College Map rows are click-only | Make them buttons, or add `role` / `tabIndex` and Enter handling |
| Student | Essay samples and Settings show empty states when loading fails | Check `res.ok` and show a retry, as Sessions now does |
| Student | Profile says tutors can't see essays; Settings says they can | Decide what tutors see, then make both texts match |
| Tutor | Note field can submit twice; a network error leaves the button disabled | Guard with a pending ref; reset in `finally` |
| Parent | Financial: "Saved" shows without checking the response; Add scholarship can double-submit | Check `res.ok`; disable while pending |
| Tutor/Admin | Schedule, Services, Settings and admin essay-library forms close or claim success on error | Check `res.ok` and keep the form open on error |
| Tutor | Students page shows "No students yet" when loading fails | Add an error state |
| Admin | Settings "Save All Changes" only changes local state | Wire it to an API, or remove the controls |
| Tutor | Settings copy promises meeting links that auto-fill, and code sharing that students can't use | Rewrite the copy, or build the feature |
| Parent | Settings says tutors can't see decisions; the tutor workspace shows them | Align the copy with the product |
| Tutor | Ctrl/Cmd+N shortcut can't override the browser | Use a different shortcut |
| All | Tutors and parents following a deep link lose `?next=` | Pass `next` on redirect and honor it for every role |
| Tutor | Student Progress can show the previous student when switching fast | Ignore stale responses, as the pods fix does |
| All | Many form labels aren't tied to their inputs (`htmlFor` / `id`) | Fix page by page; the walker lists them |
| All | Some layout shift on load; some tap targets under 24px on phones | Reserve space for late content; enlarge small icon buttons |

## Needs the owner

1. **Set `ADMIN_PASSWORD`** (12+ characters) in Vercel before deploying. Without it, the old published admin password stops working and there is no admin login.
2. **Set `NEXTAUTH_SECRET`** (`openssl rand -base64 32`) and **`CRON_SECRET`** in Vercel if they aren't set already.
3. **Review the new Privacy and Terms pages.** They describe what the code does, in plain language. Have them reviewed before relying on them legally.
4. **Refunds and scholarships.** The old FAQ promised a two-week satisfaction guarantee and need-based scholarships. If those are real, they can be added back.
5. **Testimonials.** Tell us which family got into which school, so the "Admitted to" tags can be restored accurately.
