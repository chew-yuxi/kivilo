# Standalone check-out on a phone

28 November 2026. An agent arrives at 18 Palm Walk with a paper check-in. She needs to record a missing remote, finish the visit, and explain a proposed deduction to both parties.

The first review failed two of ten task checks. The walkthrough still said “Start check-out” after the visit began, and its list omitted the saved issue type. On the long review form, an error could appear outside the viewport after Create. The second pass changed the page titles, kept the issue type beside the evidence note, and brought the first invalid field into view. Date, email and deposit errors now appear beside their controls. Editing an issue preserves the original visit order.

| Task check | Verification |
| --- | --- |
| Find check-out from Home without creating a check-in | Local iPhone simulator, signed-in agent, Home → Start check-out |
| Start a new address with paper records | Native address form accepts the address and starts the walkthrough |
| Tell where you are and what was recorded | Walkthrough and Review check-out titles. Saved missing item retains its classification and note |
| Record evidence before supplying party details | Missing remote and printed-inventory note saved in Flutter before entering tenancy details |
| Leave and resume with the issue intact | Native regression remounts the screen using the same account’s saved draft |
| Keep a staged photo through retry | Native queue test and API end-to-end case cover delayed attachment and the review gate |
| Complete a clean visit | Native no-issues path and end-to-end creation retry produce one check-out |
| Find and fix an invalid field on a small phone | At 320 and 390 points with 130% text, tapping Create reveals the first missing field. Mistyped email clears after correction |
| Review and sign the report | Simulator creates the report against the local backend, which records both test signatures |
| Explain the refund | Native report shows S$1,940 after a S$60 deduction from S$2,000 |

All ten checks passed after the fixes. The count describes this expert walkthrough. The physical iPhone was unavailable and no Android handset was attached. Camera optics, on-device delivery and Jac’s own experience are unmeasured.

[Matched native walkthrough at 390 × 844](checkout-walkthrough-audit.png)
