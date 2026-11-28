# Kivilo design system

Use this standard for the agent app, the browser app and forms opened by landlords or tenants. Start a new screen by naming the person, their task and the decision they can take now. Use a verb and the thing it acts on, such as **Create check-in**, **Review room** or **Send for signature**. Use **Teams** and **Personal** when describing who looks after a property.

[Visual reference with live web styles](design-system/action-reference.png) · [Audit and matched screens](ux-design-evaluation-20261127.md)

## Actions

| Job | Appearance | Implementation |
| --- | --- | --- |
| Advance the current task | Action pink fill with a white semibold label. One primary in the current decision. | Flutter `FilledButton`. Web `action-primary`. |
| Offer another action, including Cancel | Soft pink surface, deep pink text. | Flutter `OutlinedButton` or `TextButton`. Web `action-secondary`. |
| Open optional detail | A short text link with a clear destination. Keep it visually quieter than the task. | Flutter `kiviloTertiary`. Web `text-link` with underline. |
| Delete content or remove access | Red outline to open the decision. A filled red confirmation names the thing being removed. | Flutter `kiviloDangerOutlined` and `kiviloDangerFilled`. Web `action-danger` and `action-danger-confirm`. |
| Choose between valid answers | Give both answers the same weight. Selecting Dispute can open a reason field. Its submit button then records the chosen answer. | Use peer secondary buttons for Agree and Dispute. |
| Switch between lists or sections | Teasa’s view tabs use plain labels, muted when idle and semibold ink when selected. Centre an 18 × 3 ink mark beneath the current label. Keep the selected view visible when labels scroll. | Flutter `KiviloViewTabs`. Web `ViewTabs` with real links and `aria-current` for the current page or section. |
| Narrow the current list or choose a field value | Room filters use an ink check and a light grey selected surface. Form choices use the labelled segmented control or selection field. | Flutter `ChoiceChip`, `KiviloSegmentedControl` and `KiviloSelectField`. |

A page with separate forms can have an action for each form. Never repeat the same primary at the top, in an empty card and over the content. A full-width label and a compact icon are different controls. Compact controls belong beside their field, in a toolbar, or in a clearly related row.

## Colour and interaction

| Token | Value | Use |
| --- | --- | --- |
| Action pink | `#DB2777` | Primary fill, with white text and icons |
| Brand pink | `#EC4899` | Brand marks |
| Ink | `#111827` | Selected tab text and indicator, icons and headings |
| Deep pink | `#BE185D` | Text, selected outlines and navigation accents |
| Soft pink | `#FDF2F8` | Secondary and selected surfaces |
| Body / muted | `#374151` / `#6B7280` | Main text and supporting labels |
| White / divider | `#FFFFFF` / `#E5E7EB` | Reading surfaces and group boundaries |
| Danger | `#B91C1C` on native | Deletion, errors and their explicit confirmation. Use the shared red role on web. |

White on action pink measures **4.60:1**. Hover and press deepen the fill so the white label remains legible. Keyboard focus gets a visible outline. Disabled actions use a neutral surface. When the next step is blocked, say what the agent needs to do near the control. Ordinary enabled text needs at least 4.5:1 contrast. [W3C contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

## Width, type and spacing

- A button alone on a line fills its form or card. On a 390-wide phone with 16-unit gutters, the footer button is 358 units wide. On a tablet, align it with the centred form. New check-in caps the form at 720, including gutters. Use `KiviloActionFooter` for a fixed action.
- Use 50 units minimum height for task buttons, a 12-unit radius and a 15-unit semibold label. Allow longer labels to wrap and the control to grow. For compact actions and filters allow at least 44 units of touch area. A larger keyboard or text size must leave the last field and the action reachable.
- Leave 12 units between stacked actions. On web use `action-group` for a decision with multiple buttons. Wide screens may put them side by side. Keep field controls such as Clear alongside their field.
- Use system type. Start with 24–25 units for the page title, 20 for section titles, 16 for input or reading text, 14 for supporting copy and 12 for metadata. Use a persistent label above every field. An example in a placeholder is optional.
- Keep 16-unit page gutters on phones, 12 between a heading and its controls, and 28 before the next section. Put the title and next action before management filters. Put a card around content that belongs together, with one quiet border. Use colour and an explicit label together for errors, completed work and pending uploads.

## Tabs and filters

Use 48-unit tab targets with 14-unit labels. Keep the row horizontally scrollable on narrow screens. Give the selected tab a short rounded mark above a one-unit neutral divider. The mark slides for 220 ms and changes immediately with reduced motion. Links retain keyboard focus, direct URLs and Back navigation. Within an inventory, choosing a room narrows the items below the tabs. Show its check even when colour is hard to distinguish. [Mobile comparison](design-system/tabs-mobile.png) · [Browser comparison](design-system/tabs-web.png)

## Behaviour at a handover

| Situation | What an agent should see |
| --- | --- |
| First use or an empty library | What will appear here and one way to start. A filtered empty list should offer a way back to all properties. |
| Form validation | Mark the field, explain the correction, scroll it into view and retain everything already entered. |
| Saving or offline | A stable action label such as “Saving…”. Show whether photos are saved on the phone or uploaded. Keep the draft through a failed attempt. |
| Restricted or destructive action | Explain who can act or what will be removed. Keep Cancel available before confirmation. |
| Camera and photo markup | Keep the dark work surface, short tool labels and one clear Save or Done. Keep controls out of the evidence area. |
| Report and signing | Keep navigation out of the shared document. Show the signing party and status. Preserve room names, item notes, photo orientation and annotations. |

## Applying the rules

The source for mobile appearance is [the theme](../mobile/lib/ui/kivilo_theme.dart), [layout](../mobile/lib/ui/kivilo_layout.dart) and [shared controls](../mobile/lib/ui/kivilo_components.dart). The source for browser appearance is [the stylesheet](../src/app/globals.css). Add a new role there only when a real task cannot use the existing roles.

For a changed screen, compare before and after at the same size with the same data. Check the shortest and longest supported labels, visible keyboard, increased text size, disabled and error states, keyboard focus on web, and a tablet-width form. The browser style check catches local pink fills. Flutter tests measure contrast and compare the footer with actual field edges. A browser journey measures the rendered action. Keep these checks when adding screens.
