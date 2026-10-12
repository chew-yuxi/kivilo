# M5: property timeline

Planned 2026-10-13. One read-only feed per property: everything that happened at the
address, newest first, so the record that outlives each tenancy is something a person can
actually read.

## What is on it

Derived from rows that already exist. No new table and no migration.

| Event | From | When |
|---|---|---|
| Tenancy began / ended | `Tenancy` | start date; end date once passed |
| Check-in / check-out signed | `Inspection` at `COMPLETED` | the later of the two signatures |
| Assessment published | `AssessmentVersion` | `publishedAt`, one per version |
| Problem reported | `MaintenanceCase` | `createdAt` |
| Repaired | `MaintenanceVisit` with `completedAt` | `completedAt`, with cost |
| Confirmed fixed / not fixed | `MaintenanceVerification` | `createdAt` |
| Cost agreed | `ResponsibilityProposal` that was accepted, including later superseded ones | `respondedAt`, with the agreed sentence |
| Closed without repair | `MaintenanceCase` at `CLOSED_NO_ACTION` | `resolvedAt` |

Drafts, comments, proposals still open and unsigned inspections stay off: the timeline is
the settled record, and the case screen already carries the working detail.

## Who sees what

The tenancies on the feed are exactly those `tenancyScope` returns for the viewer, so
the rule cannot drift from maintenance:

- Landlord: every tenancy at the property, past and present.
- Tenant: their own tenancy only, never the tenants before or after them.
- Agent: the tenancy they are appointed to, until it ends.

A property with no tenancy in scope is a 404, the same as one that does not exist.

Each event links to where its detail lives, only when the viewer can open it. Every
maintenance case on the feed is openable, since it came through the same scope. An
inspection links only for the agent on that tenancy or the person who conducted it,
which is `inspectionScope`. Landlords and tenants see that a report was signed without a
link to the agent's working copy.

## Build

1. `src/lib/property-timeline.ts`: `propertyTimeline(propertyId, stakeholderId)` loads the
   scoped tenancies, and a pure `timelineEvents` turns them into the sorted feed so the
   derivation is unit-tested without a database. `GET /api/v1/properties/[id]/timeline`
   is a thin delegation.
2. Integration tests on the scope: a previous tenant sees nothing of the next tenancy, the
   landlord sees both, an agent sees nothing after the tenancy ends, and inspection links
   appear only for the agent.
3. Flutter `PropertyTimelineScreen`, opened from the tenancy screen: month headings, one
   row per event in the case-history style, tapping through to the case or inspection.

No pagination yet: one property accumulates a few dozen events a year. Revisit when a
property passes a few hundred.
