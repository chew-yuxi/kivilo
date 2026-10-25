import type { ResourceArticle } from './types'

export const guides: ResourceArticle[] = [
  {
    slug: 'rental-handover-checklist-singapore',
    title: 'Rental handover checklist for Singapore property agents',
    description: 'A practical Singapore rental handover checklist covering rooms, keys, meter readings, appliances, condition photos, signatures and the next check-out.',
    published: '2026-10-25',
    updated: '2026-10-25',
    summary: 'A useful rental handover record connects each room and inventory item to a specific observation, clear evidence and the parties’ review. Record keys, meters and appliance identifiers separately, resolve unclear wording before signing, and leave a baseline you can use at check-out.',
    introduction: [
      'Use this checklist for the physical handover of a Singapore rental home. Adapt it to the actual unit, furnishing level and agreed arrangements. A studio, an HDB flat and a furnished condominium will need different room and item lists.',
      'Walk through in the same order every time: prepare the record, inspect each room, reconcile keys and readings, then review together. A generic “good condition” tick is less useful than a description another person can locate months later.',
    ],
    sections: [
      {
        id: 'before-the-visit',
        title: '1. Prepare before everyone arrives',
        paragraphs: [
          'Confirm the full address and unit number, visit date, landlord and tenant details, furnishing level and who will attend. Open the correct tenancy and prepare its rooms before entering areas with poor reception. Charge the phone and check available storage.',
        ],
        bullets: [
          'Bring the agreed inventory, any previous condition record and a list of known work still outstanding.',
          'Use room names that distinguish similar spaces, such as “Bedroom 2 — beside kitchen”.',
          'Arrange access to cupboards, storage areas and any meters you are authorised to inspect.',
        ],
      },
      {
        id: 'room-by-room',
        title: '2. Describe the room, then its contents',
        paragraphs: [
          'Work around each room in a consistent direction. Inspect visible surfaces first, then fittings and furniture. Separate what you observed from what you could not check. “Oven exterior clean; heating function not tested” is more precise than “oven working”.',
        ],
        bullets: [
          'Walls, ceilings and floors: stains, cracks, chips, scratches and their positions.',
          'Doors and windows: handles, locks, visible damage, opening and closing where accessible.',
          'Kitchen and bathrooms: cabinets, worktops, sanitary fittings and visible signs of leaks.',
          'Furniture, curtains and fittings: quantity, identifying details, condition and missing parts.',
          'Balcony, utility area and storage: include them explicitly when part of the handover.',
        ],
      },
      {
        id: 'keys-meters-appliances',
        title: '3. Count keys, read meters and identify appliances',
        paragraphs: [
          'Treat these as distinct inventory entries. “Keys handed over” does not establish which doors they operate or how many sets changed hands. Photograph a meter reading and its identifier together where possible; retain the date and unit of measurement with the written value.',
        ],
        bullets: [
          'Count entrance, gate, bedroom and letterbox keys separately; include access cards and remotes.',
          'Record electricity, water and gas readings where applicable and accessible; say when a reading is unavailable.',
          'For aircon units, refrigerator, washer and other supplied appliances, record brand, model, serial number and accessories where visible.',
          'Describe the actual operating check performed and any limitations. Do not infer a service history from appearance.',
        ],
      },
      {
        id: 'evidence',
        title: '4. Pair a useful description with useful evidence',
        paragraphs: [
          'Take a wider photo to locate the item, then a close photo of the relevant detail. “Living room sideboard, lower-right door: short pale scuff near handle” tells the next inspector where to look. Link the close photo to that item instead of leaving it in an unlabelled camera roll.',
          'A walkthrough video supplies context; take deliberate stills for serial plates and meter digits. Check sharpness before leaving. In Kivilo, photos can carry circles, arrows or freehand marks while the original remains separate. You write the inventory and review its evidence yourself.',
        ],
        sources: [{ label: 'Kivilo: inventory, photo markup and report workflow', url: 'https://kivilo.app/#how-it-works' }],
      },
      {
        id: 'review-and-sign',
        title: '5. Review the complete record before signing',
        paragraphs: [
          'Read back unclear descriptions, check quantities and reconcile the key count with both parties. Record outstanding work with enough detail to follow up. Confirm all intended photos have uploaded and appear beside the correct rooms before sending the report.',
          'Kivilo freezes report content when it is sent for signature. Landlord and tenant can sign on the agent’s device or through their own accounts. Review the public condition-report PDF to see how inventory, evidence and signatures appear in a document someone can keep.',
        ],
        sources: [
          { label: 'Kivilo: signing and connectivity questions', url: 'https://kivilo.app/#questions' },
          { label: 'View a Kivilo property condition report PDF', url: 'https://kivilo.app/reports/property-condition-report.pdf' },
        ],
      },
      {
        id: 'prepare-for-check-out',
        title: '6. Leave a baseline the next visit can use',
        paragraphs: [
          'Retain the agreed record and keep subsequent repairs and replacements traceable. A new washing machine should be identifiable at check-out without someone searching an old message thread. Record the replacement and have the relevant update acknowledged.',
          'At check-out, repeat the room order, key count and meter checks. Compare each observation with the agreed check-in and updates. An unchanged scuff, a missing remote and a newly cracked shelf are different findings. Describe the change and supporting evidence before explaining any proposed cost or assessment.',
        ],
        sources: [{ label: 'Kivilo: check-in evidence at check-out', url: 'https://kivilo.app/#check-out' }],
      },
    ],
    questions: [
      {
        question: 'Is a video enough for a rental handover?',
        answer: 'Use video for context alongside a written inventory and clear still photos. Take separate close-ups for readable meter digits, serial plates and specific defects, and connect them to the relevant item.',
      },
      {
        question: 'What should I record when something cannot be tested?',
        answer: 'Name the item, what you inspected, what remains untested and why. For example: “Washer exterior inspected; cycle not tested because water supply was off.” Arrange any follow-up separately.',
      },
    ],
    related: [
      { label: 'How to choose a rental inspection app in Singapore', href: '/guides/rental-inspection-app-singapore' },
      { label: 'Kivilo vs Report and Run', href: '/compare/kivilo-vs-report-and-run' },
      { label: 'Kivilo vs InventoryBase', href: '/compare/kivilo-vs-inventorybase' },
      { label: 'Kivilo vs Inventory Hive', href: '/compare/kivilo-vs-inventory-hive' },
    ],
  },
  {
    slug: 'rental-inspection-app-singapore',
    title: 'How to choose a rental inspection app in Singapore',
    description: 'A practical evaluation script for Singapore agents comparing rental inspection apps: test inventory, evidence, signing, check-out, repairs and poor-signal capture.',
    published: '2026-10-25',
    updated: '2026-10-25',
    summary: 'Choose a rental inspection app by completing a small tenancy workflow on the devices your agency actually uses. Test whether you can identify an item, attach readable evidence, obtain both parties’ signatures and explain the same item’s condition at check-out.',
    introduction: [
      'For a Singapore rental agent, the useful test is what happens after the photographs are taken. Can the landlord understand the inventory? Can the tenant review it? Can a colleague reconstruct a replacement or repair next year?',
      'Use the same fictional property and observations in every trial. This makes differences visible without uploading customer records. Record any step that requires another subscription, a desktop computer, manual file sorting or help from the vendor.',
    ],
    sections: [
      {
        id: 'demo-script',
        title: 'Start with this practical demo script',
        paragraphs: [
          'Create a two-room property with a living-room sideboard and a kitchen washing machine. Describe a scuff on the sideboard’s lower-right door. Add one wide photo and one close-up. Record a fictional appliance serial number, two entrance keys and an electricity reading.',
        ],
        bullets: [
          'Correct one description and move a photo to the right item.',
          'Preview the report on a phone and as a PDF; check that the scuff is understandable in both.',
          'Review and sign as landlord and tenant using test accounts you control.',
          'Record a replacement, then start check-out and compare the original scuff with a newly missing key.',
        ],
      },
      {
        id: 'inventory-and-evidence',
        title: 'Look for editable inventory and readable evidence',
        paragraphs: [
          'A room template should save setup time while leaving you responsible for the wording. Try deleting an irrelevant row, adding an unusual fixture and recording “not tested”. Check that a condition description can be specific without becoming an unreadable paragraph.',
          'Open the serial-plate photo at full size. Check whether marks obscure the original and whether the export makes clear which photo supports which line. Kivilo uses human-written inventory with editable starting rows, photo and video capture, and item-linked evidence; it does not generate the inventory with AI.',
        ],
        sources: [{ label: 'Kivilo: room inventory and marked evidence', url: 'https://kivilo.app/#how-it-works' }],
      },
      {
        id: 'parties-and-signatures',
        title: 'Test the landlord and tenant experience',
        paragraphs: [
          'Give each test party the report and complete the actual review path. Check how an absent landlord signs, how someone present uses the agent’s device, and how each receives the finished document. Count account switches and steps that need explanation.',
          'In Kivilo, parties can sign on the agent’s device or sign in to their own accounts with an emailed code. Report content freezes at Send. Both signatures trigger PDF delivery, with a signed-in download link for larger files. Inspect the public PDF for the document layout before running your own trial.',
        ],
        sources: [
          { label: 'Kivilo: how parties sign', url: 'https://kivilo.app/#questions' },
          { label: 'View a Kivilo property condition report PDF', url: 'https://kivilo.app/reports/property-condition-report.pdf' },
        ],
      },
      {
        id: 'check-out-and-repairs',
        title: 'Continue past the first handover',
        paragraphs: [
          'Use the signed baseline to inspect the sideboard again. Can you see its previous wording and relevant photo while writing the current condition? Record the unchanged scuff separately from the missing key. Then check how a colleague would find the washing-machine replacement and its supporting record.',
          'Kivilo keeps repairs and replacements with the property and starts check-out from the signed check-in and agreed updates. The agent records changes and their damage or fair-wear assessment. A published deposit statement records proposed deductions and the parties’ responses; Kivilo does not hold or move the deposit.',
        ],
        sources: [{ label: 'Kivilo: tenancy history and check-out', url: 'https://kivilo.app/#whole-tenancy' }],
      },
      {
        id: 'poor-signal',
        title: 'Test poor reception on the intended device',
        paragraphs: [
          'Prepare a room online, temporarily disable the connection and capture test media. Reconnect and inspect the upload status, the room and the exported result. Try leaving and reopening the app with test data. Ask which actions need a connection instead of treating “offline” as a promise about the whole workflow.',
          'Kivilo saves captured photos and videos to the device first and retries uploads when connected. Keep the app and its saved data until uploads finish. Sending and signing require a connection. Browser and Android access are available; the native iPhone app is currently Coming soon.',
        ],
        sources: [
          { label: 'Kivilo: poor-signal capture', url: 'https://kivilo.app/#questions' },
          { label: 'Kivilo: browser and app availability', url: 'https://kivilo.app/#get-started' },
        ],
      },
      {
        id: 'access-and-export',
        title: 'Check sharing, agency access and a usable exit',
        paragraphs: [
          'Invite a colleague to the test tenancy, then remove their access and retest. Distinguish team management from permission to open a particular property. Inspect a shared link without a session, revoke it, and confirm it no longer opens.',
          'Download the finished report and assess whether it remains useful outside the app. Kivilo’s verification page checks whether a PDF matches a file Kivilo issued, using its fingerprint without uploading the file. This checks the issued document; it does not independently inspect the property or decide whether a description is correct.',
          'Finally, ask for the current cost at your expected property count and confirm storage, exports and collaborator access. Choose after the complete trial, with any missing capability recorded against your agency’s actual work.',
        ],
        sources: [{ label: 'Kivilo: verify an issued report PDF', url: 'https://my.kivilo.app/verify' }],
      },
    ],
    questions: [
      {
        question: 'Which rental inspection app is best for a Singapore agency?',
        answer: 'The right fit depends on your handover process, devices and team. Run the same inventory, evidence, signing and check-out exercise in each shortlisted app, then compare the actual result and current cost.',
      },
      {
        question: 'Does an offline capture feature mean everything works offline?',
        answer: 'No. Verify capture, editing, synchronisation, report sending and signing separately. Kivilo retains captured media for upload retries, while sending a report and collecting signatures need a connection.',
      },
    ],
    related: [
      { label: 'Rental handover checklist for Singapore agents', href: '/guides/rental-handover-checklist-singapore' },
      { label: 'Kivilo vs Report and Run', href: '/compare/kivilo-vs-report-and-run' },
      { label: 'Kivilo vs InventoryBase', href: '/compare/kivilo-vs-inventorybase' },
      { label: 'Kivilo vs Inventory Hive', href: '/compare/kivilo-vs-inventory-hive' },
    ],
  },
]
