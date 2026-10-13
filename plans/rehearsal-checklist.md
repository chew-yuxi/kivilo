# Full-flow rehearsal on a phone

The "Before real agents use it" item in `DEPLOYING.md`. About an hour. It runs against
production with build 22, so use addresses you control and a made-up property.

## You need

- Build 22 on a phone (internal testing). Builds before 22 lack the cost and no-damage screens.
- Three email inboxes you can read: **agent**, **landlord**, **tenant**. Gmail `+` aliases
  work (`you+landlord@gmail.com`). Each role signs in separately, because the app shows
  each role only what it may see.
- Ideally a second phone or a simulator for the landlord and tenant; otherwise sign out
  and in between steps (Account, Sign out).

## Steps

Mark each one pass or fail. On a fail, screenshot it and note the step number.

**Check-in (as agent)**
1. Sign in with the agent address. The code arrives by email within a minute.
2. New inspection: made-up address, landlord and tenant names with *their* addresses.
3. Add two rooms. In each, take a photo, mark it (ring or arrow), add items by hand.
4. Mark both rooms reviewed, send for signature, and have both "parties" sign on the phone.
   *Expect:* status Completed; the report can no longer be edited.
5. Share the report and open the link in a browser while signed out.
   *Expect:* rooms, photos with marks in the right place, both signatures.

**Maintenance (as tenant, then landlord)**
6. Sign in as the tenant. *Expect:* the tenancy is listed; the check-in report is not editable.
7. Report a problem (Plumbing, "Kitchen tap leaks") with a before photo.
8. Sign in as the agent. *Expect:* a notification. Open the case and tap "Propose who pays":
   Split, tenant pays up to S$150, landlord arranges, reason "minor repair clause".
9. Sign in as the tenant. Tap "Suggest different" (Landlord pays), reason "worn washer".
10. Sign in as the landlord. Accept. *Expect:* "Agreed by both sides", and the case is acknowledged.
11. As the agent, record the completed repair with a cost of 95.
12. As the tenant, tap Fixed. *Expect:* the case is resolved, and the cost split shows Landlord S$95.00.
13. Open the tenancy, then Property timeline. *Expect:* signed check-in, reported, cost agreed,
    repaired, confirmed fixed. (The timeline screen arrives with build 23; skip on 22.)

**Check-out (as agent)**
14. Start the check-out from the completed check-in, review the rooms, and get both signatures.
15. With no findings, the button reads "Publish: no damage found". Publish it.
    *Expect:* the drawer says both parties will see a no-damage assessment.
16. Open the shared check-out link signed out. *Expect:* the no-damage assessment appears.

**Cleanup**
17. Account, Request account deletion, for the landlord and tenant test accounts if you
    don't want to keep them.

## Send me

Step numbers that failed, with screenshots. Note anything that was confusing even when it
worked: a label you had to think about counts.
