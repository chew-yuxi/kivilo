/// What the server writes for people to read: notifications and emails. `zh.ts` and
/// `th.ts` are typed against this object, so a message missing from either fails tsc.
/// The app's own text is in `mobile/lib/l10n`; the signed report stays in English.
export const en = {
  /// The `Intl` locale for dates. Singapore time is applied where a date is formatted.
  intl: 'en-SG',

  party: { LANDLORD: 'Landlord', TENANT: 'Tenant' },

  maintenanceStatus: {
    REPORTED: 'reported',
    ACKNOWLEDGED: 'acknowledged',
    SCHEDULED: 'scheduled',
    AWAITING_CONFIRMATION: 'awaiting confirmation',
    RESOLVED: 'resolved',
    CLOSED_NO_ACTION: 'closed without action',
  } as Record<string, string>,

  /// The terms of a repair cost proposal, in the third person, because the same words
  /// go to the proposer and the person answering.
  proposal: {
    sharedPays: (cap: string) => `Tenant pays the first S$${cap}, landlord pays the rest.`,
    pays: (party: string) => `${party} pays.`,
    arranges: (party: string) => `${party} arranges the repair.`,
  },

  /// The property timeline, as the app shows it to the person asking.
  timeline: {
    tenancyBegan: 'Tenancy began',
    tenancyEnded: 'Tenancy ended',
    checkInSigned: 'Check-in signed',
    checkOutSigned: 'Check-out signed',
    signedByBoth: 'Signed by both parties',
    assessmentPublished: 'Check-out assessment published',
    assessmentVersionPublished: (version: number) => `Check-out assessment version ${version} published`,
    reportUpdated: (title: string) => `Check-in report updated: ${title}`,
    updateAcknowledged: (number: number) => `Update ${number}, acknowledged by both parties`,
    reported: (title: string) => `Reported: ${title}`,
    repaired: (title: string) => `Repaired: ${title}`,
    confirmedFixed: (title: string) => `Confirmed fixed: ${title}`,
    notFixed: (title: string) => `Not fixed: ${title}`,
    costAgreed: (title: string) => `Cost agreed: ${title}`,
    closedWithoutRepair: (title: string) => `Closed without repair: ${title}`,
  },

  notification: {
    maintenanceReported: (address: string) => `${address}: a maintenance issue was reported.`,
    maintenanceStatus: (status: string) => `Maintenance status changed to ${status}.`,
    visitCompleted: 'Was the repair successful? Please confirm.',
    visitScheduled: 'A repair visit was scheduled.',
    repeatRepairTitle: 'Repeated repair history',
    repeatRepairBody: (count: number) =>
      `This asset has had ${count} completed repair visits in the last 365 days.`,
    verifiedFixed: (party: string) => `The ${party.toLowerCase()} confirmed the repair is fixed.`,
    verifiedNotFixed: (party: string) =>
      `The ${party.toLowerCase()} reported that the issue is not fixed.`,
    costProposed: (party: string, terms: string) => `${party} proposes: ${terms}`,
    costAccepted: (party: string, terms: string) => `${party} accepted: ${terms}`,
    costRejected: (party: string, terms: string) => `${party} rejected: ${terms}`,
    costWithdrawn: (party: string) => `${party} withdrew the cost proposal.`,
    overdueTitle: 'Maintenance report needs acknowledgement',
    renewalTitle: 'Renewal due',
    renewalBody: (address: string, endDate: string) =>
      `${address}: tenancy ends ${endDate}. Arrange the renewal with the landlord and tenant.`,
    moveInReported:
      'The tenant reported this condition as present at move-in. Please acknowledge or dispute the dated notice.',
    moveInDisputed: (reason: string) => `The landlord disputed the move-in notice: ${reason}`,
    moveInAccepted:
      'The landlord acknowledged your move-in notice. It now counts in the agreed check-in baseline.',
    propertySharedTitle: (agent: string) => `${agent} shared a property with you`,
    propertySharedBody: (agent: string, address: string) =>
      `${agent} added you as a collaborator for ${address}.`,
    propertyAssignedTitle: (actor: string) => `${actor} assigned a property to you`,
    propertyAssignedBody: (actor: string, address: string) => `${actor} assigned you to ${address}.`,
    agencyInvitationTitle: (agency: string) => `Join ${agency} on Kivilo`,
    agencyInvitationBody: (actor: string, agency: string) =>
      `${actor} invited you to join ${agency}. Review and accept this invitation within 7 days.`,
    reportUpdatedTitle: (address: string) => `The report for ${address} was updated`,
    reportUpdatedBody: (number: number, title: string) =>
      `Update ${number}: ${title}. Please review it and acknowledge it.`,
    depositTitle: (address: string) => `Deposit statement for ${address}`,
    depositBody: (deductions: string, deposit: string) =>
      `The check-out assessment proposes deductions of ${deductions} from the deposit of ${deposit}. Agree or dispute it.`,
  },

  email: {
    signIn: {
      subject: (code: string) => `${code} is your Kivilo sign-in code`,
      line: (code: string) => `Your Kivilo sign-in code is ${code}.`,
      heading: 'Your Kivilo sign-in code',
      enter: 'Enter this code in the app to finish signing in.',
      enterText: 'Enter it in the app to finish signing in. It expires in an hour and can only be used once.',
      expires: 'It expires in an hour and can only be used once. If you did not ask to sign in, you can ignore this email.',
      ignore: 'If you did not ask to sign in, you can ignore this email.',
    },
    accountDeleted: {
      subject: 'Your Kivilo account deletion is complete',
      body: 'Your Kivilo account has been deleted.',
      retained: 'Data retained for other parties or a legal obligation remains subject to our published retention policy.',
    },
    maintenanceFooter: 'Open Kivilo to view the maintenance timeline and respond.',
    renewalFooter: 'Open Inspections in Kivilo to start the renewal, mark it as not renewing, or dismiss the reminder.',
    propertyShared: {
      open: (link: string) => `Open the property: ${link}`,
      signIn: 'Sign in to Kivilo using the email address this message was sent to.',
      together: 'You can work on this tenancy together, including photos, inventories and repairs.',
    },
    agencyInvitation: {
      review: (link: string) => `Review invitation: ${link}`,
      signIn: 'Sign in using the email address this message was sent to. Joining does not share your personal properties.',
    },
    reportUpdate: {
      subject: (title: string) => `${title}, please review and acknowledge`,
      review: (link: string) => `Review and acknowledge it here: ${link}`,
      app: 'You can also open the report in the Kivilo app and acknowledge it there.',
    },
    hello: (name: string) => `Hello ${name},`,
    reportName: (kind: 'CHECK_IN' | 'CHECK_OUT', address: string) =>
      `${kind === 'CHECK_OUT' ? 'check-out' : 'check-in'} report for ${address}`,
    roleName: { landlord: 'landlord', tenant: 'tenant' },
    yourAgent: 'Your agent',
    agentOf: (agent: string, agency: string) => `${agent} of ${agency}`,
    signatureRequest: {
      subject: (report: string) => `Please review and sign the ${report}`,
      heading: 'Please review and sign',
      intro: (from: string, report: string, role: string) =>
        `${from} has sent the ${report} for your signature, as ${role}.`,
      reviewHere: 'Review and sign it here:',
      button: 'Review and sign',
      signIn: 'You will be asked to sign in with a code emailed to this address, so only you can sign it. If you already use Kivilo, it is the same account.',
      app: 'Prefer the app? Open the Kivilo app and sign in with this address. The report is there, awaiting your signature.',
      after: 'Once both parties have signed, we will email you the signed report as a PDF.',
    },
    handover: {
      subject: (address: string) => `Your handover for ${address}`,
      period: (days: number, deadline: string) =>
        `Your tenancy's ${days}-day move-in defect period ends on ${deadline}, at the end of the day in Singapore. If something was already wrong when you moved in, report it by that deadline.`,
      noPeriod: 'An early move-in defect period is not enabled for this tenancy. You can still report repairs in the Kivilo app.',
      countersigned: 'Both parties have signed. Your signed report is sent separately as a PDF.',
      tenantSigned: 'You have signed the check-in report. Once the landlord has also signed, we will email you the signed report as a PDF.',
      details: 'Your report and handover details:',
      signIn: 'Sign in with a code emailed to this address. If you use the Kivilo app, sign in with the same address to find your tenancy and report a problem.',
      notice: 'A move-in defect report is your dated statement until the landlord acknowledges it. The signed check-in report stays unchanged.',
    },
    signedCopy: {
      subject: (report: string) => `Signed: ${report}`,
      attached: (report: string) =>
        `Both parties have signed the ${report}. The signed report is attached as a PDF; keep it with the tenancy documents.`,
      linked: (report: string) =>
        `Both parties have signed the ${report}. The signed report is too large to attach, so download the PDF here and keep it with the tenancy documents:`,
      linkSignIn: 'You will be asked to sign in with a code emailed to this address, so only you can open it.',
      signature: (role: string, name: string, when: string) => `${role}: ${name}, signed ${when}`,
      fingerprint: 'Beside each signature the PDF prints a content fingerprint of the report that person signed, so any two copies can be compared.',
    },
  },
}

export type Messages = typeof en
