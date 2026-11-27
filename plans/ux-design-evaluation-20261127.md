# Handover UX evaluation

27 November 2026 · Kivilo mobile and browser apps

An agent starting a check-in could see two buttons for the same task on Properties and then encounter a much smaller button to finish setup. The phone and browser also used three different primary pinks. The changes below give the main task a consistent place, colour and size. [Design system](design-system.md)

| Priority | What an agent or recipient encounters | Decision and evidence |
| --- | --- | --- |
| High | At a phone width of 390, the native Create check-in footer was only 135 units wide. Its existing test accepted any centred button below the maximum width. | Align Create with the input edges. It now measures 358 × 50. The test checks both edges at five widths from 393 to 1366. [Native check-in](design-system/new.png) |
| High | Home used deep pink with white type. The browser used two additional fills across sign-in, capture, review and sharing. White on bright pink measures 3.53:1. | Use brand pink with dark ink for a 5.03:1 label. Migrate local action recipes to shared roles. Keep deep pink for text and selected outlines. [Home](design-system/home.png) · [Web sign-in](design-system/web-login.png) |
| High | Empty Properties offered Start check-in in the card and New check-in in a floating button. The web repeated the same link. An active filter used the same emphasis as creating a report. | Keep a single creation action. Give mobile a fixed footer and web a full-width phone action near the title. Mark the selected filter independently. [Mobile Properties](design-system/properties.png) · [Web Properties](design-system/web-properties.png) |
| Medium | Web Properties placed team controls ahead of the page title. The navigation links used the same treatment as task buttons and gave no indication of the current section. | Lead with the title and next task. Give main navigation a distinct current-section underline and accessible current state. [Web Properties](design-system/web-properties.png) |
| Medium | Check-in and renewal used locally styled fields. Sign-in, Create and Sign had different heights and corners. The browser shell's 44-unit minimum also overrode the shared action's intended height. | Use shared action and form-field geometry on these paths. Check the actual computed size in the browser. [Web check-in](design-system/web-new.png) |
| Medium | The deposit answer gave Agree a filled pink button and recording a disagreement a filled red button. A disagreement is an available response. | Give Agree and Dispute equal prominence. Use the standard submit action once the party has chosen a response. Reserve filled red for destructive confirmation. [Deposit response](../src/components/deposit-statement-answer.tsx) |

## Keep

Home already promotes the latest unfinished handover above creating another one. Room review identifies what still needs attention. The camera has its own dark surface. Signed reports keep their reading layout and link their photos to inventory entries. These patterns fit the work. [Previous handover walkthrough](ux-audit-20261126.md)

## What was evaluated

The baseline is the English Teams and tenancy release candidate at `db4ad3a`. Its shared colour theme and browser stylesheet match the production source at `a618a8b`. The six matched pairs use English, a 390 × 844 viewport, the same account scenario and the same task state. The three native screens use fixture data and a system-font renderer. The three browser screens use the local application and sign-in flow. Native Properties has no cached illustration in the fixture. The colour count and the findings about review, signing and response controls also use a source inspection of their actual components.

This is an expert review. Agent task time, preference in outdoor light and success on a physical handset have not been measured. The long New check-in form remains the next usability question. During a real handover, observe whether a first-time agent can enter only the essentials, resume after a missing required field and save the first room photo without prompting. Record where they hesitate before changing the order of the form.
