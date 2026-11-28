// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String settingsVersion(String version, String build) {
    return 'Version $version ($build)';
  }

  @override
  String settingsVersionPatch(String version, int patch) {
    return '$version · Patch $patch';
  }

  @override
  String get settingsDeletionDrawerTitle => 'Request account deletion?';

  @override
  String get settingsDeletionDrawerBody =>
      'We will confirm your request and complete eligible deletion within 30 days. Inspection and report records may need to be retained under the applicable tenancy record retention policy.';

  @override
  String get cancel => 'Cancel';

  @override
  String get settingsRequestDeletion => 'Request deletion';

  @override
  String settingsSignOutFailed(String error) {
    return 'Could not sign out. $error';
  }

  @override
  String settingsLicence(String number) {
    return 'Licence $number';
  }

  @override
  String settingsCea(String number) {
    return 'CEA $number';
  }

  @override
  String get settingsAddAgency => 'Add your agency';

  @override
  String couldNotLoad(String error) {
    return 'Could not load: $error';
  }

  @override
  String get settingsBrandingEmpty =>
      'Your name and logo at the top of PDF reports';

  @override
  String get settingsBrandingSet => 'Shown on your PDF and shared reports';

  @override
  String get settingsPlan => 'Plan';

  @override
  String get loading => 'Loading';

  @override
  String settingsPlanUsage(int used, int limit) {
    String _temp0 = intl.Intl.pluralLogic(
      limit,
      locale: localeName,
      other: '$limit active properties',
      one: '1 active property',
    );
    return '$used of $_temp0 in use';
  }

  @override
  String get settingsAccount => 'Account';

  @override
  String get settingsYourAccount => 'Your account';

  @override
  String get settingsSignedIn => 'Signed in to Kivilo';

  @override
  String get settingsForAgents => 'For agents';

  @override
  String get settingsStartCheckIn => 'Start a check-in';

  @override
  String get settingsStartCheckInDetail =>
      'Write a room-by-room report of a property';

  @override
  String get settingsWorkspace => 'Teams';

  @override
  String get settingsTeam => 'Team';

  @override
  String get settingsTeamDetail => 'Members, invitations and assigned work';

  @override
  String get settingsProperties => 'Properties';

  @override
  String get settingsPropertiesDetail =>
      'Property settings, archived properties and trash';

  @override
  String get settingsBranding => 'Report branding';

  @override
  String get settingsBrandingDetail => 'Your agency on PDF and shared reports.';

  @override
  String get settingsPlanDetail => 'How many properties you can work at once.';

  @override
  String get settingsPrivacySupport => 'Privacy & support';

  @override
  String get settingsLanguage => 'Language';

  @override
  String get settingsPhoneLanguage => 'Phone language';

  @override
  String get settingsPrivacyPolicy => 'Privacy policy';

  @override
  String get settingsPrivacyPolicyDetail => 'How Kivilo handles your data';

  @override
  String get settingsHelp => 'Help & support';

  @override
  String get settingsHelpDetail =>
      'Get help with an inspection or your account';

  @override
  String get settingsYourData => 'Your data';

  @override
  String get settingsYourDataDetail =>
      'Manage your account and deletion request.';

  @override
  String get settingsAccountDeletion => 'Account deletion';

  @override
  String get settingsDeletionAim =>
      'We aim to complete eligible deletion within 30 days of your request.';

  @override
  String settingsDeletionDates(String requested, String due) {
    return 'Requested $requested · Due $due';
  }

  @override
  String settingsDeletionDatesCompleted(
    String requested,
    String due,
    String completed,
  ) {
    return 'Requested $requested · Due $due · Completed $completed';
  }

  @override
  String get sending => 'Sending…';

  @override
  String get settingsRequestAccountDeletion => 'Request account deletion';

  @override
  String settingsDeletionLoadFailed(String error) {
    return 'Could not load your deletion request. $error';
  }

  @override
  String get signOut => 'Sign out';

  @override
  String get settingsSignOutDetail =>
      'Your saved signature is removed from this phone';

  @override
  String get unknown => 'unknown';

  @override
  String get settingsDeletionCompleted => 'Request completed';

  @override
  String get settingsDeletionInProgress => 'Request in progress';

  @override
  String get settingsDeletionReceived => 'Request received';

  @override
  String get dateShortPattern => 'd MMM y';

  @override
  String get dateMonthYearPattern => 'MMMM y';

  @override
  String get checkIn => 'Check-in';

  @override
  String get checkOut => 'Check-out';

  @override
  String get roomNotStarted => 'Not started';

  @override
  String get roomNeedsReview => 'Needs review';

  @override
  String get roomReviewed => 'Reviewed';

  @override
  String get roomCapturing => 'Capturing';

  @override
  String videoCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count videos',
      one: '1 video',
    );
    return '$_temp0';
  }

  @override
  String photoCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count photos',
      one: '1 photo',
    );
    return '$_temp0';
  }

  @override
  String get roomNothingCaptured => 'Nothing captured yet';

  @override
  String get listSeparator => ', ';

  @override
  String roomSummaryWithItems(String summary, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
    );
    return '$summary · $_temp0';
  }

  @override
  String get errorNoConnection =>
      'No connection. Anything you took is saved on this phone, so try again when you have signal.';

  @override
  String get errorSignedOut =>
      'You have been signed out. Please sign in again.';

  @override
  String get errorNotFound =>
      'This could not be found, or your account cannot open it.';

  @override
  String get errorReportFrozen =>
      'This report has been sent for signature and cannot be changed.';

  @override
  String get errorInvalidRequest => 'Please check the details and try again.';

  @override
  String get errorReviewIncomplete =>
      'Each room needs at least one item and a review first.';

  @override
  String get errorAssessmentReviewIncomplete =>
      'Open and confirm every finding before publishing the assessment.';

  @override
  String get errorNoDamageUnconfirmed =>
      'Add a finding, or confirm that no damage was found, before publishing.';

  @override
  String get errorInvalidState =>
      'This cannot be done at this stage of the report.';

  @override
  String get errorCaptureConflict =>
      'This photo or video clashes with one already in the report. Refresh the room and check it.';

  @override
  String get errorCaptureMissing =>
      'The upload did not finish. The file is still on this phone, so try again.';

  @override
  String get errorEvidenceMissing =>
      'The upload did not finish. The photo is still on this phone, so try again.';

  @override
  String get errorPlanLimit =>
      'Your plan\'s active properties are all in use. A property stops counting when its check-out is signed or its tenancy ends.';

  @override
  String get errorMaintenanceConflict =>
      'Someone already updated this repair. Refresh and check the timeline.';

  @override
  String get errorMoveInDefectStale =>
      'This item has since been replaced or removed. The notice cannot be agreed, but you can still dispute it.';

  @override
  String get errorAgencyConflict =>
      'Team access has changed. Refresh and try again.';

  @override
  String get errorPropertyHistory =>
      'This property has report history and cannot be deleted. Archive it to preserve its records.';

  @override
  String get errorPropertyRestoreExpired =>
      'The recovery period has ended. This property can no longer be restored.';

  @override
  String get errorPropertyTrashed =>
      'This property is in trash. Restore it from Account → Properties → Trash before continuing.';

  @override
  String get errorFindingSaveConflict =>
      'This finding was already saved. Reopen it to save your latest changes. Your draft is kept on this phone.';

  @override
  String errorServer(int status) {
    return 'Kivilo could not do that just now. Please try again. (Error $status)';
  }

  @override
  String get errorUnexpected => 'Something went wrong. Please try again.';

  @override
  String addendumAdded(String name) {
    return 'Added: $name';
  }

  @override
  String addendumRemoved(String name) {
    return 'Removed: $name';
  }

  @override
  String addendumReplaced(String old, String name) {
    return 'Replaced: $old with $name';
  }

  @override
  String get addendumItem => 'item';

  @override
  String acknowledgementPending(String role, String name) {
    return '$role $name: pending acknowledgement';
  }

  @override
  String acknowledgedInPerson(String role, String name, String date) {
    return '$role $name: acknowledged in person $date';
  }

  @override
  String acknowledged(String role, String name, String date) {
    return '$role $name: acknowledged $date';
  }

  @override
  String partyRole(String role) {
    String _temp0 = intl.Intl.selectLogic(role, {
      'Landlord': 'Landlord',
      'Tenant': 'Tenant',
      'LANDLORD': 'Landlord',
      'TENANT': 'Tenant',
      'other': '$role',
    });
    return '$_temp0';
  }

  @override
  String get landlord => 'Landlord';

  @override
  String get tenant => 'Tenant';

  @override
  String get basisMinorRepair => 'Minor repair clause';

  @override
  String get basisTenantCaused => 'Caused by the tenant';

  @override
  String get basisFairWear => 'Fair wear and tear';

  @override
  String get basisLandlordObligation => 'Landlord\'s obligation';

  @override
  String get basisOther => 'Other';

  @override
  String proposalSharedPays(String cap) {
    return 'Tenant pays the first $cap, landlord pays the rest.';
  }

  @override
  String get proposalLandlordPays => 'Landlord pays.';

  @override
  String get proposalTenantPays => 'Tenant pays.';

  @override
  String get proposalLandlordArranges => 'Landlord arranges the repair.';

  @override
  String get proposalTenantArranges => 'Tenant arranges the repair.';

  @override
  String chooseLabel(String label) {
    return 'Choose $label';
  }

  @override
  String get close => 'Close';

  @override
  String get statusReported => 'Reported';

  @override
  String get statusAcknowledged => 'Acknowledged';

  @override
  String get statusScheduled => 'Scheduled';

  @override
  String get statusAwaitingConfirmation => 'Awaiting confirmation';

  @override
  String get statusResolved => 'Resolved';

  @override
  String get statusClosed => 'Closed';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusAwaitingSignatures => 'Awaiting signatures';

  @override
  String get statusDraft => 'Draft';

  @override
  String get signInConnectFailed =>
      'Could not connect. Check your connection and try again.';

  @override
  String get signInWelcomeBack => 'Welcome back';

  @override
  String get signInCheckEmail => 'Check your email';

  @override
  String get signInTagline => 'Your property, on record';

  @override
  String get signInContinue => 'Sign in to continue your inspections.';

  @override
  String signInEnterCode(String email) {
    return 'Enter the six-digit code sent to $email.';
  }

  @override
  String get signInIntro =>
      'Condition reports, repairs and their history, for agents, landlords and tenants.';

  @override
  String get signInCodeLabel => 'VERIFICATION CODE';

  @override
  String get signInEmailLabel => 'EMAIL ADDRESS';

  @override
  String get signInPasswordHint => 'Your password';

  @override
  String get signInHidePassword => 'Hide password';

  @override
  String get signInShowPassword => 'Show password';

  @override
  String get working => 'Working';

  @override
  String get signIn => 'Sign in';

  @override
  String get signInEmailCode => 'Email me a code';

  @override
  String get signInResend => 'Send a new code';

  @override
  String get signInDifferentEmail => 'Use a different email';

  @override
  String get signInUseCode => 'Use an emailed code instead';

  @override
  String get signInWithPassword => 'Sign in with password';

  @override
  String get signInFooter =>
      'Every room. Every detail. Ready when you need it.';

  @override
  String get updateReady => 'Update ready';

  @override
  String get updateKivilo => 'Update Kivilo';

  @override
  String get updateRestartBody =>
      'The update is downloaded. Kivilo will close, then notify you when it is ready to reopen.';

  @override
  String get updateDownloadBody =>
      'A Kivilo update is available. Download it now; Kivilo will close, then notify you when it is ready to reopen.';

  @override
  String get updateCloseAndUpdate => 'Close and update';

  @override
  String get update => 'Update';

  @override
  String get updateStoreFailed =>
      'Could not open the store. Search for Kivilo in it instead.';

  @override
  String get updateOpenAppStore => 'Open the App Store';

  @override
  String get updateOpenGooglePlay => 'Open Google Play';

  @override
  String get updateRequiredBody =>
      'This version is no longer supported. Photos and videos already on this phone are kept and finish uploading after the update.';

  @override
  String get updateDoneTitle => 'Kivilo is updated';

  @override
  String get updateDoneBody => 'Tap to reopen Kivilo.';

  @override
  String get updateChannelName => 'App updates';

  @override
  String get updateChannelDescription => 'Completed Kivilo app updates';

  @override
  String get updateNeedsNotifications =>
      'Notifications must be enabled so Kivilo can tell you when it is safe to reopen.';

  @override
  String get pushNewNotification => 'New Kivilo notification';

  @override
  String get open => 'Open';

  @override
  String get homeTitle => 'Home';

  @override
  String get notifications => 'Notifications';

  @override
  String get homeUrgentServices => 'Urgent services';

  @override
  String get homeInspections => 'Inspections';

  @override
  String get homeWorkspaceFailed => 'Could not load your teams';

  @override
  String get tryAgain => 'Try again';

  @override
  String get homeShowAllProperties => 'Show all properties';

  @override
  String get homeGoodMorning => 'Good morning';

  @override
  String get homeGoodAfternoon => 'Good afternoon';

  @override
  String get homeGoodEvening => 'Good evening';

  @override
  String homeCounts(int inProgress, int awaiting) {
    return '$inProgress in progress · $awaiting awaiting signatures';
  }

  @override
  String get homeViewInspections => 'View inspections';

  @override
  String get newCheckIn => 'New check-in';

  @override
  String homeGreeting(String greeting, String name) {
    return '$greeting, $name';
  }

  @override
  String get homePartySubtitle =>
      'Your reports, repairs and history, in one place.';

  @override
  String get homeAgentSubtitle => 'A clear next step for every handover.';

  @override
  String get homeOffline => 'Offline. Showing previously loaded work.';

  @override
  String get homeYourProperties => 'Your properties';

  @override
  String get homeYourPropertiesDetail =>
      'Repairs, records and the people who live there.';

  @override
  String get homeEyebrowNextHandover => 'YOUR NEXT HANDOVER';

  @override
  String get homeEyebrowWaiting => 'WAITING FOR SIGNATURES';

  @override
  String get homeEyebrowNextStep => 'YOUR NEXT STEP';

  @override
  String get homeHeadlineEmpty => 'Great handovers start\nwith a clear record.';

  @override
  String get homeHeadlineAwaiting => 'Bring everyone onto\nthe same page.';

  @override
  String get homeHeadlineFirstRoom => 'Start with the first room.';

  @override
  String get homeHeadlineContinue => 'One room at a time.';

  @override
  String get homeBodyEmpty =>
      'Add the property and tenancy. We’ll guide you from the first photo to the signed report.';

  @override
  String get homeBodyAwaiting =>
      'The inventory is frozen. Check who still needs to sign, or send their signing email again.';

  @override
  String get homeBodyFirstRoom =>
      'Add a room, take photos, then write down what you find.';

  @override
  String get homeBodyContinue =>
      'Open a room, choose an inventory item, then add photos and check its condition before reviewing the room.';

  @override
  String get homeStartCheckIn => 'Start check-in';

  @override
  String get homeCheckSignatures => 'Check signatures';

  @override
  String get homeAddFirstRoom => 'Add your first room';

  @override
  String get homeContinueInspection => 'Continue inspection';

  @override
  String get homeOpenProperty => 'Open property';

  @override
  String get homeOpenCheckIn => 'Open check-in';

  @override
  String get homeOpenCheckOut => 'Open check-out';

  @override
  String get viewReport => 'View report';

  @override
  String get homeYouAreLandlord => 'You are the landlord';

  @override
  String get homeYouAreTenant => 'You are the tenant';

  @override
  String get homeReportPending =>
      'Your check-in report appears here once your agent sends it.';

  @override
  String get homeReviewAndSign => 'Review and sign';

  @override
  String get checkOutReport => 'Check-out report';

  @override
  String get checkInReport => 'Check-in report';

  @override
  String get repairs => 'Repairs';

  @override
  String get homeNoProperties => 'No properties yet';

  @override
  String get homeNoPropertiesDetail =>
      'Create a check-in to add your first property.';

  @override
  String get agent => 'Agent';

  @override
  String get filterAll => 'All';

  @override
  String get filterInProgress => 'In progress';

  @override
  String get filterCheckOutDue => 'Check-out due';

  @override
  String get filterRunning => 'Running';

  @override
  String get filterEnded => 'Ended';

  @override
  String get filterAwaitingSignature => 'Awaiting signature';

  @override
  String get inspectionsLoadFailed => 'Could not load inspections';

  @override
  String get inspectionsSubtitle =>
      'Your check-in and check-out reports, all in one place.';

  @override
  String get inspectionsResponsibleAgent => 'Responsible agent';

  @override
  String get inspectionsAllAgents => 'All agents';

  @override
  String get inspectionsTeamNote => 'Shows team work your account can access.';

  @override
  String get inspectionsOffline =>
      'Offline. Showing what was last loaded; you can keep taking photos.';

  @override
  String get inspectionsSearch => 'Search inspections';

  @override
  String get inspectionsSearchHint =>
      'Property, tenant or check-in / check-out';

  @override
  String get inspectionsClearSearch => 'Clear search';

  @override
  String inspectionsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reports',
      one: '1 report',
    );
    return '$_temp0';
  }

  @override
  String inspectionsFound(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count reports found',
      one: '1 report found',
    );
    return '$_temp0';
  }

  @override
  String get inspectionsNoMatch => 'No matching inspections';

  @override
  String get inspectionsNoMatchDetail =>
      'Try another property or tenant, or change your filters.';

  @override
  String get inspectionsShowAll => 'Show all inspections';

  @override
  String inspectionsResponsible(String name) {
    return 'Responsible: $name';
  }

  @override
  String roomCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count rooms',
      one: '1 room',
    );
    return '$_temp0';
  }

  @override
  String get inspectionsEmpty => 'No inspections yet';

  @override
  String get inspectionsEmptyOffline => 'Connect to create a new check-in.';

  @override
  String get inspectionsEmptyDetail =>
      'Choose check-in at move-in or check-out at move-out.';

  @override
  String get workspaceChoose => 'Choose a team';

  @override
  String get workspaceAll => 'All properties';

  @override
  String get workspacePersonal => 'Personal';

  @override
  String workspaceInvitations(int count) {
    return 'Team invitations ($count)';
  }

  @override
  String get workspaceAddTeam => 'Add a team';

  @override
  String get teamAccessChanged => 'Team access changed. Refresh and try again.';

  @override
  String get newWhoOwns => 'Who owns this work?';

  @override
  String get newPersonalDetail => 'Private to you until you add collaborators';

  @override
  String get newTeamDetail =>
      'Assigned agents and team owners and managers can access this work';

  @override
  String get newCreateTeamHint => 'Create or join a team in Account → Team.';

  @override
  String get newFurnishingRequired =>
      'Choose whether the property is fully furnished.';

  @override
  String get newEndAfterStart => 'The tenancy must end after it starts.';

  @override
  String fieldRequired(String label) {
    return '$label (required)';
  }

  @override
  String fieldOptional(String label) {
    return '$label (optional)';
  }

  @override
  String fieldIsRequired(String label) {
    return '$label is required';
  }

  @override
  String get fieldInvalidEmail => 'Enter a valid email address';

  @override
  String fieldInvalidAmount(String currency) {
    return 'Enter a valid $currency amount with up to 2 decimals';
  }

  @override
  String get newEssentials => 'Start with the essentials';

  @override
  String get newEssentialsDetail =>
      'Set up the property and tenancy. You can add rooms after this.';

  @override
  String newWorkspace(String name) {
    return 'Team: $name';
  }

  @override
  String get newPrivate => 'Private to you until you share it.';

  @override
  String get newTeamResponsible =>
      'You are the responsible agent. Assigned colleagues can work with you; owners and managers oversee all team properties.';

  @override
  String get newProperty => 'Property';

  @override
  String get newPropertyDetail => 'Where the handover takes place';

  @override
  String get newAddress => 'Address';

  @override
  String get newUnit => 'Unit';

  @override
  String get newPostalCode => 'Postal code';

  @override
  String get newPropertyTypeRequired => 'Property type (required)';

  @override
  String get newChoosePropertyType => 'Choose a property type';

  @override
  String get propertyTypePrivate => 'Private, non-landed';

  @override
  String get propertyTypePrivateDetail => 'Condominium or private apartment';

  @override
  String get propertyTypeHdb => 'HDB';

  @override
  String get propertyTypeHdbDetail => 'Public housing flat';

  @override
  String get propertyTypeLanded => 'Landed';

  @override
  String get propertyTypeLandedDetail =>
      'Terrace, semi-detached or detached home';

  @override
  String get propertyTypeCommercial => 'Commercial';

  @override
  String get propertyTypeCommercialDetail =>
      'Office, retail or other business premises';

  @override
  String get newFurnishing => 'Furnishing (required)';

  @override
  String get newFurnishingDetail =>
      'Fully furnished rooms start with standard inventory rows. Other rooms start empty.';

  @override
  String get newFullyFurnished => 'Fully furnished';

  @override
  String get newNotFullyFurnished => 'Not fully furnished';

  @override
  String get newPeople => 'People';

  @override
  String get newPeopleDetail => 'The landlord and tenant on the report';

  @override
  String get newLandlordName => 'Landlord name';

  @override
  String get newLandlordEmail => 'Landlord email';

  @override
  String get newTenantName => 'Tenant name';

  @override
  String get newTenantEmail => 'Tenant email';

  @override
  String get newTenancy => 'Tenancy';

  @override
  String get newTenancyDetail => 'Dates and agreed amounts';

  @override
  String get newStarts => 'Starts (required)';

  @override
  String get newEnds => 'Ends (required)';

  @override
  String newMonthlyRent(String currency) {
    return 'Monthly rent ($currency)';
  }

  @override
  String newDeposit(String currency) {
    return 'Deposit ($currency)';
  }

  @override
  String get creating => 'Creating…';

  @override
  String get newCreate => 'Create check-in';

  @override
  String get assetAddTitle => 'Add property asset';

  @override
  String get assetName => 'Name';

  @override
  String get assetCategory => 'Category';

  @override
  String get assetAppliance => 'Appliance';

  @override
  String get assetFixture => 'Fixture';

  @override
  String get assetFurniture => 'Furniture';

  @override
  String get assetSurface => 'Surface';

  @override
  String get assetSystem => 'System';

  @override
  String get assetRoomOptional => 'Room (optional)';

  @override
  String get assetIdentifierOptional => 'Make, model or serial (optional)';

  @override
  String get add => 'Add';

  @override
  String get minorRepairCap => 'Minor repair cap';

  @override
  String get minorRepairCapBody =>
      'The amount the tenant pays towards each minor repair under the tenancy agreement. It prefills a split when someone proposes who pays; the tenant still accepts every proposal.';

  @override
  String get minorRepairCapLabel => 'Tenant pays up to';

  @override
  String get currencyPrefix => 'S\$ ';

  @override
  String get minorRepairCapHelper => 'Leave empty if the agreement has no cap';

  @override
  String get minorRepairCapInvalid => 'Enter an amount like 150';

  @override
  String get save => 'Save';

  @override
  String get defectPeriod => 'Move-in defect period';

  @override
  String get defectPeriodBody =>
      'Use the period in the tenancy agreement. The tenancy start date is day 1, in Singapore time. This is fixed when the tenant first signs the check-in.';

  @override
  String get defectPeriodDays => 'Number of days';

  @override
  String get defectPeriodHelper => '0 disables the move-in defect period';

  @override
  String get defectPeriodInvalid => 'Enter a whole number from 0 to 365';

  @override
  String get tenancyEyebrow => 'YOUR PROPERTY';

  @override
  String get tenancySubtitle =>
      'Reports, repairs and the history of this home.';

  @override
  String get tenancyRecord => 'Property record';

  @override
  String get tenancyRecordDetail =>
      'The agreed condition and what has happened since';

  @override
  String get tenancyManageAccess => 'Manage access';

  @override
  String get tenancyPropertyAccess => 'Property access';

  @override
  String get tenancyOpenInspectionDetail => 'Rooms, inventory and signatures';

  @override
  String get tenancyLatestCheckOut => 'Latest check-out report';

  @override
  String get tenancyLatestCheckIn => 'Latest check-in report';

  @override
  String get tenancyViewReport => 'View the condition report';

  @override
  String get tenancyTimeline => 'Property timeline';

  @override
  String get tenancyTimelineDetail =>
      'Signed reports, repairs and agreed costs at this address';

  @override
  String get propertySettings => 'Property settings';

  @override
  String get tenancyCare => 'Property care';

  @override
  String get tenancyCareDetail =>
      'Report a problem and follow each repair through';

  @override
  String get tenancyDanger => 'Immediate danger?';

  @override
  String get tenancyDangerNumbers => 'Police 999 · Fire or ambulance 995';

  @override
  String get reportProblem => 'Report a problem';

  @override
  String get defectPeriodDisabled => 'Disabled. Repairs can still be reported.';

  @override
  String defectPeriodSummary(int days, String date) {
    String _temp0 = intl.Intl.pluralLogic(
      days,
      locale: localeName,
      other: '$days days',
      one: '1 day',
    );
    return '$_temp0 · Report by $date (Singapore time)';
  }

  @override
  String get edit => 'Edit';

  @override
  String get maintenance => 'Maintenance';

  @override
  String get tenancyMaintenanceEmpty =>
      'Requests for this property will appear here';

  @override
  String requestCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count requests',
      one: '1 request',
    );
    return '$_temp0';
  }

  @override
  String repairAttempts(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count repair attempts',
      one: '1 repair attempt',
    );
    return '$_temp0';
  }

  @override
  String get repairCosts => 'Repair costs';

  @override
  String get repairCostsDetail => 'Terms that shape who pays for a repair';

  @override
  String get assets => 'Property assets';

  @override
  String get assetsDetail => 'Appliances and fixtures linked to maintenance';

  @override
  String get assetAdd => 'Add asset';

  @override
  String assetRepairs(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count repairs in 365 days',
      one: '1 repair in 365 days',
    );
    return '$_temp0';
  }

  @override
  String get assetRepeatFault => 'Repeat fault';

  @override
  String get notSet => 'Not set';

  @override
  String minorRepairCapSummary(String amount) {
    return 'Tenant pays up to S\$$amount per repair';
  }

  @override
  String get set => 'Set';

  @override
  String get agentMayAgreeCosts => 'Agent can agree costs';

  @override
  String get agentMayAgreeCostsOn =>
      'Lets the agent accept or reject cost proposals for you';

  @override
  String get agentMayAgreeCostsLandlordOnly =>
      'Only the landlord can change this';

  @override
  String get tenancyNoRequests => 'No open requests';

  @override
  String get tenancyNoRequestsDetail =>
      'This tenancy has no reported maintenance problems.';

  @override
  String get assetsEmpty => 'No assets have been added to this property yet.';

  @override
  String get propertyArchived => 'Archived';

  @override
  String get propertyInTrash => 'In trash';

  @override
  String get propertyActive => 'Active property';

  @override
  String propertyCounts(int tenancies, int inspections, int photos) {
    String _temp0 = intl.Intl.pluralLogic(
      tenancies,
      locale: localeName,
      other: '$tenancies tenancies',
      one: '1 tenancy',
    );
    String _temp1 = intl.Intl.pluralLogic(
      inspections,
      locale: localeName,
      other: '$inspections inspections',
      one: '1 inspection',
    );
    String _temp2 = intl.Intl.pluralLogic(
      photos,
      locale: localeName,
      other: '$photos photos',
      one: '1 photo',
    );
    return '$_temp0 · $_temp1 · $_temp2';
  }

  @override
  String get propertyTenancyAccess => 'Tenancy access';

  @override
  String get propertyPersonalTenancy => 'Personal tenancy';

  @override
  String propertyResponsibleAgent(String name) {
    return 'Responsible agent: $name';
  }

  @override
  String get propertyOpenCheckOutReport => 'Open check-out report';

  @override
  String get propertyOpenCheckInReport => 'Open check-in report';

  @override
  String get propertyDangerZone => 'Danger zone';

  @override
  String get propertyManageOnly =>
      'Only the property’s lead agents or agency managers can archive or delete it. You need management access to every tenancy at this address.';

  @override
  String get propertyTrashedNoDate =>
      'This property is hidden from active work. Restore it before its recovery period ends.';

  @override
  String propertyTrashedUntil(String date) {
    return 'This property is hidden from active work. Restore before $date. After that, eligible records and media are permanently removed.';
  }

  @override
  String get propertyRestore => 'Restore property';

  @override
  String get propertyArchivedBody =>
      'This property is outside the active portfolio. Its records and reports are preserved.';

  @override
  String get propertyArchiveBody =>
      'Archive removes this address from active work and preserves its reports and history. You can restore it later.';

  @override
  String get propertyRestoreActive => 'Restore to active properties';

  @override
  String get propertyArchive => 'Archive property';

  @override
  String get propertyDeleteBody =>
      'Delete a mistaken or draft-only property. It moves to trash for 30 days before eligible records and media are permanently removed.';

  @override
  String get propertyDelete => 'Delete property';

  @override
  String get propertyMoveToTrash => 'Move to trash';

  @override
  String questionTitle(String label) {
    return '$label?';
  }

  @override
  String propertyTrashBody(int tenancies, int inspections, int photos) {
    String _temp0 = intl.Intl.pluralLogic(
      tenancies,
      locale: localeName,
      other: '$tenancies tenancies',
      one: '1 tenancy',
    );
    String _temp1 = intl.Intl.pluralLogic(
      inspections,
      locale: localeName,
      other: '$inspections inspections',
      one: '1 inspection',
    );
    String _temp2 = intl.Intl.pluralLogic(
      photos,
      locale: localeName,
      other: '$photos photos',
      one: '1 photo',
    );
    return 'This affects $_temp0, $_temp1 and $_temp2. You have 30 days to restore them from Properties → Trash.';
  }

  @override
  String get propertyArchiveConfirmBody =>
      'This removes the property from active work for everyone with access. Reports and evidence remain available in Archived properties.';

  @override
  String get propertyRestoreConfirmBody =>
      'This restores the property and its saved work to their previous state.';

  @override
  String propertyTypeToConfirm(String label) {
    return 'Type “$label” to confirm.';
  }

  @override
  String get propertyAddress => 'Property address';

  @override
  String get propertiesActive => 'Active';

  @override
  String get propertiesTrash => 'Trash';

  @override
  String get propertiesNoActive => 'No active properties.';

  @override
  String get propertiesNoArchived => 'No archived properties.';

  @override
  String get propertiesTrashEmpty => 'Trash is empty.';

  @override
  String propertyListCounts(int tenancies, int inspections) {
    String _temp0 = intl.Intl.pluralLogic(
      tenancies,
      locale: localeName,
      other: '$tenancies tenancies',
      one: '1 tenancy',
    );
    String _temp1 = intl.Intl.pluralLogic(
      inspections,
      locale: localeName,
      other: '$inspections inspections',
      one: '1 inspection',
    );
    return '$_temp0 · $_temp1';
  }

  @override
  String propertyRestoreBefore(String date) {
    return 'Restore before $date';
  }

  @override
  String get teamCreateTitle => 'Create a team';

  @override
  String get teamWorkTogether => 'Work together';

  @override
  String get teamIntro =>
      'Create or join a team to manage properties with your colleagues. Agents see their assigned properties. Owners and managers see all team properties. Choose Personal for your own properties.';

  @override
  String teamInvitationTo(String team) {
    return 'Invitation to $team';
  }

  @override
  String teamInvitationRole(String role, String date) {
    return '$role · Expires $date';
  }

  @override
  String get teamJoinDetail =>
      'Joining gives you a place in this team. Agents work on assigned tenancies; managers oversee team work.';

  @override
  String get teamJoin => 'Join team';

  @override
  String get teamDecline => 'Decline invitation';

  @override
  String teamRoleMembers(String role, int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count members',
      one: '1 member',
    );
    return '$role · $_temp0';
  }

  @override
  String teamOpenWorkspace(String team) {
    return 'Open $team';
  }

  @override
  String get teamCreate => 'Create team';

  @override
  String get teamMembers => 'Team members';

  @override
  String teamRoleSummary(String role) {
    return '$role · Agents see assigned tenancies. Owners and managers oversee the team portfolio.';
  }

  @override
  String get teamInviteMember => 'Invite member';

  @override
  String get teamRename => 'Rename team';

  @override
  String get teamMembersAndInvitations => 'Members and invitations';

  @override
  String get teamMemberActive => 'Active';

  @override
  String get teamInvitationPending => 'Invitation pending';

  @override
  String get teamMemberRemoved => 'removed';

  @override
  String teamAssignedTenancies(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count assigned tenancies',
      one: '1 assigned tenancy',
    );
    return '$_temp0';
  }

  @override
  String teamExpires(String date) {
    return 'Expires $date';
  }

  @override
  String get teamAssignedWork => 'Assigned work';

  @override
  String get teamNoProperties =>
      'No team properties yet. Choose this team when you start a check-in. You can also move an existing personal tenancy from Property access.';

  @override
  String get teamRecentActivity => 'Recent activity';

  @override
  String get activityCreatedTeam => 'created team';

  @override
  String get activityInvitedMember => 'invited member';

  @override
  String get activityResentInvitation => 'resent invitation';

  @override
  String get activityRevokedInvitation => 'revoked invitation';

  @override
  String get activityRemovedMember => 'removed member';

  @override
  String get activityRenamedTeam => 'renamed team';

  @override
  String get activityJoinedTeam => 'joined team';

  @override
  String get activityDeclinedInvitation => 'declined invitation';

  @override
  String get activityReassigned => 'reassigned departing member’s properties';

  @override
  String get activityChangedAssignments => 'changed property assignments';

  @override
  String get activityAddedProperty => 'added property to team';

  @override
  String get activityAddedCollaborator => 'added property collaborator';

  @override
  String get activityRemovedCollaborator => 'removed property collaborator';

  @override
  String get activityPropertyArchive => 'archived property';

  @override
  String get activityPropertyUnarchive => 'restored archived property';

  @override
  String get activityPropertyTrash => 'moved property to trash';

  @override
  String get activityPropertyRestore => 'restored property from trash';

  @override
  String activityChangedRole(String role) {
    return 'changed role to $role';
  }

  @override
  String get teamName => 'Team name';

  @override
  String get teamInviteColleague => 'Invite a colleague';

  @override
  String get teamEmailAddress => 'Email address';

  @override
  String get roleManager => 'Manager';

  @override
  String get teamManagerDetail =>
      'Managers can see team tenancies, assign work and manage members.';

  @override
  String get teamAgentDetail =>
      'Agents work on tenancies assigned to them. Other team records stay private.';

  @override
  String get teamSendInvitation => 'Send invitation';

  @override
  String get teamInvitationNotAccepted =>
      'This invitation has not been accepted. It gives no access to team work.';

  @override
  String get teamResendInvitation => 'Resend invitation';

  @override
  String get teamRevokeInvitation => 'Revoke invitation';

  @override
  String teamRemoveConfirm(String name, String team) {
    return 'Remove $name from $team? Their agency access will stop. Saved work and authorship stay intact; personal properties are unaffected.';
  }

  @override
  String teamReassignFirst(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count tenancies',
      one: '1 tenancy',
    );
    return 'Reassign $_temp0 before removing this member.';
  }

  @override
  String get teamNewResponsibleAgent => 'New responsible agent';

  @override
  String get teamChooseMember => 'Choose a member';

  @override
  String get teamRolesExplained =>
      'Owners manage the team. Managers oversee its portfolio. Agents work on assigned tenancies.';

  @override
  String get teamRemoveMember => 'Remove member';

  @override
  String get teamSaveRole => 'Save role';

  @override
  String get roleOwner => 'Owner';

  @override
  String accessRemoveTitle(String name) {
    return 'Remove $name?';
  }

  @override
  String get accessRemoveReportsBody =>
      'They will lose access to their previous reports for this tenancy. Work they have already saved stays on the property.';

  @override
  String get accessRemoveBody =>
      'They will lose access to this tenancy and its inspections, updates and repairs. Work they have already saved stays on the property.';

  @override
  String get accessRemove => 'Remove access';

  @override
  String get accessPreviousReports => 'Access to previous reports';

  @override
  String get accessReportsOnlyIntro =>
      'Your access covers previous reports you worked on. The lead agent can add you as a collaborator to work on this tenancy.';

  @override
  String get accessIntro =>
      'Collaborators can capture photos, edit inventory and manage repairs for this tenancy. This grants no access to other tenancies or properties.';

  @override
  String get accessPersonalDetail =>
      'This work belongs to the lead agent. Moving it into a team gives its owners and managers access.';

  @override
  String get accessTeamDetail =>
      'Team owners and managers oversee this tenancy. Assigned agents and external collaborators can work on it.';

  @override
  String get accessMoveToTeam => 'Move to team';

  @override
  String get accessAssignMembers => 'Assign team members';

  @override
  String get accessLeadOnly => 'Only the lead agent can work on this tenancy.';

  @override
  String get accessLeadAgent => 'Lead agent';

  @override
  String get accessCanWork => 'Can work on this tenancy';

  @override
  String get remove => 'Remove';

  @override
  String get accessPreviousReportsOnly => 'Previous reports only';

  @override
  String get accessPreviousReportsDetail =>
      'These agents keep access to reports they previously worked on. They cannot work on the rest of this tenancy.';

  @override
  String accessPreviousReportCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count previous reports',
      one: '1 previous report',
    );
    return '$_temp0';
  }

  @override
  String get accessAddCollaboratorTitle => 'Add a collaborator';

  @override
  String get accessAddCollaboratorDetail =>
      'They can open the property after signing in to Kivilo with this email address.';

  @override
  String get saving => 'Saving…';

  @override
  String get accessAddCollaborator => 'Add collaborator';

  @override
  String get accessLeadManages =>
      'Only the lead agent can add or remove collaborators.';

  @override
  String get accessTeamManages =>
      'The responsible agent and team managers can change access.';

  @override
  String get accessHandoverDetail =>
      'Changing the responsible agent hands over management without changing authorship or signed reports. External collaborators keep their existing access.';

  @override
  String get accessFindMember => 'Find a team member';

  @override
  String get accessTeamMember => 'Team member';

  @override
  String get accessSaveAssignment => 'Save assignment';

  @override
  String get accessMoveTitle => 'Move tenancy to team?';

  @override
  String get accessMoveBody =>
      'This tenancy becomes team work. Owners and managers gain access and can reassign it. Existing collaborators, signed reports and authorship are preserved. Other personal tenancies stay personal.';

  @override
  String get accessCreateTeamFirst =>
      'Create or join a team first in Account → Team.';

  @override
  String get accessChooseTeam => 'Choose a team';

  @override
  String accessTeamTenancy(String team) {
    return 'Team tenancy · $team';
  }

  @override
  String get accessPrivate => 'Private';

  @override
  String get accessShared => 'Shared tenancy';

  @override
  String accessSharedWith(String names) {
    return 'Shared with $names';
  }

  @override
  String accessReportsSharedWith(String names) {
    return 'Previous reports shared with $names';
  }

  @override
  String get changeDamage => 'Damage';

  @override
  String get changeWear => 'Wear';

  @override
  String get changeMissing => 'Missing';

  @override
  String get changeImproved => 'Improved';

  @override
  String get changeUnchanged => 'Unchanged';

  @override
  String get verdictUndecided => 'Undecided';

  @override
  String get verdictTenantLiable => 'Tenant liable';

  @override
  String get verdictFairWear => 'Fair wear';

  @override
  String get verdictDisputed => 'Disputed';

  @override
  String get roomAddTitle => 'Add a room';

  @override
  String get roomName => 'Room name';

  @override
  String get stillUploading => 'Still uploading';

  @override
  String get stillUploadingBody =>
      'Some photos, videos or changes have not uploaded yet. Open the rooms and tap Retry uploads before sending for signature.';

  @override
  String get sendForSignatureTitle => 'Send for signature?';

  @override
  String sendForSignatureBody(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'All $count rooms have been reviewed.',
      one: 'The room has been reviewed.',
    );
    return '$_temp0 Sending freezes the inventory, captions and photo marks. Review the report with both parties before they sign.';
  }

  @override
  String get send => 'Send';

  @override
  String signingLinkSent(String name) {
    return 'Signing link on its way to $name';
  }

  @override
  String get pdfNoViewer =>
      'Install a PDF viewer to open this report, or use Share PDF to send it.';

  @override
  String get pdfOpenFailed =>
      'Could not open this PDF. Please try again, or use Share PDF.';

  @override
  String get findingPhotosUnfinished =>
      'Finish marking and uploading your finding photos before publishing. Reopen Add finding or Review finding to resume them.';

  @override
  String get publishNoDamageTitle => 'Publish: no damage found?';

  @override
  String get publishAssessmentTitle => 'Publish assessment?';

  @override
  String get publishNoDamageBody =>
      'No changes are recorded between check-in and check-out. Publishing states that you checked and found no damage, and both parties see that in the shared report. Future edits require publishing a new version.';

  @override
  String get publishAssessmentBody =>
      'The reviewed findings will be visible as a dated assessment separate from the signed inventory. Future edits require publishing a new version.';

  @override
  String get publishNoDamage => 'Publish no damage';

  @override
  String get publish => 'Publish';

  @override
  String get inspection => 'Inspection';

  @override
  String inspectionOpenFailed(String error) {
    return 'Could not open this inspection. $error';
  }

  @override
  String get inspectionOffline =>
      'Offline copy. Open a saved room to keep capturing. Review and signatures need a connection.';

  @override
  String get inspectionCheckInEyebrow => 'CHECK-IN REPORT';

  @override
  String get inspectionCheckOutEyebrow => 'CHECK-OUT REPORT';

  @override
  String step(int number, String name) {
    return 'Step $number of 3: $name';
  }

  @override
  String stepComplete(int number, String name) {
    return 'Step $number of 3: $name, complete';
  }

  @override
  String stepCurrent(int number, String name) {
    return 'Step $number of 3: $name, current';
  }

  @override
  String get stepRooms => 'Rooms';

  @override
  String get stepReview => 'Review';

  @override
  String get stepSign => 'Sign';

  @override
  String get inspectionSigned => 'Signed and safely recorded.';

  @override
  String get inspectionReadyToSign => 'Ready for both parties to sign.';

  @override
  String get inspectionRoomsReady => 'Your rooms are ready. Review, then send.';

  @override
  String get inspectionBuildRecord => 'Build the record, room by room.';

  @override
  String get inspectionCheckEachRoom => 'Check each room before you send.';

  @override
  String get inspectionSignedBody =>
      'Both parties have signed. The agreed report is ready to view and share.';

  @override
  String get inspectionSentBody =>
      'The report is fixed. Collect signatures below, in person or by email.';

  @override
  String get inspectionRoomsReadyBody =>
      'Sending fixes the inventory, captions and photo marks for both parties to sign.';

  @override
  String get inspectionRecordingBody =>
      'Start with the room inventory. Open each item to record its condition, take photos and mark details.';

  @override
  String get inspectionReviewBody =>
      'Check the inventory against your photos and videos, then mark each room reviewed.';

  @override
  String roomsReviewedSuffix(int total) {
    return '/$total rooms reviewed';
  }

  @override
  String get sendForSignature => 'Send for signature';

  @override
  String continueRoom(String room) {
    return 'Continue $room';
  }

  @override
  String get inspectionPeople => 'People on this report';

  @override
  String get tenantHandover => 'Tenant handover';

  @override
  String get viewCheckInBaseline => 'View check-in baseline';

  @override
  String get reportSummary => 'Report summary';

  @override
  String get roomsStartFirst => 'Start with your first room';

  @override
  String get roomsDetail => 'Inventory and media, room by room';

  @override
  String get roomsEmpty => 'No rooms yet';

  @override
  String get roomsEmptyDetail => 'Add a room to start the inventory.';

  @override
  String get signatures => 'Signatures';

  @override
  String get signaturesDetail =>
      'The agreed inventory is now fixed for signing.';

  @override
  String get shareReport => 'Share report';

  @override
  String get shareReportDetail =>
      'A private link, or a PDF headed with your agency.';

  @override
  String get shareReportSigned => 'View or send the signed report';

  @override
  String get viewPdf => 'View PDF';

  @override
  String get sharePdf => 'Share PDF';

  @override
  String get shareLink => 'Share link';

  @override
  String get shareLinkWarning => 'Anyone with the link can read this report.';

  @override
  String get signedReportAndUpdates => 'Signed report and updates';

  @override
  String get writeUpdate => 'Write an update';

  @override
  String get endOfTenancy => 'End of tenancy';

  @override
  String get endOfTenancyDetail =>
      'Use this signed check-in as the baseline for a check-out.';

  @override
  String get moveOutOther => 'Other';

  @override
  String get moveOutMissing => 'Missing';

  @override
  String get moveOutWorn => 'Worn';

  @override
  String get startCheckOut => 'Start check-out';

  @override
  String get maintenanceHistory => 'Maintenance history';

  @override
  String get maintenanceHistoryDetail =>
      'Context for review. A person decides whether it affects a finding.';

  @override
  String repairCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count repairs',
      one: '1 repair',
    );
    return '$_temp0';
  }

  @override
  String mediaFileCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count media files',
      one: '1 media file',
    );
    return '$_temp0';
  }

  @override
  String costAgreed(String agreement) {
    return 'Cost agreed: $agreement';
  }

  @override
  String get costPending => 'Cost proposal waiting for an answer';

  @override
  String get costDisputed => 'Cost disputed';

  @override
  String get costNotProposed => 'Nobody has proposed who pays';

  @override
  String costsOpen(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count repairs have no agreed cost',
      one: '1 repair has no agreed cost',
    );
    return '$_temp0';
  }

  @override
  String get costsOpenBody =>
      'Settle who pays on each one before the deposit is decided, or link it to a finding so the decision is made there.';

  @override
  String roomPreview(String room, int number) {
    return '$room preview $number';
  }

  @override
  String get signed => 'Signed';

  @override
  String get noEmailOnFile => 'No email on file';

  @override
  String signingLinkEmailed(String date) {
    return 'Signing link emailed $date';
  }

  @override
  String get signingLinkQueued => 'Emailing the signing link';

  @override
  String get signingLinkFailed => 'Could not email the signing link';

  @override
  String get signingLinkNotEmailed => 'Signing link not emailed';

  @override
  String get emailSigningLink => 'Email signing link';

  @override
  String get resend => 'Resend';

  @override
  String get checkOutAssessment => 'Check-out assessment';

  @override
  String get checkOutAssessmentDetail =>
      'A separate, dated record of changes and responsibility.';

  @override
  String get checkOutAssessmentIntro =>
      'Record each change since check-in. Findings stay private until you publish them, and the signed inventory does not change.';

  @override
  String publishedVersion(int version) {
    return 'Published version $version';
  }

  @override
  String get findings => 'Findings';

  @override
  String get findingsEmpty => 'No changes recorded yet';

  @override
  String findingsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count changes recorded',
      one: '1 change recorded',
    );
    return '$_temp0';
  }

  @override
  String get findingUnconfirmed => 'Unconfirmed';

  @override
  String findingEstimatedCost(String amount) {
    return 'Estimated cost · SGD $amount';
  }

  @override
  String get findingsConfirmFirst =>
      'Open and confirm each unconfirmed finding before publishing.';

  @override
  String get publishNoDamageFound => 'Publish: no damage found';

  @override
  String get publishAssessment => 'Publish assessment';

  @override
  String get publishNewVersion => 'Publish new version';

  @override
  String get categoryMeter => 'Meter';

  @override
  String get conditionNew => 'New';

  @override
  String get conditionGood => 'Good';

  @override
  String get conditionFair => 'Fair';

  @override
  String get conditionPoor => 'Poor';

  @override
  String get conditionDamaged => 'Damaged';

  @override
  String get photoActions => 'Photo actions';

  @override
  String get videoActions => 'Video actions';

  @override
  String get preview => 'Preview';

  @override
  String get previewDetail => 'Open the original file';

  @override
  String get editNote => 'Edit note';

  @override
  String get noteHint => 'Describe what this shows';

  @override
  String get markPhoto => 'Mark photo';

  @override
  String get markPhotoDetail => 'Circle, point to, or draw over a detail';

  @override
  String get deleteMedia => 'Delete media';

  @override
  String get photo => 'Photo';

  @override
  String get deletePhotoTitle => 'Delete this photo?';

  @override
  String get deleteVideoTitle => 'Delete this video?';

  @override
  String get deleteMediaBody =>
      'This removes it from the room and from any inventory item it is attached to.';

  @override
  String get delete => 'Delete';

  @override
  String deleteNamed(String name) {
    return 'Delete $name?';
  }

  @override
  String get deleteItemBody => 'This removes the line from the inventory.';

  @override
  String nothingToRecordTitle(String room) {
    return 'Nothing to record in $room?';
  }

  @override
  String get nothingToRecordBody =>
      'This marks the room reviewed with no items. The report will say nothing was recorded in this room.';

  @override
  String get confirm => 'Confirm';

  @override
  String get signInAgain => 'Sign in again to continue.';

  @override
  String get roomStillUploadingBody =>
      'Some photos, videos or changes in this room have not uploaded yet. Open the item or Room media & walkthrough to finish any photo marks and retry uploads before continuing.';

  @override
  String get roomRename => 'Rename room';

  @override
  String get roomActions => 'Room actions';

  @override
  String get roomRenameDetail => 'Change the room name';

  @override
  String get roomDelete => 'Delete room';

  @override
  String get roomDeleteDetail => 'Remove its photos, videos and inventory';

  @override
  String get roomDeleteTitle => 'Delete this room?';

  @override
  String get roomDeleteBody =>
      'Its photos, videos and inventory will be removed.';

  @override
  String get room => 'Room';

  @override
  String get roomInventory => 'Room inventory';

  @override
  String roomOpenFailed(String error) {
    return 'Could not open this room. $error';
  }

  @override
  String get atCheckIn => 'At check-in';

  @override
  String get atCheckInSigned => 'This room as it was signed';

  @override
  String atCheckInSignedOn(String date) {
    return 'This room as it was signed on $date';
  }

  @override
  String get hide => 'Hide';

  @override
  String get show => 'Show';

  @override
  String get inventory => 'Inventory';

  @override
  String itemsInRoom(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items in this room',
      one: '1 item in this room',
    );
    return '$_temp0';
  }

  @override
  String get inventoryEmpty => 'No inventory items yet';

  @override
  String get inventoryEmptyDetail =>
      'Add an item, then open it to take photos and mark details.';

  @override
  String get media => 'Media';

  @override
  String get mediaEmptyDetail => 'Photos and videos of this room';

  @override
  String get mediaOne => '1 photo or video';

  @override
  String mediaMany(int count) {
    return '$count photos and videos';
  }

  @override
  String get newestFirst => 'Newest first';

  @override
  String get oldestFirst => 'Oldest first';

  @override
  String get roomMediaWalkthrough => 'Room media & walkthrough';

  @override
  String get mediaEmpty => 'No photos or videos yet';

  @override
  String get mediaEmptyUploading =>
      'Photos and videos appear here once they upload.';

  @override
  String get finishRoom => 'Finish this room';

  @override
  String get finishRoomEmpty =>
      'Add an item, or confirm there is nothing to record in this room.';

  @override
  String get finishRoomBody =>
      'Check every item against the photos and video. Your review makes this room ready for the report.';

  @override
  String get reviewedRoom => 'I reviewed this room';

  @override
  String get nothingToRecord => 'Nothing to record';

  @override
  String get roomOffline =>
      'Offline copy. Keep capturing; review edits need a connection.';

  @override
  String get roomRecordEyebrow => 'ROOM RECORD';

  @override
  String roomCounts(int items, int photos, int videos) {
    String _temp0 = intl.Intl.pluralLogic(
      items,
      locale: localeName,
      other: '$items items',
      one: '1 item',
    );
    String _temp1 = intl.Intl.pluralLogic(
      photos,
      locale: localeName,
      other: '$photos photos',
      one: '1 photo',
    );
    String _temp2 = intl.Intl.pluralLogic(
      videos,
      locale: localeName,
      other: '$videos videos',
      one: '1 video',
    );
    return '$_temp0 · $_temp1 · $_temp2';
  }

  @override
  String get roomFixedBody =>
      'This inventory is fixed for signing. Media remains available below.';

  @override
  String get roomPendingBody =>
      'Start with the inventory. Open an item to add photos and mark details.';

  @override
  String get roomReviewBody =>
      'Open each inventory item to check its details and add photos, then mark this room reviewed.';

  @override
  String get roomReviewedBody =>
      'This room has been reviewed. Open an item to update its details or add photos.';

  @override
  String get roomCapturingBody =>
      'Add each item to the inventory, then open it to take photos and mark details.';

  @override
  String get video => 'Video';

  @override
  String photoNumber(int number) {
    return 'Photo $number';
  }

  @override
  String videoNumber(int number) {
    return 'Video $number';
  }

  @override
  String fieldNone(String field) {
    return 'no $field';
  }

  @override
  String fieldValue(String field, String value) {
    return '$field: $value';
  }

  @override
  String get atCheckInUpdatedPrefix => 'At check-in, updated:';

  @override
  String get atCheckInPrefix => 'At check-in:';

  @override
  String get fieldName => 'name';

  @override
  String get fieldSerial => 'serial';

  @override
  String get fieldReading => 'reading';

  @override
  String get fieldNotes => 'notes';

  @override
  String get openItem => 'Open item';

  @override
  String get deleteItem => 'Delete item';

  @override
  String quantityShort(int count) {
    return 'Qty $count';
  }

  @override
  String identifierLine(String value) {
    return 'Identifier  $value';
  }

  @override
  String readingLine(String value) {
    return 'Reading  $value';
  }

  @override
  String get attachedMedia => 'Attached media';

  @override
  String markedPhotoNumber(int number) {
    return 'Marked photo $number';
  }

  @override
  String openAttachedTo(String label, String item) {
    return 'Open $label attached to $item';
  }

  @override
  String get backToMediaActions => 'Back to media actions';

  @override
  String get note => 'Note';

  @override
  String get saveNote => 'Save note';

  @override
  String get itemNameRequired =>
      'Enter an item name and quantity of at least one.';

  @override
  String get editItem => 'Edit inventory item';

  @override
  String get editItemDetail =>
      'Describe this item. Take photos from its inventory page.';

  @override
  String get condition => 'Condition';

  @override
  String get quantity => 'Quantity';

  @override
  String get makeModelSerial => 'Make, model or serial';

  @override
  String get meterReading => 'Meter reading';

  @override
  String get notes => 'Notes';

  @override
  String get hideRoomMedia => 'Hide existing room media';

  @override
  String get linkRoomMedia => 'Link existing room media';

  @override
  String get finishUploadingBeforeLink =>
      'Finish uploading this room’s photos before linking existing media.';

  @override
  String get linkRoomMediaDetail =>
      'Choose the room photos and videos that support this inventory line. Their notes and photo marks stay attached.';

  @override
  String get noRoomMedia => 'No media in this room yet.';

  @override
  String get hasPhotoMarks => 'Has photo marks';

  @override
  String get saveChanges => 'Save changes';

  @override
  String captureCheckFailed(String error) {
    return 'Could not check saved media. $error';
  }

  @override
  String get captureAccountChanged => 'Account changed. Open this room again.';

  @override
  String get captureRoomNotLoaded =>
      'Room has not been loaded on this phone. Connect once to open it.';

  @override
  String captureSaveFailed(String error) {
    return 'Could not save that photo or video. $error';
  }

  @override
  String captureAddFailed(String error) {
    return 'Could not add that photo or video. $error';
  }

  @override
  String uploadPausedError(String error) {
    return 'Upload paused. $error';
  }

  @override
  String get mediaActions => 'Media actions';

  @override
  String get playVideo => 'Play video';

  @override
  String get markPhotoDetailShort => 'Circle or point to a detail';

  @override
  String get capturePhotoNotFoundNote =>
      'Could not find this photo. Please try the note again.';

  @override
  String get capturePhotoOpenFailed =>
      'Could not open this photo. Please retry when connected.';

  @override
  String get savePhoto => 'Save photo';

  @override
  String get capturePhotoNotFoundMarks =>
      'Could not find this photo. Please try the marks again.';

  @override
  String get captureNotFoundDelete =>
      'Could not find this photo or video. Please try deleting it again.';

  @override
  String get captureWaitForSave =>
      'Wait for the photo or video to finish saving.';

  @override
  String get captureNotUploaded =>
      'Some photos, videos or changes have not uploaded yet. Try again when you have signal.';

  @override
  String captureReviewFailed(String error) {
    return 'Could not open review. $error';
  }

  @override
  String get captureMarksFailed =>
      'The photo uploaded, but its marks did not. Try again, or edit the marks.';

  @override
  String get finishMarking => 'Finish marking';

  @override
  String uploadSizeSuffix(String unit, String total, String totalUnit) {
    return ' $unit of $total $totalUnit';
  }

  @override
  String get roomMedia => 'Room media';

  @override
  String atCheckInDate(String date) {
    return 'At check-in · $date';
  }

  @override
  String get retryUploads => 'Retry uploads';

  @override
  String atCheckInLine(String name, String condition, int count) {
    return 'At check-in: $name · $condition · Qty $count';
  }

  @override
  String serialAtCheckIn(String value) {
    return 'Serial / model at check-in: $value';
  }

  @override
  String meterAtCheckIn(String value) {
    return 'Meter at check-in: $value';
  }

  @override
  String checkInNotes(String value) {
    return 'Check-in notes: $value';
  }

  @override
  String serialModel(String value) {
    return 'Serial / model: $value';
  }

  @override
  String meterReadingValue(String value) {
    return 'Meter reading: $value';
  }

  @override
  String get editDetails => 'Edit details';

  @override
  String get photosAndVideo => 'Photos & video';

  @override
  String get captureRoomIntro =>
      'Record a room walkthrough or manage existing room media.';

  @override
  String get captureItemIntro =>
      'Take a photo, add any marks, then save. It is attached to this item automatically.';

  @override
  String get captureOffline =>
      'Offline. Photos and videos stay on this phone and upload when you have signal.';

  @override
  String captureInterrupted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count photos or videos were',
      one: 'A photo or video was',
    );
    return '$_temp0 interrupted while saving. Do not uninstall Kivilo or clear its data, so nothing is lost.';
  }

  @override
  String editsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count changes are',
      one: 'A change is',
    );
    return '$_temp0 waiting to upload. Tap to try again.';
  }

  @override
  String get photos => 'Photos';

  @override
  String get recordVideo => 'Record video';

  @override
  String get takeAnotherPhoto => 'Take another photo';

  @override
  String get takePhoto => 'Take a photo';

  @override
  String get chooseVideo => 'Choose video';

  @override
  String get choosePhotos => 'Choose photos';

  @override
  String get itemMedia => 'Item media';

  @override
  String get captureSavedFirst =>
      'Saved on your phone first, then added to the report';

  @override
  String get captureReviewWaits =>
      'Review opens once this room’s photos, videos and changes have uploaded. Your media stays saved on this phone while you wait for signal.';

  @override
  String get done => 'Done';

  @override
  String get reviewRoom => 'Review room';

  @override
  String get photoOnPhone => 'Photo on this phone';

  @override
  String get videoOnPhone => 'Video on this phone';

  @override
  String get inTheReport => 'In the report';

  @override
  String get uploadedUpdating => 'Uploaded · updating report';

  @override
  String get readyToMark => 'Ready to mark';

  @override
  String get marksNeedAttention => 'Marks need attention';

  @override
  String get uploadPaused => 'Upload paused';

  @override
  String get preparingUpload => 'Preparing secure upload';

  @override
  String get uploading => 'Uploading';

  @override
  String get addingToRoom => 'Adding to room';

  @override
  String get addingToItem => 'Adding to item';

  @override
  String get uploadingNotes => 'Uploading notes and marks';

  @override
  String get savedWaiting => 'Saved safely · waiting to upload';

  @override
  String get photoNote => 'Photo note';

  @override
  String get photoNoteDetail =>
      'Describe what the viewer should notice in this photo.';

  @override
  String get photoNoteHint => 'For example: chip beside the sink';

  @override
  String get disputeMoveIn => 'Dispute move-in condition';

  @override
  String get disputeMoveInLabel => 'What do you disagree with?';

  @override
  String get disputeMoveInHelper => 'Your reason stays on the dated notice.';

  @override
  String get recordDispute => 'Record dispute';

  @override
  String handPhoneTo(String name) {
    return 'Hand the phone to $name';
  }

  @override
  String acknowledgeInPersonBody(
    String name,
    String role,
    int number,
    String title,
  ) {
    return '$name, the $role, has read Update $number: $title. Tapping below records that they acknowledged it in person, with the time and the exact content shown. It is not a new signature on the report.';
  }

  @override
  String get acknowledgeUpdate => 'I acknowledge this update';

  @override
  String get disputeDeductions => 'Dispute the deductions';

  @override
  String partyDisputesDeductions(String name) {
    return '$name disputes the deductions';
  }

  @override
  String get disputeDeductionsLabel => 'What is disputed, and why?';

  @override
  String get disputeDeductionsHelper =>
      'The reason is recorded beside the statement.';

  @override
  String agreeInPersonBody(String name, String role) {
    return '$name, the $role, has read the deposit statement. Tapping below records that they agreed to the deductions in person, with the time and the exact statement shown.';
  }

  @override
  String get agreeDeductions => 'Agree to the deductions';

  @override
  String money(String amount) {
    return 'S\$$amount';
  }

  @override
  String get depositStatement => 'Deposit statement';

  @override
  String get deposit => 'Deposit';

  @override
  String deductionsLine(int count, int total) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total findings',
      one: '1 finding',
    );
    return 'Deductions ($count of $_temp0, tenant liable)';
  }

  @override
  String get toReturnToTenant => 'To return to the tenant';

  @override
  String get deductionsExceed => 'Deductions exceed the deposit by';

  @override
  String get answerAgreed => 'agreed';

  @override
  String get answerDisputed => 'disputed';

  @override
  String get answerNotYet => 'not answered yet';

  @override
  String get inPersonSuffix => ' in person';

  @override
  String get depositRecordsOnly =>
      'Kivilo records each answer. It does not hold or move the deposit.';

  @override
  String get recording => 'Recording…';

  @override
  String get iAgreeDeductions => 'I agree to the deductions';

  @override
  String get dispute => 'Dispute';

  @override
  String inPersonParty(String role, String name) {
    return 'In person: $role $name';
  }

  @override
  String get agrees => 'Agrees';

  @override
  String get disputes => 'Disputes';

  @override
  String get report => 'Report';

  @override
  String get propertyReport => 'Property report';

  @override
  String get signAsLandlord => 'Sign as landlord';

  @override
  String get signAsTenant => 'Sign as tenant';

  @override
  String signedByBoth(String date) {
    return 'Signed by both parties · $date';
  }

  @override
  String dateRange(String start, String end) {
    return '$start to $end';
  }

  @override
  String get inspected => 'Inspected';

  @override
  String get notRecorded => 'Not recorded';

  @override
  String byName(String name) {
    return 'by $name';
  }

  @override
  String get agreedAndSigned => 'Agreed and signed';

  @override
  String get notCountersigned => 'Not yet countersigned.';

  @override
  String get updatesSinceSigning => 'Updates since signing';

  @override
  String get updatesSinceSigningDetail =>
      'Recorded beside the signed report, which they do not change. Updates count once acknowledged. A move-in condition notice counts once the landlord accepts it.';

  @override
  String get reportFooter =>
      'Rooms and items in this report were written by the inspector against a recorded walkthrough and agreed by the people named above. Where a photograph carries marks, the inspector drew them to point out a detail; they are recorded separately and nothing has been painted onto the photograph itself.';

  @override
  String get nothingRecordedInRoom => 'Nothing recorded in this room.';

  @override
  String readingValue(String value) {
    return 'Reading: $value';
  }

  @override
  String roomPhoto(String room) {
    return '$room photo';
  }

  @override
  String areasMarked(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count areas marked',
      one: '1 area marked',
    );
    return '$_temp0';
  }

  @override
  String signatureOf(String name) {
    return 'Signature of $name';
  }

  @override
  String signedOn(String date) {
    return 'Signed $date';
  }

  @override
  String updatedOn(String date, int number) {
    return 'Updated $date · Update $number';
  }

  @override
  String get pendingAcknowledgement => 'Pending acknowledgement';

  @override
  String moveInConditionLine(String reported, String deadline) {
    return 'Tenant move-in condition · Reported $reported · Deadline $deadline';
  }

  @override
  String disputedByOn(String name, String date) {
    return 'Disputed by $name on $date';
  }

  @override
  String get disputedNoticeKept =>
      'This notice is kept on the report and excluded from the agreed condition for check-out.';

  @override
  String publishedByOn(String name, String date) {
    return 'Published by $name, $date';
  }

  @override
  String conditionReported(String name) {
    return 'Condition reported: $name';
  }

  @override
  String get itemFallback => 'Item';

  @override
  String wasValue(String value) {
    return 'Was: $value';
  }

  @override
  String fromRepairRecord(String title) {
    return 'From the repair record: $title';
  }

  @override
  String get agreePresentAtMoveIn => 'I agree this was present at move-in';

  @override
  String assessmentVersionLine(int version, String date) {
    return 'Version $version, published $date. Separate from the signed inventory above.';
  }

  @override
  String liabilitySummary(int count, int total, String claim, String deposit) {
    String _temp0 = intl.Intl.pluralLogic(
      total,
      locale: localeName,
      other: '$total findings assess',
      one: '1 finding assesses',
    );
    return '$count of $_temp0 tenant liability, totalling S\$$claim against a deposit of S\$$deposit.';
  }

  @override
  String get findingPhotos => 'Finding photos';

  @override
  String openFindingPhoto(String name) {
    return 'Open finding photo: $name';
  }

  @override
  String maintenanceRecord(String title) {
    return 'Maintenance record: $title';
  }

  @override
  String get findingPhoto => 'Finding photo';

  @override
  String itemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count items',
      one: '1 item',
    );
    return '$_temp0';
  }

  @override
  String get findingAlreadySaved =>
      'This finding was already saved. Save to apply any further changes to it.';

  @override
  String findingDraftSaveFailed(String error) {
    return 'Could not save the finding draft on this phone. $error';
  }

  @override
  String get chooseItemFirst => 'Choose an item first.';

  @override
  String get describeChange => 'Describe what changed and why.';

  @override
  String get costInvalid => 'Enter a cost with up to 2 decimal places.';

  @override
  String get photoDraftNotReady => 'Wait until the photo draft is ready.';

  @override
  String get findingSavedOriginalItem =>
      'This finding was already saved for its original item. Choose that item to save your latest text, or discard this draft and add another finding.';

  @override
  String get findingSavedDraftKept =>
      'This finding was already saved. Your latest draft is kept. Reopen the saved finding to make further changes.';

  @override
  String get photoOpenRetry =>
      'Connect and retry to open this photo. Its upload is kept on this phone.';

  @override
  String get photoViewRetry => 'Connect and retry to view this photo.';

  @override
  String get photoCaption => 'Photo caption';

  @override
  String get caption => 'Caption';

  @override
  String get saveCaption => 'Save caption';

  @override
  String get discardDraftTitle => 'Discard this finding draft?';

  @override
  String get discardDraftBody =>
      'The draft text and newly added photos will be removed. Saved finding photos stay with their finding.';

  @override
  String get keepDraft => 'Keep draft';

  @override
  String get discardDraft => 'Discard draft';

  @override
  String get findingPhotosDetail =>
      'Add evidence for this finding. Originals are kept; marks are stored beside each photo.';

  @override
  String get takePhotoShort => 'Take photo';

  @override
  String get addFromGallery => 'Add from gallery';

  @override
  String get photoUploadPending => 'Photo upload pending';

  @override
  String get removingPhoto => 'Removing photo…';

  @override
  String get savedFinishMarking => 'Saved on this phone · Finish marking';

  @override
  String get savedUploadFailed =>
      'Saved on this phone · Upload failed. Retry when connected.';

  @override
  String uploadingPercent(int percent) {
    return 'Uploading $percent%…';
  }

  @override
  String get savingPhoto => 'Saving photo…';

  @override
  String get uploaded => 'Uploaded';

  @override
  String get resumeMarking => 'Resume marking';

  @override
  String get removePhoto => 'Remove photo';

  @override
  String get chooseAnItem => 'Choose an item';

  @override
  String get addFinding => 'Add finding';

  @override
  String get reviewFinding => 'Review finding';

  @override
  String get items => 'Items';

  @override
  String get searchItems => 'Search items, rooms or serial numbers';

  @override
  String get clear => 'Clear';

  @override
  String get atCheckOut => 'At check-out';

  @override
  String get chooseItemMissing => 'For an item no longer here at check-out.';

  @override
  String get chooseItemDetail =>
      'Choose an item using its photos and recorded condition.';

  @override
  String get allRooms => 'All rooms';

  @override
  String get noItemsRecorded => 'No items recorded in this inventory.';

  @override
  String get noMatchingItems =>
      'No matching items. Try another room, name or serial number.';

  @override
  String get selectedItem => 'Selected item';

  @override
  String get changeItem => 'Change item';

  @override
  String get hideItemDetails => 'Hide item details';

  @override
  String get showItemDetails => 'Show item details';

  @override
  String get change => 'Change';

  @override
  String get verdict => 'Verdict';

  @override
  String get rationale => 'Rationale';

  @override
  String get maintenanceMedia => 'Maintenance media';

  @override
  String get noLinkedMaintenance => 'No linked maintenance record';

  @override
  String get estimatedCost => 'Estimated cost (SGD)';

  @override
  String get removeFinding => 'Remove finding';

  @override
  String get saveReviewedFinding => 'Save reviewed finding';

  @override
  String openSourcePhoto(String source) {
    return 'Open $source photo';
  }

  @override
  String openSourcePhotoNote(String source, String note) {
    return 'Open $source photo: $note';
  }

  @override
  String sourcePhoto(String source) {
    return '$source photo';
  }

  @override
  String serialId(String value) {
    return 'Serial / ID: $value';
  }

  @override
  String quantityValue(int count) {
    return 'Quantity: $count';
  }

  @override
  String meterValue(String value) {
    return 'Meter: $value';
  }

  @override
  String checkInValue(String value) {
    return 'Check-in: $value';
  }

  @override
  String checkOutValue(String value) {
    return 'Check-out: $value';
  }

  @override
  String get alsoListedAtCheckOut => 'Also listed at check-out';

  @override
  String get noLinkedPhotos => 'No linked photos recorded for this item.';

  @override
  String get photoFinishingUpload => 'Photo is finishing uploading…';

  @override
  String get categoryPlumbing => 'Plumbing';

  @override
  String get categoryLocksmith => 'Locksmith';

  @override
  String get categoryElectrical => 'Electrical';

  @override
  String get categoryAirCon => 'Air conditioning';

  @override
  String get categoryStructural => 'Structural';

  @override
  String get categoryPest => 'Pest';

  @override
  String errorDraftSaved(String error) {
    return '$error Your draft is saved on this phone.';
  }

  @override
  String errorDraftNotSaved(String error) {
    return '$error This phone could not save your draft. Keep this screen open and try again.';
  }

  @override
  String get propertyItemOptional => 'Property item (optional)';

  @override
  String get noSpecificItem => 'No specific item';

  @override
  String get priorityRoutine => 'Routine';

  @override
  String get priorityUrgent => 'Urgent';

  @override
  String get priorityDanger => 'Danger';

  @override
  String get immediateDanger => 'If someone is in immediate danger';

  @override
  String get immediateDangerDetail =>
      'Call Police 999 or SCDF fire/ambulance 995 before reporting here.';

  @override
  String get presentAtMoveIn => 'It was like this when I moved in';

  @override
  String get presentAtMoveInDetail =>
      'After reporting, add photos and record the move-in condition. The landlord can accept or dispute it.';

  @override
  String get shortTitle => 'Short title';

  @override
  String get whatHappened => 'What happened?';

  @override
  String get whatHappenedHelper =>
      'Include when it started and what you have already tried.';

  @override
  String get submitReport => 'Submit report';

  @override
  String get recordMoveIn => 'Record move-in condition';

  @override
  String get recordMoveInBody =>
      'Record what was already present when you moved in. This saves a dated notice with the problem description and selected photos. It counts towards the agreed condition once the landlord accepts it.';

  @override
  String get itemInCheckIn => 'Item in the check-in';

  @override
  String get notInCheckIn => 'Not listed in the check-in';

  @override
  String get itemName => 'Item name';

  @override
  String get itemCategory => 'Item category';

  @override
  String get conditionAtMoveIn => 'Condition when you moved in';

  @override
  String get chooseCondition => 'Choose condition';

  @override
  String get photosToInclude => 'Photos to include';

  @override
  String beforePhoto(int number) {
    return 'Before photo $number';
  }

  @override
  String uploadedOn(String date) {
    return 'Uploaded $date';
  }

  @override
  String get recordCondition => 'Record condition';

  @override
  String get recordCompletedRepair => 'Record completed repair';

  @override
  String get whatWasRepaired => 'What was repaired?';

  @override
  String get costOptional => 'Cost (optional)';

  @override
  String get costHelper => 'Used to split the cost as agreed';

  @override
  String get costInvalidExample => 'Enter an amount like 150 or 150.50';

  @override
  String get addComment => 'Add a comment';

  @override
  String get closeWithoutAction => 'Close without action';

  @override
  String get closeReasonHint => 'A reason is required. Both sides see it.';

  @override
  String get whatIsStillWrong => 'What is still wrong?';

  @override
  String get signInBeforeRecording =>
      'Sign in again before recording the condition.';

  @override
  String get photosNotUploadedMoveIn =>
      'Some photos have not uploaded yet. Keep them on this phone and retry uploads before recording the move-in condition.';

  @override
  String get disputeMoveInHint =>
      'Explain what you disagree with. Your reason stays on the dated notice.';

  @override
  String reportedOn(String date) {
    return 'Reported $date';
  }

  @override
  String reportedOnDeadline(String date, String deadline) {
    return 'Reported $date · Defect deadline $deadline';
  }

  @override
  String get moveInDetail =>
      'Add photos, then record the move-in condition as a dated notice beside the signed check-in. The landlord can accept or dispute it. The signed report stays unchanged.';

  @override
  String get addBeforePhotos => 'Add before photos';

  @override
  String get addBeforePhotoFirst =>
      'Add at least one uploaded before photo to continue.';

  @override
  String get moveInAccepted =>
      'Accepted by the landlord. Included in the agreed condition for check-out.';

  @override
  String get moveInDisputed =>
      'Disputed by the landlord. Kept as a dated notice and excluded from the agreed condition.';

  @override
  String get moveInWaiting =>
      'Waiting for the landlord to accept or dispute the condition.';

  @override
  String get viewConditionNotice => 'View dated condition notice';

  @override
  String get dangerCallFirst =>
      'If anyone is in danger, call Police 999 or SCDF fire and ambulance 995 first.';

  @override
  String get whatHappenedHeading => 'What happened';

  @override
  String reportedByOn(String name, String date) {
    return 'Reported by $name on $date';
  }

  @override
  String get photosBeforeAfter => 'Before and after the repair';

  @override
  String get noPhotosYetRepair =>
      'No photos yet. A photo of the problem now settles arguments later.';

  @override
  String get history => 'History';

  @override
  String get historyDetail => 'Everything on this request';

  @override
  String get comment => 'Comment';

  @override
  String get waitingAcknowledge =>
      'Waiting for the landlord or agent to acknowledge';

  @override
  String get recordRepairWhenDone => 'Record the repair once it is done';

  @override
  String get waitingTenantRepair => 'Waiting for the tenant to repair it';

  @override
  String get waitingLandlordRepair => 'Waiting for the landlord to repair it';

  @override
  String get checkRepair => 'Check the repair and confirm';

  @override
  String get waitingConfirm =>
      'Waiting for the other side to confirm the repair';

  @override
  String get confirmedFixed => 'Confirmed fixed';

  @override
  String get closedWithoutRepair => 'Closed without a repair';

  @override
  String get repair => 'Repair';

  @override
  String get acknowledgeReport => 'Acknowledge report';

  @override
  String get didRepairWork => 'Did the repair work?';

  @override
  String get fixed => 'Fixed';

  @override
  String get notFixed => 'Not fixed';

  @override
  String get addAfterPhoto => 'Add an after photo';

  @override
  String get addToReportAsUpdate => 'Add to the report as an update';

  @override
  String repairedOn(String date) {
    return 'Repaired $date';
  }

  @override
  String repairedOnCost(String date, String cost) {
    return 'Repaired $date · S\$$cost';
  }

  @override
  String get beforeRepair => 'Before repair';

  @override
  String get afterRepair => 'After repair';

  @override
  String get receipt => 'Receipt';

  @override
  String get couldNotLoadPull => 'Could not load. Pull to refresh the link.';

  @override
  String get statusChanged => 'Status changed';

  @override
  String get repairRecorded => 'Repair recorded';

  @override
  String get repairScheduled => 'Repair scheduled';

  @override
  String get reportedNotFixed => 'Reported not fixed';

  @override
  String costProposal(String summary) {
    return 'Cost proposal: $summary';
  }

  @override
  String get costProposalRejected => 'Cost proposal rejected';

  @override
  String get costProposalWithdrawn => 'Cost proposal withdrawn';

  @override
  String get waitingForLandlord => 'Waiting for the landlord';

  @override
  String get waitingForTenant => 'Waiting for the tenant';

  @override
  String get acceptSplitTitle => 'Accept this split?';

  @override
  String get youAreAgreeingTo => 'You are agreeing to';

  @override
  String get acceptSplitBody =>
      'This becomes the agreement for this repair. Changing it later takes a new proposal that both sides accept.';

  @override
  String get accept => 'Accept';

  @override
  String get notAgreedYet => 'Not agreed yet';

  @override
  String get agreedByBoth => 'Agreed by both sides';

  @override
  String get agreedChangeProposed => 'Agreed, change proposed';

  @override
  String get whoPays => 'Who pays';

  @override
  String get agreed => 'Agreed';

  @override
  String proposedBy(String name) {
    return 'Proposed by $name';
  }

  @override
  String proposedAcceptedBy(String name, String other) {
    return 'Proposed by $name, accepted by $other';
  }

  @override
  String get answerNeeded => 'Your answer is needed';

  @override
  String get waitingForAnswer => 'Waiting for an answer';

  @override
  String partyProposes(String party) {
    return '$party proposes';
  }

  @override
  String partyProposesChange(String party) {
    return '$party proposes a change';
  }

  @override
  String get suggestDifferent => 'Suggest different';

  @override
  String get reject => 'Reject';

  @override
  String get withdrawProposal => 'Withdraw proposal';

  @override
  String get notAgreed => 'Not agreed';

  @override
  String get changeNotAgreed => 'Proposed change not agreed';

  @override
  String rejectedWhatProposed(String name, String proposer) {
    return '$name rejected what $proposer proposed';
  }

  @override
  String get theOtherSide => 'The other side';

  @override
  String get agreeWhoPaysNow =>
      'Agree who arranges this repair and who pays for it now, so it is not an argument at check-out.';

  @override
  String get proposeChange => 'Propose a change';

  @override
  String get makeNewProposal => 'Make a new proposal';

  @override
  String get proposeWhoPays => 'Propose who pays';

  @override
  String get repairCost => 'Repair cost';

  @override
  String get suggestDifferentSplit => 'Suggest a different split';

  @override
  String get whoPaysQuestion => 'Who pays?';

  @override
  String get split => 'Split';

  @override
  String get fromMinorRepairCap => 'From this tenancy\'s minor repair cap';

  @override
  String get landlordPaysAbove => 'Landlord pays anything above this';

  @override
  String get whoArranges => 'Who arranges the repair?';

  @override
  String get why => 'Why?';

  @override
  String get basis => 'Basis';

  @override
  String get whyThisSplit => 'Why this split?';

  @override
  String get explainSentence => 'Explain in a sentence';

  @override
  String get otherSideSees => 'The other side sees this with your proposal';

  @override
  String get clauseOptional => 'Contract clause (optional)';

  @override
  String get clauseHint => 'e.g. Clause 5(c)';

  @override
  String get theyReadCounter => 'They will read your counter-offer as';

  @override
  String get theyRead => 'They will read';

  @override
  String get sendProposal => 'Send proposal';

  @override
  String get rejectProposalTitle => 'Reject this proposal';

  @override
  String get youAreRejecting => 'You are rejecting';

  @override
  String get whyNot => 'Why not?';

  @override
  String get whyNotHint => 'Required. The other side sees this.';

  @override
  String photoOpenFailed(String error) {
    return 'Could not open this photo. $error';
  }

  @override
  String marksSaveFailed(String error) {
    return 'Could not save marks. $error';
  }

  @override
  String redrawMark(int number) {
    return 'Redraw mark $number.';
  }

  @override
  String get markCircleHelp =>
      'Draw around an issue with your finger. Kivilo will smooth it into a clean circle.';

  @override
  String get markArrowHelp =>
      'Draw from open space toward the issue. Tap any existing mark to edit it.';

  @override
  String get markFreehandHelp =>
      'Draw directly over the detail. Your freehand stroke stays exactly where you draw it.';

  @override
  String get markCircle => 'Circle';

  @override
  String get markArrow => 'Arrow';

  @override
  String get markFreehand => 'Freehand';

  @override
  String get undo => 'Undo';

  @override
  String get redo => 'Redo';

  @override
  String markNumber(int number) {
    return 'Mark $number';
  }

  @override
  String marksOfMax(int count) {
    return '$count of 12 marks';
  }

  @override
  String addNoteToMark(int number) {
    return 'Add a note to mark $number';
  }

  @override
  String editMark(int number) {
    return 'Edit mark $number';
  }

  @override
  String get markNoteNew => 'Say what this mark identifies.';

  @override
  String get markNoteEdit =>
      'Update its note, redraw its position, or remove it.';

  @override
  String get markNoteHint => 'For example: hairline crack above socket';

  @override
  String get saveMark => 'Save mark';

  @override
  String get redraw => 'Redraw';

  @override
  String get photoSavedWillUpload =>
      'Photo saved on this phone. Kivilo will upload it when it can.';

  @override
  String get updateNeedsTitle => 'Give the update a title before publishing.';

  @override
  String get updateNeedsChange => 'Add at least one change before publishing.';

  @override
  String get updatePhotosWaiting =>
      'Some photos are still on this phone. Wait for them to upload before publishing.';

  @override
  String get publishUpdateTitle => 'Publish this update?';

  @override
  String get publishUpdateBody =>
      'It cannot be changed afterwards, and the landlord and tenant are asked to acknowledge it.';

  @override
  String get discardUpdateTitle => 'Discard this draft?';

  @override
  String get discardUpdateBody =>
      'Its changes and the photos uploaded to it are deleted. Published updates are not affected.';

  @override
  String get discard => 'Discard';

  @override
  String get updatesIntro =>
      'Record a change after signing, such as a replaced appliance, as a dated update. The signed report stays as it was; the update counts once the landlord and tenant have both acknowledged it.';

  @override
  String get published => 'Published';

  @override
  String get publishedDetail =>
      'Open the report to show it, or to take an acknowledgement in person.';

  @override
  String updateNumberTitle(int number, String title) {
    return 'Update $number: $title';
  }

  @override
  String get startUpdate => 'Start an update';

  @override
  String get resolvedRepairs => 'Resolved repairs';

  @override
  String get resolvedRepairsDetail =>
      'Each can start a change, with its before and after photos.';

  @override
  String get draftUpdate => 'Draft update';

  @override
  String get draftUpdateDetail => 'Nobody else sees it until you publish it.';

  @override
  String get title => 'Title';

  @override
  String get reason => 'Reason';

  @override
  String dateOfChange(String date) {
    return 'Date of the change: $date';
  }

  @override
  String get saveDetails => 'Save details';

  @override
  String get addChange => 'Add a change';

  @override
  String get workingEllipsis => 'Working…';

  @override
  String get publishUpdate => 'Publish update';

  @override
  String get publishFreezes =>
      'Publishing freezes the update and asks the landlord and tenant to acknowledge it.';

  @override
  String fromRepair(String title) {
    return 'From the repair: $title';
  }

  @override
  String photosWaitingUpload(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count photos saved on this phone, waiting to upload',
      one: '1 photo saved on this phone, waiting to upload',
    );
    return '$_temp0';
  }

  @override
  String get choosePhoto => 'Choose photo';

  @override
  String get chooseRoom => 'Choose the room.';

  @override
  String get chooseItemReplaced => 'Choose the item this replaces or removes.';

  @override
  String get nameNewItem => 'Name the new item.';

  @override
  String get editChange => 'Edit change';

  @override
  String get changeAdded => 'Added';

  @override
  String get changeReplaced => 'Replaced';

  @override
  String get changeRemoved => 'Removed';

  @override
  String get itemItChanges => 'Item it changes';

  @override
  String get whichItem => 'Which item?';

  @override
  String get newItem => 'New item';

  @override
  String get newItemHint => 'e.g. Dishwasher';

  @override
  String get makeModelAndSerial => 'Make, model and serial';

  @override
  String get addChangeShort => 'Add change';

  @override
  String get saveChange => 'Save change';

  @override
  String photoPrepareFailed(String error) {
    return 'Could not prepare the photo. $error';
  }

  @override
  String photoAddFailed(String error) {
    return 'Could not add the photo. $error';
  }

  @override
  String get photoSavedUploaded => 'Photo saved and uploaded.';

  @override
  String get photoSavedRetry =>
      'Photo saved on this phone. Kivilo will retry automatically.';

  @override
  String get beforePhotos => 'Before photos';

  @override
  String get afterPhotos => 'After photos';

  @override
  String get addPhotosCamera => 'Add photos with your phone’s camera';

  @override
  String get addPhotosCameraDetail =>
      'Use the full native camera experience, or choose a photo you already took.';

  @override
  String get chooseExistingPhoto => 'Choose existing photo';

  @override
  String get drawSignatureFirst => 'Draw a signature first.';

  @override
  String get uploadBeforeSigning =>
      'Some photos, videos or changes have not uploaded yet. Go back to the rooms and tap Retry uploads before either person signs.';

  @override
  String roleSignature(String role) {
    return '$role signature';
  }

  @override
  String get ownSignatureConfirms =>
      'Your signature confirms that the report you just read records the property as it was handed over.';

  @override
  String get partySignatureConfirms =>
      'Review the agreed inventory with this person before they sign. Their signature confirms the report as shown.';

  @override
  String get useThisSignature => 'Use this signature';

  @override
  String get drawNewOne => 'Draw a new one';

  @override
  String get clearSignature => 'Clear signature';

  @override
  String get saveForNextTime => 'Save for next time';

  @override
  String get saveForNextTimeDetail =>
      'Kept only on this phone, and removed when you sign out.';

  @override
  String get confirmSignature => 'Confirm signature';

  @override
  String get propertyHistory => 'Property history';

  @override
  String get timelineEyebrow => 'PROPERTY TIMELINE';

  @override
  String get timelineDetail =>
      'Signed reports, repairs and agreed costs, newest first.';

  @override
  String get timelineEmpty =>
      'Nothing has been settled here yet. Signed reports and repairs will appear as they happen.';

  @override
  String get amountInvalid => 'Enter a valid SGD amount';

  @override
  String get renewTenancy => 'Renew tenancy';

  @override
  String sameParties(String tenant) {
    return 'Same landlord and tenant · $tenant';
  }

  @override
  String startsOn(String date) {
    return 'Starts $date';
  }

  @override
  String endsOn(String date) {
    return 'Ends $date';
  }

  @override
  String get renewalConfirm =>
      'Confirm these terms with both parties first. This creates a new tenancy and a draft check-in for the same property.';

  @override
  String keepSharingRenewal(String names) {
    return 'Keep sharing this renewal with $names';
  }

  @override
  String get renewalPrivate =>
      'Leave unchecked to keep the new tenancy private.';

  @override
  String get createRenewal => 'Create renewal check-in';

  @override
  String get brandingIntro =>
      'Heads every PDF and shared report you prepare. Landlords and tenants see it; the signed contents of a report never change.';

  @override
  String get logo => 'Logo';

  @override
  String get logoDetail => 'PNG or JPEG, shown at the top left';

  @override
  String get choose => 'Choose';

  @override
  String get replace => 'Replace';

  @override
  String get removeLogo => 'Remove logo';

  @override
  String get yourName => 'Your name';

  @override
  String get agencyName => 'Agency name';

  @override
  String get agencyLicenceOptional => 'Agency licence (optional)';

  @override
  String get ceaOptional => 'Your CEA registration (optional)';

  @override
  String get phoneOptional => 'Phone (optional)';

  @override
  String get partnerPipewell => 'Leaks, blocked drains, water heaters';

  @override
  String get open24Hours => 'Open 24 hours';

  @override
  String get partnerFernvale => 'Burst pipes, toilets, taps and mixers';

  @override
  String get daily8to10 => 'Daily 8am to 10pm';

  @override
  String get partnerHalcyon => 'Lockouts, lock changes, digital locks';

  @override
  String get partnerKeyline => 'Gate locks, key cutting, safes';

  @override
  String get monSat9to7 => 'Mon to Sat 9am to 7pm';

  @override
  String get policeEmergency => 'Police emergency';

  @override
  String get fireAmbulance => 'Fire or ambulance';

  @override
  String get kiviloPartners => 'Kivilo partners';

  @override
  String get kiviloPartnersDetail => 'Plumbers and locksmiths we work with';

  @override
  String get bookingSoon => 'Booking through Kivilo opens soon.';

  @override
  String get guideTitle => 'A handover, in three steps';

  @override
  String get guideDetail => 'Tap a step for a little guidance.';

  @override
  String get guideStep1 => 'Write what you see';

  @override
  String get guideStep1Short => 'Start with the room inventory.';

  @override
  String get guideStep1Body =>
      'Open a room and check its starter items. Add, edit or remove lines to match what you see, and record each item’s condition. On check-out, compare with the agreed check-in beside the inventory.';

  @override
  String get guideStep2 => 'Capture the details';

  @override
  String get guideStep2Short => 'Open an item. Photograph its condition.';

  @override
  String get guideStep2Body =>
      'Open an inventory item to take photos of wear, damage, meter readings and serial labels. Each photo opens for marking and attaches to that item when you save it. Use Room media & walkthrough for room-wide photos or video. Captures stay on your phone until uploaded. Check every item, then review the room; if it has no items, confirm there is nothing to record.';

  @override
  String get guideStep3 => 'Agree and sign';

  @override
  String get guideStep3Short => 'A shared record for both parties.';

  @override
  String get guideStep3Body =>
      'Let all captures finish uploading, then send for signature. Sending freezes the inventory. The landlord and tenant can sign on your phone or through their emailed link. Once both sign, the PDF is ready.';

  @override
  String get handoverTitle => 'Your tenancy in Kivilo';

  @override
  String handoverLoadFailed(String error) {
    return 'Could not load the handover. $error';
  }

  @override
  String get retry => 'Retry';

  @override
  String get handoverAfterSigning =>
      'The tenant handover is available after the tenant signs the check-in.';

  @override
  String get handoverScan =>
      'Scan with your phone and sign in as yourself to see your tenancy and report a problem.';

  @override
  String get handoverQrLabel => 'QR code for the tenant sign-in link';

  @override
  String get handoverNoDefectPeriod =>
      'A move-in defect period has not been enabled for this tenancy. You can still report repairs.';

  @override
  String handoverDefectDeadline(String date) {
    return 'Flag anything that was already present when you moved in by $date (Singapore time).';
  }

  @override
  String get handoverLinkCopied => 'Tenant sign-in link copied';

  @override
  String get handoverCopyLink => 'Copy sign-in link';

  @override
  String get updateTag => 'Update';

  @override
  String openCheckInPhoto(int number) {
    return 'Open check-in photo $number';
  }

  @override
  String get nothingAtCheckIn => 'Nothing recorded in this room at check-in.';

  @override
  String get openFullCheckIn => 'Open the full check-in';

  @override
  String get renewalRemindersFailed =>
      'Renewal reminders could not be loaded. Pull down to try again.';

  @override
  String get renewalDue => 'Renewal due';

  @override
  String get dismissRenewal => 'Dismiss renewal reminder';

  @override
  String tenancyEnds(String tenant, String date) {
    return '$tenant · Tenancy ends $date';
  }

  @override
  String get startRenewal => 'Start renewal';

  @override
  String get notRenewing => 'Not renewing';

  @override
  String get remindWeek => 'Remind me in a week';

  @override
  String get videoLoadFailed =>
      'This video could not be loaded. Check your connection and try again.';

  @override
  String get pause => 'Pause';

  @override
  String get play => 'Play';

  @override
  String get noNotifications => 'No notifications yet.';

  @override
  String get accountChangedPage => 'Account changed. Open this page again.';

  @override
  String get noResponse =>
      'Kivilo did not respond. Check your signal and try again. Anything you took is saved on this phone.';

  @override
  String get uploadingMedia => 'Uploading Kivilo media';

  @override
  String get kiviloMedia => 'Kivilo media';

  @override
  String get signInBeforeFindingPhotos =>
      'Sign in again before adding finding photos.';

  @override
  String get photoDraftDiscarded =>
      'This photo draft was discarded. Discard the local draft to start again.';

  @override
  String get findingSavedReopen =>
      'This finding was saved. Reopen it to add more photos.';

  @override
  String get finishRecoveringCamera =>
      'Finish recovering the previous camera selection before taking another photo.';

  @override
  String get chooseImageFormat =>
      'Choose a JPEG, PNG or WebP photo. Your selection is kept; retry or discard this draft.';

  @override
  String get waitPhotosSaved =>
      'Wait until your photos are saved on this phone.';

  @override
  String get finishFindingPhotos =>
      'Finish marking and uploading the finding photos before saving. Your draft is kept on this phone.';

  @override
  String get connectRetryDiscard =>
      'Connect and retry discarding. Your photos and draft are still saved on this phone.';

  @override
  String get fileMissing =>
      'The file for this photo or video is missing from this phone.';

  @override
  String get inventoryLinkFailed =>
      'Photo uploaded, but its inventory link could not be saved. The photo and its item are still saved on this phone.';

  @override
  String get photoFormatUnsupported =>
      'This photo is in a format Kivilo cannot store. Take it again, or choose a JPEG or PNG.';

  @override
  String get photoStillSaving =>
      'A photo is still being saved on this phone. Keep this draft and retry.';

  @override
  String get photoSelectionRecovery =>
      'A photo selection still needs recovery. Retry or discard this draft before saving.';

  @override
  String get ok => 'OK';

  @override
  String get planFree => 'Free';

  @override
  String get agencyErrPartyAsAgent =>
      'A landlord or tenant cannot be assigned as an agent on their own tenancy.';

  @override
  String get agencyErrAlreadyInTeam =>
      'A tenancy already assigned to a team cannot be moved to another team.';

  @override
  String get agencyErrInvitationPending =>
      'An invitation is already pending. Use Resend invitation if needed.';

  @override
  String get agencyErrChooseLead => 'Choose a responsible lead agent.';

  @override
  String get agencyErrChooseTeam =>
      'Choose a team before assigning team members.';

  @override
  String get agencyErrChooseActive => 'Choose active members of this team.';

  @override
  String get agencyErrChooseSuccessor =>
      'Choose an active team member to take over this person’s properties.';

  @override
  String get agencyErrLastOwner =>
      'Make another active member an owner before removing the last owner.';

  @override
  String get agencyErrOwnerDeletion =>
      'Make another member an owner of each team you own before requesting account deletion.';

  @override
  String get agencyErrOwnerOnly => 'Only a team owner can change ownership.';

  @override
  String get agencyErrLeadIsParty =>
      'The new lead cannot be a landlord or tenant on one of these tenancies.';

  @override
  String get agencyErrInvitationExpired =>
      'This invitation has expired. Ask a team manager to send it again.';

  @override
  String get agencyErrAlreadyJoined =>
      'This person has already joined the team.';

  @override
  String get agencyErrTeamWideAccess =>
      'This person has team-wide access as an owner or manager. Change their team role to remove that access.';

  @override
  String get agencyErrAlreadyMember => 'This person is already a team member.';

  @override
  String get agencyErrMustAccept =>
      'This team member must accept an invitation before being assigned work.';

  @override
  String get agencyErrTeamChanged =>
      'This tenancy’s team changed. Refresh and try again.';

  @override
  String get agencyErrUseRemove =>
      'Use Remove member to remove an active team member.';

  @override
  String get agencyErrWaitAccept =>
      'Wait for the invitation to be accepted before changing this role.';

  @override
  String get showing => 'Showing';

  @override
  String get allMyWork => 'All my work';

  @override
  String get homesIOwn => 'Homes I own';

  @override
  String get whereYouAreTheLandlord => 'Where you are the landlord';

  @override
  String get homesIRent => 'Homes I rent';

  @override
  String get whereYouAreTheTenant => 'Where you are the tenant';

  @override
  String get theseTermsReferToAPreviousAgreement =>
      'These terms refer to a previous agreement. Review the latest file to update them.';

  @override
  String get hideSourceClause => 'Hide source clause';

  @override
  String get showSourceClause => 'Show source clause';

  @override
  String get retake => 'Retake';

  @override
  String get whatShouldTheViewerNotice => 'What should the viewer notice?';

  @override
  String get photoRemoved => 'Photo removed';

  @override
  String get photoDeleted => 'Photo deleted';

  @override
  String get flash => 'Flash';

  @override
  String get switchCamera => 'Switch camera';

  @override
  String get retryCamera => 'Retry camera';

  @override
  String get takeTheReplacementPhoto => 'Take the replacement photo';

  @override
  String get tapAPhotoToMarkItOr => 'Tap a photo to mark it or add a note';

  @override
  String get theLeadAgent => 'the lead agent';

  @override
  String get theResponsibleAgentOrATeamOwner =>
      'the responsible agent or a team owner or manager';

  @override
  String get roomPhotos => 'Room photos';

  @override
  String get takeRoomWidePhotosOrManageExisting =>
      'Take room-wide photos or manage existing ones.';

  @override
  String get takeMorePhotos => 'Take more photos';

  @override
  String get takePhotos => 'Take photos';

  @override
  String get noPhotosOfThisItemYet => 'No photos of this item yet.';

  @override
  String get reviewOpensOnceThisRoomsPhotosAnd =>
      'Review opens once this room’s photos and changes have uploaded. Your media stays saved on this phone while you wait for signal.';

  @override
  String get couldNotOpenThisProperty => 'Could not open this property';

  @override
  String get recentlyDeleted => 'Recently deleted';

  @override
  String get offlineShowingWhatWasLastLoaded =>
      'Offline. Showing what was last loaded.';

  @override
  String get reportsAndDocuments => 'Reports and documents';

  @override
  String get earlierTenancy => 'Earlier tenancy';

  @override
  String get thisTenancysReportsDetailsAndPaperwork =>
      'This tenancy’s reports, details and paperwork';

  @override
  String get more => 'More';

  @override
  String get whatHappenedHereOverTheYearsReports =>
      'What happened here over the years: reports, updates, repairs';

  @override
  String get changeLog => 'Change log';

  @override
  String get whoChangedWhatInKiviloAndWhen =>
      'Who changed what in Kivilo, and when';

  @override
  String get manageWhoCanWorkOnThisTenancy =>
      'Manage who can work on this tenancy';

  @override
  String get restoreOrDeleteProperty => 'Restore or delete property';

  @override
  String get archiveOrDeleteProperty => 'Archive or delete property';

  @override
  String get returnItToActiveWorkOrMove =>
      'Return it to active work or move it to trash';

  @override
  String get returnItToActiveProperties => 'Return it to active properties';

  @override
  String get removeItFromActiveWorkOrMove =>
      'Remove it from active work or move it to trash';

  @override
  String get kiviloEmailsThemAShortIdentityForm =>
      'Kivilo emails them a short identity form, screens them against the sanctions and PEP lists, and keeps the record for you. CEA requires this before the tenancy is signed.';

  @override
  String get verify => 'Verify';

  @override
  String get checkOutLabel => 'check-out';

  @override
  String get checkInLabel => 'check-in';

  @override
  String get tenancyDetails => 'Tenancy details';

  @override
  String get landlordEmailNotProvided => 'Landlord email not provided';

  @override
  String get tenantEmailNotProvided => 'Tenant email not provided';

  @override
  String get peopleDatesRentAndDeposit => 'People, dates, rent and deposit';

  @override
  String get documents => 'Documents';

  @override
  String get tenancyAgreementAndSupportingFiles =>
      'Tenancy agreement and supporting files';

  @override
  String get editPropertyAsset => 'Edit property asset';

  @override
  String get retireAsset => 'Retire asset';

  @override
  String get retireThisAsset => 'Retire this asset?';

  @override
  String get couldNotLoadRepairsAndAssets =>
      'Could not load repairs and assets';

  @override
  String get request => 'request';

  @override
  String get requests => 'requests';

  @override
  String get opening => 'Opening…';

  @override
  String get reviewRepairTerms => 'Review repair terms';

  @override
  String get noMaintenanceReported => 'No maintenance reported';

  @override
  String get theUpdateIsDownloadedAndWillTake =>
      'The update is downloaded and will take effect the next time Kivilo starts. You can keep working now.';

  @override
  String get aKiviloUpdateIsAvailableDownloadIt =>
      'A Kivilo update is available. Download it now or keep working and update later.';

  @override
  String get labelContinue => 'Continue';

  @override
  String get notNow => 'Not now';

  @override
  String get theResponsibleAgentOrATeamOwnerLabel =>
      'the responsible agent or a team owner or manager for every tenancy here';

  @override
  String get propertyActions => 'Property actions';

  @override
  String get tenancy => 'tenancy';

  @override
  String get tenancies => 'tenancies';

  @override
  String get inspectionLabel => 'inspection';

  @override
  String get inspections => 'inspections';

  @override
  String get photoWord => 'photo';

  @override
  String get photosLabel => 'photos';

  @override
  String get propertyRecovery => 'Property recovery';

  @override
  String get takeSeveralPhotosThenMarkThemOr =>
      'Take several photos, then mark them or add notes. Originals are always kept.';

  @override
  String get gallery => 'Gallery';

  @override
  String get resume => 'Resume';

  @override
  String get mark => 'Mark';

  @override
  String get deletePhoto => 'Delete photo';

  @override
  String get deleteFinding => 'Delete finding';

  @override
  String get couldNotOpenThisRenewal => 'Could not open this renewal';

  @override
  String get startWithTheRoomsFromTheLast =>
      'Start with the rooms from the last check-in';

  @override
  String get namesOnlyTheNewCheckInRecords =>
      'Names only; the new check-in records its own condition.';

  @override
  String get whereYouWork => 'Where you work';

  @override
  String get loadingLabel => 'Loading…';

  @override
  String get notChosenYet => 'Not chosen yet';

  @override
  String get member => 'member';

  @override
  String get members => 'members';

  @override
  String get createOrJoinTeam => 'Create or join a team';

  @override
  String get addAnotherTeam => 'Add another team';

  @override
  String get couldNotLoadTeamsTapToTry =>
      'Could not load teams. Tap to try again.';

  @override
  String get invitation => 'invitation';

  @override
  String get invitations => 'invitations';

  @override
  String get createATeamOrAcceptAnInvitation =>
      'Create a team or accept an invitation';

  @override
  String get personalReportBranding => 'Personal report branding';

  @override
  String get usedForPropertiesOutsideYourTeams =>
      'Used for properties outside your teams.';

  @override
  String get yourActivePropertyAllowance => 'Your active property allowance.';

  @override
  String get howAHandoverWorks => 'How a handover works';

  @override
  String get captureWriteTheInventoryThenSign =>
      'Capture, write the inventory, then sign';

  @override
  String get termsOfService => 'Terms of service';

  @override
  String get theTermsForUsingKivilo => 'The terms for using Kivilo';

  @override
  String get anAppleSubscriptionContinuesUntilYouCancel =>
      'An Apple subscription continues until you cancel it in your Apple Account. Deleting your Kivilo account does not cancel it.';

  @override
  String get manageAppStoreSubscriptions => 'Manage App Store subscriptions';

  @override
  String get couldNotLoadProperties => 'Could not load properties';

  @override
  String get showAllMyWork => 'Show all my work';

  @override
  String get yourPropertiesAndTheirCurrentStatus =>
      'Your properties and their current status.';

  @override
  String get searchProperties => 'Search properties';

  @override
  String get addressTenantOrStage => 'Address, tenant or stage';

  @override
  String get property => 'property';

  @override
  String get properties => 'properties';

  @override
  String get found => ' found';

  @override
  String get nothingInRecentlyDeleted => 'Nothing in Recently deleted';

  @override
  String get noArchivedProperties => 'No archived properties';

  @override
  String get noMatchingProperties => 'No matching properties';

  @override
  String get tryAnotherAddressOrTenantOrChange =>
      'Try another address or tenant, or change your filters.';

  @override
  String get plansBilling => 'Plans & billing';

  @override
  String get seat => 'seat';

  @override
  String get seats => 'seats';

  @override
  String get accessUntil => 'Access until';

  @override
  String get currentPeriodEnds => 'Current period ends';

  @override
  String get askYourTeamOwnerOrManagerAbout =>
      'Ask your team owner or manager about this plan.';

  @override
  String get thisPlanWasPurchasedOnTheKivilo =>
      'This plan was purchased on the Kivilo website. You can use it in the app.';

  @override
  String get proForYourPersonalWork => 'Pro for your personal work';

  @override
  String get yourAppleAccountCanSubscribeForOne =>
      'Your Apple Account can subscribe for one team, with up to 20 seats, alongside your Personal plan.';

  @override
  String get seatsLabel => 'Seats';

  @override
  String get moreSeatsTakeEffectImmediatelyFewerSeats =>
      'More seats take effect immediately. Fewer seats take effect at renewal. Apple confirms the price and timing before you agree.';

  @override
  String get aSeatChangeReplacesThisSubscriptionImmediately =>
      'A seat change replaces this subscription immediately. Google Play credits the remaining time and confirms your next payment date before you agree.';

  @override
  String get restorePurchases => 'Restore purchases';

  @override
  String get paymentIsChargedToYourAppleAccount =>
      'Payment is charged to your Apple Account when you confirm. Cancel in App Store subscriptions at least 24 hours before renewal to avoid the next charge. Deleting Kivilo or its account does not cancel an Apple subscription.';

  @override
  String get termsOfUse => 'Terms of Use';

  @override
  String get couldNotLoadNotifications => 'Could not load notifications';

  @override
  String get noNotificationsYet => 'No notifications yet';

  @override
  String get repairTerms => 'Repair terms';

  @override
  String get couldNotOpenThisAgreement => 'Could not open this agreement';

  @override
  String get checkTheClauseAgainstTheAgreementBefore =>
      'Check the clause against the agreement before confirming the repair terms.';

  @override
  String get openAgreement => 'Open agreement';

  @override
  String get clausesToReview => 'Clauses to review';

  @override
  String get selectAClauseToFillInThe =>
      'Select a clause to fill in the details below';

  @override
  String get noClauseWasFoundInTheReadable =>
      'No clause was found in the readable text. Open the agreement and enter the source clause below.';

  @override
  String get sourcePage => 'Source page';

  @override
  String get clauseText => 'Clause text';

  @override
  String get repairRule => 'Repair rule';

  @override
  String get firstAmount => 'First amount';

  @override
  String get anotherRule => 'Another rule';

  @override
  String get tenantPaysTheFirst => 'Tenant pays the first';

  @override
  String get explainTheRepairRule => 'Explain the repair rule';

  @override
  String get notesAndExceptionsOptional => 'Notes and exceptions (optional)';

  @override
  String get confirmRepairTerms => 'Confirm repair terms';

  @override
  String get somethingElse => 'Something else';

  @override
  String get itemOptional => 'Item (optional)';

  @override
  String get whichItemOptional => 'Which item? (optional)';

  @override
  String get forExampleToiletBowl => 'For example, toilet bowl';

  @override
  String get restored => 'Restored.';

  @override
  String get everyChangeAndDeletionWithWhoMade =>
      'Every change and deletion, with who made it. Deleted rooms, lines, photos and findings can be restored for 30 days.';

  @override
  String get allChanges => 'All changes';

  @override
  String get deletions => 'Deletions';

  @override
  String get offlineShowingPreviouslyLoadedHistory =>
      'Offline. Showing previously loaded history.';

  @override
  String get historyIsRecordedFrom23October2026 =>
      'History is recorded from 23 October 2026.';

  @override
  String get nothingHasBeenDeleted => 'Nothing has been deleted.';

  @override
  String get noChangesRecordedYet => 'No changes recorded yet.';

  @override
  String get restoredLabel => 'Restored';

  @override
  String get restoring => 'Restoring…';

  @override
  String get restore => 'Restore';

  @override
  String get thisRemovesItFromTheRoomAnd =>
      'This removes it from the room and any item it is attached to. You can restore it from the property’s Change log for 30 days.';

  @override
  String get line => 'line';

  @override
  String get lines => 'lines';

  @override
  String get setCondition => 'Set condition';

  @override
  String get thisRemovesTheLineFromTheInventory =>
      'This removes the line from the inventory. You can restore it from the property’s Change log for 30 days.';

  @override
  String get somePhotosOrChangesInThisRoom =>
      'Some photos or changes in this room have not uploaded yet. Open the item or Room photos to finish any photo marks and retry uploads before continuing.';

  @override
  String get itsPhotosVideosAndInventoryWillBe =>
      'Its photos, videos and inventory will be removed. You can restore the room from the property’s Change log for 30 days.';

  @override
  String get couldNotOpenThisRoom => 'Could not open this room';

  @override
  String get select => 'Select';

  @override
  String get tapLinesToSelectThem => 'Tap lines to select them';

  @override
  String get noItemsRecordedLabel => 'No items recorded';

  @override
  String get addAnItemToRecordItsCondition =>
      'Add an item to record its condition and photos.';

  @override
  String get noPhotosOrVideosRecorded => 'No photos or videos recorded';

  @override
  String get checkEveryItemAgainstThePhotosYour =>
      'Check every item against the photos. Your review makes this room ready for the report.';

  @override
  String get worthCheckingBeforeYouReview => 'Worth checking before you review';

  @override
  String get thisInventoryIsFixedForSigningYou =>
      'This inventory is fixed for signing. You can still view its photos and videos.';

  @override
  String get duplicate => 'Duplicate';

  @override
  String get couldNotOpenThisRepair => 'Could not open this repair';

  @override
  String get usedWithYourNameOnReportsFor =>
      'Used with your name on reports for personal properties. Team properties use that team’s branding.';

  @override
  String get officePhoneOptional => 'Office phone (optional)';

  @override
  String get editReportBranding => 'Edit report branding';

  @override
  String get aTeamOwner => 'a team owner';

  @override
  String get aTeamOwnerOrManager => 'a team owner or manager';

  @override
  String get teamDetails => 'Team details';

  @override
  String get theTeamIdentityShownOnItsReports =>
      'The team identity shown on its reports.';

  @override
  String get addAgencyLicenceAndLogo => 'Add agency licence and logo';

  @override
  String get propertyAssignments => 'Property assignments';

  @override
  String get couldNotLoadTheTimeline => 'Could not load the timeline';

  @override
  String get chooseAProperty => 'Choose a property';

  @override
  String get couldNotLoadYourProperties => 'Could not load your properties';

  @override
  String get search => 'Search';

  @override
  String get addressPostalCodeOrLastTenant =>
      'Address, postal code or last tenant';

  @override
  String get noPropertyMatches => 'No property matches.';

  @override
  String get paymentProof => 'Payment proof';

  @override
  String get requestAnotherDocument => 'Request another document';

  @override
  String get askTheTenantForAnOptionalSupporting =>
      'Ask the tenant for an optional supporting file.';

  @override
  String get document => 'Document';

  @override
  String get requesting => 'Requesting…';

  @override
  String get requestLabel => 'Request';

  @override
  String get photoSavedOnThisPhoneItWill =>
      'Photo saved on this phone. It will upload when you reconnect.';

  @override
  String get couldNotLoadDocuments => 'Could not load documents';

  @override
  String get hideOtherDocuments => 'Hide other documents';

  @override
  String get otherDocuments => 'Other documents';

  @override
  String get optionalSupportingFilesForThisTenancy =>
      'Optional supporting files for this tenancy';

  @override
  String get noOtherDocumentsRequested => 'No other documents requested.';

  @override
  String get privateToTheTenantLandlordAndAgents =>
      'Private to the tenant, landlord and agents with access to this tenancy.';

  @override
  String get tenancyAgreement => 'Tenancy agreement';

  @override
  String get keepTheSignedAgreementWithThisProperty =>
      'Keep the signed agreement with this property.';

  @override
  String get yourAgreementAndReviewedRepairTerms =>
      'Your agreement and reviewed repair terms.';

  @override
  String get yourAgreementForThisTenancy => 'Your agreement for this tenancy.';

  @override
  String get currentAgreement => 'Current agreement';

  @override
  String get hidePreviousAgreements => 'Hide previous agreements';

  @override
  String get previousAgreements => 'Previous agreements';

  @override
  String get uploadPdfInBrowser => 'Upload PDF in browser';

  @override
  String get reviewMaintenanceClause => 'Review maintenance clause';

  @override
  String get retryUpload => 'Retry upload';

  @override
  String get uploadTheRequestedDocumentBelow =>
      'Upload the requested document below.';

  @override
  String get waitingForTheTenantToUpload => 'Waiting for the tenant to upload';

  @override
  String get setUpThePropertyTheTenancyAnd =>
      'Set up the property, the tenancy and its rooms.';

  @override
  String get aNewTenancyStaysInThePropertys =>
      'A new tenancy keeps the same team or stays Personal.';

  @override
  String get newPropertyLabel => 'New property';

  @override
  String get existingProperty => 'Existing property';

  @override
  String get findTheAddressOptional => 'Find the address (optional)';

  @override
  String get postalCodeBuildingOrStreet => 'Postal code, building or street';

  @override
  String get buildingOrStreetAreaAndCity => 'Building or street, area and city';

  @override
  String get condominium => 'Condominium';

  @override
  String get condominiumServicedResidenceOrApartment =>
      'Condominium, serviced residence or apartment';

  @override
  String get roomsStartWithEditableInventoryRowsSuited =>
      'Rooms start with editable inventory rows suited to this furnishing level.';

  @override
  String get partiallyFurnished => 'Partially furnished';

  @override
  String get unfurnished => 'Unfurnished';

  @override
  String get sameLandlordAsLastTime => 'Same landlord as last time';

  @override
  String get chooseFromYourContacts => 'Choose from your contacts';

  @override
  String get verifyBothPartiesCea => 'Verify both parties (CEA)';

  @override
  String get eachStartsWithStandardLinesYouCan =>
      'Each starts with standard lines you can edit';

  @override
  String get namesOnlyThisCheckInRecordsIts =>
      'Names only; this check-in records its own condition';

  @override
  String get bedrooms => 'Bedrooms';

  @override
  String get bathrooms => 'Bathrooms';

  @override
  String get anotherRoomOptional => 'Another room (optional)';

  @override
  String get forExampleStudy => 'For example, study';

  @override
  String get noRoomsYetYouCanAddThem =>
      'No rooms yet. You can add them after this.';

  @override
  String get roomLabel => 'room';

  @override
  String get rooms => 'rooms';

  @override
  String get checkingForPhotosOnThisPhone =>
      'Checking for photos on this phone…';

  @override
  String get deleteChange => 'Delete change';

  @override
  String get suggestAChange => 'Suggest a change';

  @override
  String get chooseTheLandlord => 'Choose the landlord';

  @override
  String get chooseTheTenant => 'Choose the tenant';

  @override
  String get couldNotLoadYourContacts => 'Could not load your contacts';

  @override
  String get noContactsYet => 'No contacts yet';

  @override
  String get nameOrEmail => 'Name or email';

  @override
  String get noContactMatches => 'No contact matches.';

  @override
  String get and => ' and ';

  @override
  String get singapore => 'Singapore';

  @override
  String get malaysia => 'Malaysia';

  @override
  String get whereDoYouWork => 'Where do you work?';

  @override
  String get newPropertiesUseThatCountrysAddressesAnd =>
      'New properties use that country\'s addresses and currency. You can change this later in Account.';

  @override
  String get newPropertiesAreMadeInThisCountry =>
      'New properties are made in this country. Properties you already have keep theirs.';

  @override
  String get couldNotLoadYourHomes => 'Could not load your homes';

  @override
  String get reportsYouAgreedRepairsAndThePeople =>
      'Reports you agreed, repairs and the people involved.';

  @override
  String get noHomesWhereYouAreTheLandlord =>
      'No homes where you are the landlord.';

  @override
  String get noHomesWhereYouAreTheTenant =>
      'No homes where you are the tenant.';

  @override
  String get andItsAgent => 'and its agent';

  @override
  String get saveTenancyChanges => 'Save tenancy changes?';

  @override
  String get theseDetailsIdentifyTheTenancyAndIts =>
      'These details identify the tenancy and its signing parties. Check them carefully before saving.';

  @override
  String get theAddressAndTypePrintedOnThe =>
      'The address and type printed on the report';

  @override
  String get unitOptional => 'Unit (optional)';

  @override
  String get postcode => 'Postcode';

  @override
  String get propertyType => 'Property type';

  @override
  String get condominiumOrApartment => 'Condominium or apartment';

  @override
  String get addAnEmailSoEachPartyCan =>
      'Add an email so each party can receive and sign the report';

  @override
  String get landlordEmailOptional => 'Landlord email (optional)';

  @override
  String get notProvided => 'Not provided';

  @override
  String get tenantEmailOptional => 'Tenant email (optional)';

  @override
  String get openThisOnTheKiviloWebsite => 'Open this on the Kivilo website.';

  @override
  String get couldNotLoadYourTasks => 'Could not load your tasks';

  @override
  String get nothingHereNow => 'Nothing here now';

  @override
  String get thereIsMoreThanOneScreenOf =>
      'There is more than one screen of work. Finish some of these, or open Properties to see every record.';

  @override
  String get continueTheCheckOut => 'Continue the check-out';

  @override
  String get continueTheCheckIn => 'Continue the check-in';

  @override
  String get tasksForYourProperties => 'Tasks for your properties.';

  @override
  String get tasksForYourRentedHomes => 'Tasks for your rented homes.';

  @override
  String get yourTasksUpdatesAndUpcomingDeadlines =>
      'Your tasks, updates and upcoming deadlines.';

  @override
  String get offlineShowingTasksAsTheyWereLast =>
      'Offline. Showing tasks as they were last loaded; some may already be done.';

  @override
  String get checkingForUpdates => 'Checking for updates…';

  @override
  String get nothingNeedsYourActionRightNow =>
      'Nothing needs your action right now.';

  @override
  String get continueWhereYouLeftOff => 'Continue where you left off';

  @override
  String get clientChecksKycCdd => 'Client checks (KYC/CDD)';

  @override
  String get verifyClientsKycCdd => 'Verify clients (KYC/CDD)';

  @override
  String get yourFirstHandover => 'Your first handover';

  @override
  String get greatHandoversStartWithAClearRecord =>
      'Great handovers start with a clear record.';

  @override
  String get addThePropertyAndTenancyWellGuide =>
      'Check in at move-in, or check out at move-out. You can start with either visit.';

  @override
  String get youreAllCaughtUp => 'You’re all caught up';

  @override
  String get nothingIsWaitingOnYouOrAnyone =>
      'Nothing is waiting on you or anyone else here.';

  @override
  String get somePhotosOrChangesHaveNotUploaded =>
      'Some photos or changes have not uploaded yet. Open the rooms and tap Retry uploads before sending for signature.';

  @override
  String get remindersSentToThePartiesWithAn =>
      'Reminders sent to the parties with an email address';

  @override
  String get confirmNoChanges => 'Confirm no changes?';

  @override
  String get youAreConfirmingThatTheCheckOut =>
      'You are confirming that the check-out matches the agreed check-in, with no damage, missing items or other changes to record. Both parties will see this in the report.';

  @override
  String get confirmNoChangesLabel => 'Confirm no changes';

  @override
  String get couldNotOpenThisInspection => 'Could not open this inspection';

  @override
  String get waitingForSignatures => 'Waiting for signatures.';

  @override
  String get readyToSendForSignature => 'Ready to send for signature.';

  @override
  String get checkTheInventoryAgainstYourPhotosThen =>
      'Check the inventory against your photos, then mark each room reviewed.';

  @override
  String get openRoom => 'Open room';

  @override
  String get changesAtCheckOut => 'Changes at check-out';

  @override
  String get recordAnythingThatDiffersFromTheAgreed =>
      'Record anything that differs from the agreed check-in.';

  @override
  String get changeLabel => 'change';

  @override
  String get changes => 'changes';

  @override
  String get nothingRecordedYet => 'Nothing recorded yet';

  @override
  String get addDamageWearMissingItemsOrImprovements =>
      'Add damage, wear, missing items or improvements. If there are no changes, confirm that below.';

  @override
  String get addAnotherChange => 'Add another change';

  @override
  String get partiesNotVerifiedYet => 'Parties not verified yet';

  @override
  String get ceaRequiresDueDiligenceOnTheLandlord =>
      'CEA requires due diligence on the landlord and tenant before the tenancy is signed.';

  @override
  String get sendForSignatureAnyway => 'Send for signature anyway';

  @override
  String get sendReminders => 'Send reminders';

  @override
  String estimatedRepairCost(String currency) {
    return 'Estimated cost ($currency)';
  }

  @override
  String previousTenantName(String name) {
    return 'Last tenant: $name';
  }

  @override
  String get selectPropertyFirst =>
      'Choose the property, or switch to New property.';

  @override
  String get malaysianPostcodeLength => 'A Malaysian postcode has 5 digits';

  @override
  String get chooseFurnishingLevel => 'Choose the property furnishing level.';

  @override
  String get choosePlan => 'Choose a plan';

  @override
  String storePlanUnavailable(String store) {
    return '$store subscriptions are not available for this plan yet.';
  }

  @override
  String get reportTenancyPeriod => 'Tenancy Period';

  @override
  String get tenancyLength => 'Tenancy length';

  @override
  String get chooseTenancyLength => 'Choose tenancy length';

  @override
  String get oneYear => '1 year';

  @override
  String get twoYears => '2 years';

  @override
  String get threeYears => '3 years';

  @override
  String get customDates => 'Custom dates';

  @override
  String get chooseWhatToShow => 'Choose what to show';

  @override
  String get yourHomesGroup => 'Your homes';

  @override
  String get myWork => 'My work';
}
