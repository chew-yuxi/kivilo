import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_th.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('th'),
    Locale('zh'),
  ];

  /// No description provided for @settingsVersion.
  ///
  /// In en, this message translates to:
  /// **'Version {version} ({build})'**
  String settingsVersion(String version, String build);

  /// No description provided for @settingsVersionPatch.
  ///
  /// In en, this message translates to:
  /// **'{version} · Patch {patch}'**
  String settingsVersionPatch(String version, int patch);

  /// No description provided for @settingsDeletionDrawerTitle.
  ///
  /// In en, this message translates to:
  /// **'Request account deletion?'**
  String get settingsDeletionDrawerTitle;

  /// No description provided for @settingsDeletionDrawerBody.
  ///
  /// In en, this message translates to:
  /// **'We will confirm your request and complete eligible deletion within 30 days. Inspection and report records may need to be retained under the applicable tenancy record retention policy.'**
  String get settingsDeletionDrawerBody;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @settingsRequestDeletion.
  ///
  /// In en, this message translates to:
  /// **'Request deletion'**
  String get settingsRequestDeletion;

  /// No description provided for @settingsSignOutFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not sign out. {error}'**
  String settingsSignOutFailed(String error);

  /// No description provided for @settingsLicence.
  ///
  /// In en, this message translates to:
  /// **'Licence {number}'**
  String settingsLicence(String number);

  /// No description provided for @settingsCea.
  ///
  /// In en, this message translates to:
  /// **'CEA {number}'**
  String settingsCea(String number);

  /// No description provided for @settingsAddAgency.
  ///
  /// In en, this message translates to:
  /// **'Add your agency'**
  String get settingsAddAgency;

  /// No description provided for @couldNotLoad.
  ///
  /// In en, this message translates to:
  /// **'Could not load: {error}'**
  String couldNotLoad(String error);

  /// No description provided for @settingsBrandingEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your name and logo at the top of PDF reports'**
  String get settingsBrandingEmpty;

  /// No description provided for @settingsBrandingSet.
  ///
  /// In en, this message translates to:
  /// **'Shown on your PDF and shared reports'**
  String get settingsBrandingSet;

  /// No description provided for @settingsPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan'**
  String get settingsPlan;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading'**
  String get loading;

  /// No description provided for @settingsPlanUsage.
  ///
  /// In en, this message translates to:
  /// **'{used} of {limit, plural, =1{1 active property} other{{limit} active properties}} in use'**
  String settingsPlanUsage(int used, int limit);

  /// No description provided for @settingsAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get settingsAccount;

  /// No description provided for @settingsYourAccount.
  ///
  /// In en, this message translates to:
  /// **'Your account'**
  String get settingsYourAccount;

  /// No description provided for @settingsSignedIn.
  ///
  /// In en, this message translates to:
  /// **'Signed in to Kivilo'**
  String get settingsSignedIn;

  /// No description provided for @settingsForAgents.
  ///
  /// In en, this message translates to:
  /// **'For agents'**
  String get settingsForAgents;

  /// No description provided for @settingsStartCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Start a check-in'**
  String get settingsStartCheckIn;

  /// No description provided for @settingsStartCheckInDetail.
  ///
  /// In en, this message translates to:
  /// **'Write a room-by-room report of a property'**
  String get settingsStartCheckInDetail;

  /// No description provided for @settingsWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Workspace'**
  String get settingsWorkspace;

  /// No description provided for @settingsTeam.
  ///
  /// In en, this message translates to:
  /// **'Team'**
  String get settingsTeam;

  /// No description provided for @settingsTeamDetail.
  ///
  /// In en, this message translates to:
  /// **'Members, invitations and assigned work'**
  String get settingsTeamDetail;

  /// No description provided for @settingsProperties.
  ///
  /// In en, this message translates to:
  /// **'Properties'**
  String get settingsProperties;

  /// No description provided for @settingsPropertiesDetail.
  ///
  /// In en, this message translates to:
  /// **'Property settings, archived properties and trash'**
  String get settingsPropertiesDetail;

  /// No description provided for @settingsBranding.
  ///
  /// In en, this message translates to:
  /// **'Report branding'**
  String get settingsBranding;

  /// No description provided for @settingsBrandingDetail.
  ///
  /// In en, this message translates to:
  /// **'Your agency on PDF and shared reports.'**
  String get settingsBrandingDetail;

  /// No description provided for @settingsPlanDetail.
  ///
  /// In en, this message translates to:
  /// **'How many properties you can work at once.'**
  String get settingsPlanDetail;

  /// No description provided for @settingsPrivacySupport.
  ///
  /// In en, this message translates to:
  /// **'Privacy & support'**
  String get settingsPrivacySupport;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get settingsLanguage;

  /// No description provided for @settingsPhoneLanguage.
  ///
  /// In en, this message translates to:
  /// **'Phone language'**
  String get settingsPhoneLanguage;

  /// No description provided for @settingsPrivacyPolicy.
  ///
  /// In en, this message translates to:
  /// **'Privacy policy'**
  String get settingsPrivacyPolicy;

  /// No description provided for @settingsPrivacyPolicyDetail.
  ///
  /// In en, this message translates to:
  /// **'How Kivilo handles your data'**
  String get settingsPrivacyPolicyDetail;

  /// No description provided for @settingsHelp.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get settingsHelp;

  /// No description provided for @settingsHelpDetail.
  ///
  /// In en, this message translates to:
  /// **'Get help with an inspection or your account'**
  String get settingsHelpDetail;

  /// No description provided for @settingsYourData.
  ///
  /// In en, this message translates to:
  /// **'Your data'**
  String get settingsYourData;

  /// No description provided for @settingsYourDataDetail.
  ///
  /// In en, this message translates to:
  /// **'Manage your account and deletion request.'**
  String get settingsYourDataDetail;

  /// No description provided for @settingsAccountDeletion.
  ///
  /// In en, this message translates to:
  /// **'Account deletion'**
  String get settingsAccountDeletion;

  /// No description provided for @settingsDeletionAim.
  ///
  /// In en, this message translates to:
  /// **'We aim to complete eligible deletion within 30 days of your request.'**
  String get settingsDeletionAim;

  /// No description provided for @settingsDeletionDates.
  ///
  /// In en, this message translates to:
  /// **'Requested {requested} · Due {due}'**
  String settingsDeletionDates(String requested, String due);

  /// No description provided for @settingsDeletionDatesCompleted.
  ///
  /// In en, this message translates to:
  /// **'Requested {requested} · Due {due} · Completed {completed}'**
  String settingsDeletionDatesCompleted(
    String requested,
    String due,
    String completed,
  );

  /// No description provided for @sending.
  ///
  /// In en, this message translates to:
  /// **'Sending…'**
  String get sending;

  /// No description provided for @settingsRequestAccountDeletion.
  ///
  /// In en, this message translates to:
  /// **'Request account deletion'**
  String get settingsRequestAccountDeletion;

  /// No description provided for @settingsDeletionLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load your deletion request. {error}'**
  String settingsDeletionLoadFailed(String error);

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @settingsSignOutDetail.
  ///
  /// In en, this message translates to:
  /// **'Your saved signature is removed from this phone'**
  String get settingsSignOutDetail;

  /// No description provided for @unknown.
  ///
  /// In en, this message translates to:
  /// **'unknown'**
  String get unknown;

  /// No description provided for @settingsDeletionCompleted.
  ///
  /// In en, this message translates to:
  /// **'Request completed'**
  String get settingsDeletionCompleted;

  /// No description provided for @settingsDeletionInProgress.
  ///
  /// In en, this message translates to:
  /// **'Request in progress'**
  String get settingsDeletionInProgress;

  /// No description provided for @settingsDeletionReceived.
  ///
  /// In en, this message translates to:
  /// **'Request received'**
  String get settingsDeletionReceived;

  /// An intl DateFormat pattern for a date such as 12 Oct 2026.
  ///
  /// In en, this message translates to:
  /// **'d MMM y'**
  String get dateShortPattern;

  /// An intl DateFormat pattern for a month heading such as October 2026.
  ///
  /// In en, this message translates to:
  /// **'MMMM y'**
  String get dateMonthYearPattern;

  /// No description provided for @checkIn.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get checkIn;

  /// No description provided for @checkOut.
  ///
  /// In en, this message translates to:
  /// **'Check-out'**
  String get checkOut;

  /// No description provided for @roomNotStarted.
  ///
  /// In en, this message translates to:
  /// **'Not started'**
  String get roomNotStarted;

  /// No description provided for @roomNeedsReview.
  ///
  /// In en, this message translates to:
  /// **'Needs review'**
  String get roomNeedsReview;

  /// No description provided for @roomReviewed.
  ///
  /// In en, this message translates to:
  /// **'Reviewed'**
  String get roomReviewed;

  /// No description provided for @roomCapturing.
  ///
  /// In en, this message translates to:
  /// **'Capturing'**
  String get roomCapturing;

  /// No description provided for @videoCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 video} other{{count} videos}}'**
  String videoCount(int count);

  /// No description provided for @photoCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 photo} other{{count} photos}}'**
  String photoCount(int count);

  /// No description provided for @roomNothingCaptured.
  ///
  /// In en, this message translates to:
  /// **'Nothing captured yet'**
  String get roomNothingCaptured;

  /// Joins a short list, such as 2 videos, 5 photos.
  ///
  /// In en, this message translates to:
  /// **', '**
  String get listSeparator;

  /// No description provided for @roomSummaryWithItems.
  ///
  /// In en, this message translates to:
  /// **'{summary} · {count, plural, =1{1 item} other{{count} items}}'**
  String roomSummaryWithItems(String summary, int count);

  /// No description provided for @errorNoConnection.
  ///
  /// In en, this message translates to:
  /// **'No connection. Anything you took is saved on this phone, so try again when you have signal.'**
  String get errorNoConnection;

  /// No description provided for @errorSignedOut.
  ///
  /// In en, this message translates to:
  /// **'You have been signed out. Please sign in again.'**
  String get errorSignedOut;

  /// No description provided for @errorNotFound.
  ///
  /// In en, this message translates to:
  /// **'This could not be found, or your account cannot open it.'**
  String get errorNotFound;

  /// No description provided for @errorReportFrozen.
  ///
  /// In en, this message translates to:
  /// **'This report has been sent for signature and cannot be changed.'**
  String get errorReportFrozen;

  /// No description provided for @errorInvalidRequest.
  ///
  /// In en, this message translates to:
  /// **'Please check the details and try again.'**
  String get errorInvalidRequest;

  /// No description provided for @errorReviewIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Each room needs at least one item and a review first.'**
  String get errorReviewIncomplete;

  /// No description provided for @errorAssessmentReviewIncomplete.
  ///
  /// In en, this message translates to:
  /// **'Open and confirm every finding before publishing the assessment.'**
  String get errorAssessmentReviewIncomplete;

  /// No description provided for @errorNoDamageUnconfirmed.
  ///
  /// In en, this message translates to:
  /// **'Add a finding, or confirm that no damage was found, before publishing.'**
  String get errorNoDamageUnconfirmed;

  /// No description provided for @errorInvalidState.
  ///
  /// In en, this message translates to:
  /// **'This cannot be done at this stage of the report.'**
  String get errorInvalidState;

  /// No description provided for @errorCaptureConflict.
  ///
  /// In en, this message translates to:
  /// **'This photo or video clashes with one already in the report. Refresh the room and check it.'**
  String get errorCaptureConflict;

  /// No description provided for @errorCaptureMissing.
  ///
  /// In en, this message translates to:
  /// **'The upload did not finish. The file is still on this phone, so try again.'**
  String get errorCaptureMissing;

  /// No description provided for @errorEvidenceMissing.
  ///
  /// In en, this message translates to:
  /// **'The upload did not finish. The photo is still on this phone, so try again.'**
  String get errorEvidenceMissing;

  /// No description provided for @errorPlanLimit.
  ///
  /// In en, this message translates to:
  /// **'Your plan\'s active properties are all in use. A property stops counting when its check-out is signed or its tenancy ends.'**
  String get errorPlanLimit;

  /// No description provided for @errorMaintenanceConflict.
  ///
  /// In en, this message translates to:
  /// **'Someone already updated this repair. Refresh and check the timeline.'**
  String get errorMaintenanceConflict;

  /// No description provided for @errorMoveInDefectStale.
  ///
  /// In en, this message translates to:
  /// **'This item has since been replaced or removed. The notice cannot be agreed, but you can still dispute it.'**
  String get errorMoveInDefectStale;

  /// No description provided for @errorAgencyConflict.
  ///
  /// In en, this message translates to:
  /// **'Team access has changed. Refresh and try again.'**
  String get errorAgencyConflict;

  /// No description provided for @errorPropertyHistory.
  ///
  /// In en, this message translates to:
  /// **'This property has report history and cannot be deleted. Archive it to preserve its records.'**
  String get errorPropertyHistory;

  /// No description provided for @errorPropertyRestoreExpired.
  ///
  /// In en, this message translates to:
  /// **'The recovery period has ended. This property can no longer be restored.'**
  String get errorPropertyRestoreExpired;

  /// No description provided for @errorPropertyTrashed.
  ///
  /// In en, this message translates to:
  /// **'This property is in trash. Restore it from Account → Properties → Trash before continuing.'**
  String get errorPropertyTrashed;

  /// No description provided for @errorFindingSaveConflict.
  ///
  /// In en, this message translates to:
  /// **'This finding was already saved. Reopen it to save your latest changes. Your draft is kept on this phone.'**
  String get errorFindingSaveConflict;

  /// No description provided for @errorServer.
  ///
  /// In en, this message translates to:
  /// **'Kivilo could not do that just now. Please try again. (Error {status})'**
  String errorServer(int status);

  /// No description provided for @errorUnexpected.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorUnexpected;

  /// No description provided for @addendumAdded.
  ///
  /// In en, this message translates to:
  /// **'Added: {name}'**
  String addendumAdded(String name);

  /// No description provided for @addendumRemoved.
  ///
  /// In en, this message translates to:
  /// **'Removed: {name}'**
  String addendumRemoved(String name);

  /// No description provided for @addendumReplaced.
  ///
  /// In en, this message translates to:
  /// **'Replaced: {old} with {name}'**
  String addendumReplaced(String old, String name);

  /// Stands in for an item with no name in a heading such as Added: item.
  ///
  /// In en, this message translates to:
  /// **'item'**
  String get addendumItem;

  /// No description provided for @acknowledgementPending.
  ///
  /// In en, this message translates to:
  /// **'{role} {name}: pending acknowledgement'**
  String acknowledgementPending(String role, String name);

  /// No description provided for @acknowledgedInPerson.
  ///
  /// In en, this message translates to:
  /// **'{role} {name}: acknowledged in person {date}'**
  String acknowledgedInPerson(String role, String name, String date);

  /// No description provided for @acknowledged.
  ///
  /// In en, this message translates to:
  /// **'{role} {name}: acknowledged {date}'**
  String acknowledged(String role, String name, String date);

  /// A party's role as the server names it.
  ///
  /// In en, this message translates to:
  /// **'{role, select, Landlord{Landlord} Tenant{Tenant} LANDLORD{Landlord} TENANT{Tenant} other{{role}}}'**
  String partyRole(String role);

  /// No description provided for @landlord.
  ///
  /// In en, this message translates to:
  /// **'Landlord'**
  String get landlord;

  /// No description provided for @tenant.
  ///
  /// In en, this message translates to:
  /// **'Tenant'**
  String get tenant;

  /// No description provided for @basisMinorRepair.
  ///
  /// In en, this message translates to:
  /// **'Minor repair clause'**
  String get basisMinorRepair;

  /// No description provided for @basisTenantCaused.
  ///
  /// In en, this message translates to:
  /// **'Caused by the tenant'**
  String get basisTenantCaused;

  /// No description provided for @basisFairWear.
  ///
  /// In en, this message translates to:
  /// **'Fair wear and tear'**
  String get basisFairWear;

  /// No description provided for @basisLandlordObligation.
  ///
  /// In en, this message translates to:
  /// **'Landlord\'s obligation'**
  String get basisLandlordObligation;

  /// No description provided for @basisOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get basisOther;

  /// No description provided for @proposalSharedPays.
  ///
  /// In en, this message translates to:
  /// **'Tenant pays the first {cap}, landlord pays the rest.'**
  String proposalSharedPays(String cap);

  /// No description provided for @proposalLandlordPays.
  ///
  /// In en, this message translates to:
  /// **'Landlord pays.'**
  String get proposalLandlordPays;

  /// No description provided for @proposalTenantPays.
  ///
  /// In en, this message translates to:
  /// **'Tenant pays.'**
  String get proposalTenantPays;

  /// No description provided for @proposalLandlordArranges.
  ///
  /// In en, this message translates to:
  /// **'Landlord arranges the repair.'**
  String get proposalLandlordArranges;

  /// No description provided for @proposalTenantArranges.
  ///
  /// In en, this message translates to:
  /// **'Tenant arranges the repair.'**
  String get proposalTenantArranges;

  /// No description provided for @chooseLabel.
  ///
  /// In en, this message translates to:
  /// **'Choose {label}'**
  String chooseLabel(String label);

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @statusReported.
  ///
  /// In en, this message translates to:
  /// **'Reported'**
  String get statusReported;

  /// No description provided for @statusAcknowledged.
  ///
  /// In en, this message translates to:
  /// **'Acknowledged'**
  String get statusAcknowledged;

  /// No description provided for @statusScheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get statusScheduled;

  /// No description provided for @statusAwaitingConfirmation.
  ///
  /// In en, this message translates to:
  /// **'Awaiting confirmation'**
  String get statusAwaitingConfirmation;

  /// No description provided for @statusResolved.
  ///
  /// In en, this message translates to:
  /// **'Resolved'**
  String get statusResolved;

  /// No description provided for @statusClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get statusClosed;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusAwaitingSignatures.
  ///
  /// In en, this message translates to:
  /// **'Awaiting signatures'**
  String get statusAwaitingSignatures;

  /// No description provided for @statusDraft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get statusDraft;

  /// No description provided for @signInConnectFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not connect. Check your connection and try again.'**
  String get signInConnectFailed;

  /// No description provided for @signInWelcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get signInWelcomeBack;

  /// No description provided for @signInCheckEmail.
  ///
  /// In en, this message translates to:
  /// **'Check your email'**
  String get signInCheckEmail;

  /// No description provided for @signInTagline.
  ///
  /// In en, this message translates to:
  /// **'Your property, on record'**
  String get signInTagline;

  /// No description provided for @signInContinue.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue your inspections.'**
  String get signInContinue;

  /// No description provided for @signInEnterCode.
  ///
  /// In en, this message translates to:
  /// **'Enter the six-digit code sent to {email}.'**
  String signInEnterCode(String email);

  /// No description provided for @signInIntro.
  ///
  /// In en, this message translates to:
  /// **'Condition reports, repairs and their history, for agents, landlords and tenants.'**
  String get signInIntro;

  /// No description provided for @signInCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'VERIFICATION CODE'**
  String get signInCodeLabel;

  /// No description provided for @signInEmailLabel.
  ///
  /// In en, this message translates to:
  /// **'EMAIL ADDRESS'**
  String get signInEmailLabel;

  /// No description provided for @signInPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Your password'**
  String get signInPasswordHint;

  /// No description provided for @signInHidePassword.
  ///
  /// In en, this message translates to:
  /// **'Hide password'**
  String get signInHidePassword;

  /// No description provided for @signInShowPassword.
  ///
  /// In en, this message translates to:
  /// **'Show password'**
  String get signInShowPassword;

  /// No description provided for @working.
  ///
  /// In en, this message translates to:
  /// **'Working'**
  String get working;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @signInEmailCode.
  ///
  /// In en, this message translates to:
  /// **'Email me a code'**
  String get signInEmailCode;

  /// No description provided for @signInResend.
  ///
  /// In en, this message translates to:
  /// **'Send a new code'**
  String get signInResend;

  /// No description provided for @signInDifferentEmail.
  ///
  /// In en, this message translates to:
  /// **'Use a different email'**
  String get signInDifferentEmail;

  /// No description provided for @signInUseCode.
  ///
  /// In en, this message translates to:
  /// **'Use an emailed code instead'**
  String get signInUseCode;

  /// No description provided for @signInWithPassword.
  ///
  /// In en, this message translates to:
  /// **'Sign in with password'**
  String get signInWithPassword;

  /// No description provided for @signInFooter.
  ///
  /// In en, this message translates to:
  /// **'Every room. Every detail. Ready when you need it.'**
  String get signInFooter;

  /// No description provided for @updateReady.
  ///
  /// In en, this message translates to:
  /// **'Update ready'**
  String get updateReady;

  /// No description provided for @updateKivilo.
  ///
  /// In en, this message translates to:
  /// **'Update Kivilo'**
  String get updateKivilo;

  /// No description provided for @updateRestartBody.
  ///
  /// In en, this message translates to:
  /// **'The update is downloaded. Kivilo will close, then notify you when it is ready to reopen.'**
  String get updateRestartBody;

  /// No description provided for @updateDownloadBody.
  ///
  /// In en, this message translates to:
  /// **'A Kivilo update is available. Download it now; Kivilo will close, then notify you when it is ready to reopen.'**
  String get updateDownloadBody;

  /// No description provided for @updateCloseAndUpdate.
  ///
  /// In en, this message translates to:
  /// **'Close and update'**
  String get updateCloseAndUpdate;

  /// No description provided for @update.
  ///
  /// In en, this message translates to:
  /// **'Update'**
  String get update;

  /// No description provided for @updateStoreFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open the store. Search for Kivilo in it instead.'**
  String get updateStoreFailed;

  /// No description provided for @updateOpenAppStore.
  ///
  /// In en, this message translates to:
  /// **'Open the App Store'**
  String get updateOpenAppStore;

  /// No description provided for @updateOpenGooglePlay.
  ///
  /// In en, this message translates to:
  /// **'Open Google Play'**
  String get updateOpenGooglePlay;

  /// No description provided for @updateRequiredBody.
  ///
  /// In en, this message translates to:
  /// **'This version is no longer supported. Photos and videos already on this phone are kept and finish uploading after the update.'**
  String get updateRequiredBody;

  /// No description provided for @updateDoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Kivilo is updated'**
  String get updateDoneTitle;

  /// No description provided for @updateDoneBody.
  ///
  /// In en, this message translates to:
  /// **'Tap to reopen Kivilo.'**
  String get updateDoneBody;

  /// No description provided for @updateChannelName.
  ///
  /// In en, this message translates to:
  /// **'App updates'**
  String get updateChannelName;

  /// No description provided for @updateChannelDescription.
  ///
  /// In en, this message translates to:
  /// **'Completed Kivilo app updates'**
  String get updateChannelDescription;

  /// No description provided for @updateNeedsNotifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications must be enabled so Kivilo can tell you when it is safe to reopen.'**
  String get updateNeedsNotifications;

  /// No description provided for @pushNewNotification.
  ///
  /// In en, this message translates to:
  /// **'New Kivilo notification'**
  String get pushNewNotification;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get open;

  /// No description provided for @homeTitle.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get homeTitle;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @homeUrgentServices.
  ///
  /// In en, this message translates to:
  /// **'Urgent services'**
  String get homeUrgentServices;

  /// No description provided for @homeInspections.
  ///
  /// In en, this message translates to:
  /// **'Inspections'**
  String get homeInspections;

  /// No description provided for @homeWorkspaceFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load your workspace'**
  String get homeWorkspaceFailed;

  /// No description provided for @tryAgain.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get tryAgain;

  /// No description provided for @homeShowAllProperties.
  ///
  /// In en, this message translates to:
  /// **'Show all properties'**
  String get homeShowAllProperties;

  /// No description provided for @homeGoodMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get homeGoodMorning;

  /// No description provided for @homeGoodAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get homeGoodAfternoon;

  /// No description provided for @homeGoodEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get homeGoodEvening;

  /// No description provided for @homeCounts.
  ///
  /// In en, this message translates to:
  /// **'{inProgress} in progress · {awaiting} awaiting signatures'**
  String homeCounts(int inProgress, int awaiting);

  /// No description provided for @homeViewInspections.
  ///
  /// In en, this message translates to:
  /// **'View inspections'**
  String get homeViewInspections;

  /// No description provided for @newCheckIn.
  ///
  /// In en, this message translates to:
  /// **'New check-in'**
  String get newCheckIn;

  /// No description provided for @homeGreeting.
  ///
  /// In en, this message translates to:
  /// **'{greeting}, {name}'**
  String homeGreeting(String greeting, String name);

  /// No description provided for @homePartySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your reports, repairs and history, in one place.'**
  String get homePartySubtitle;

  /// No description provided for @homeAgentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'A clear next step for every handover.'**
  String get homeAgentSubtitle;

  /// No description provided for @homeOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline. Showing previously loaded work.'**
  String get homeOffline;

  /// No description provided for @homeYourProperties.
  ///
  /// In en, this message translates to:
  /// **'Your properties'**
  String get homeYourProperties;

  /// No description provided for @homeYourPropertiesDetail.
  ///
  /// In en, this message translates to:
  /// **'Repairs, records and the people who live there.'**
  String get homeYourPropertiesDetail;

  /// No description provided for @homeEyebrowNextHandover.
  ///
  /// In en, this message translates to:
  /// **'YOUR NEXT HANDOVER'**
  String get homeEyebrowNextHandover;

  /// No description provided for @homeEyebrowWaiting.
  ///
  /// In en, this message translates to:
  /// **'WAITING FOR SIGNATURES'**
  String get homeEyebrowWaiting;

  /// No description provided for @homeEyebrowNextStep.
  ///
  /// In en, this message translates to:
  /// **'YOUR NEXT STEP'**
  String get homeEyebrowNextStep;

  /// No description provided for @homeHeadlineEmpty.
  ///
  /// In en, this message translates to:
  /// **'Great handovers start\nwith a clear record.'**
  String get homeHeadlineEmpty;

  /// No description provided for @homeHeadlineAwaiting.
  ///
  /// In en, this message translates to:
  /// **'Bring everyone onto\nthe same page.'**
  String get homeHeadlineAwaiting;

  /// No description provided for @homeHeadlineFirstRoom.
  ///
  /// In en, this message translates to:
  /// **'Start with the first room.'**
  String get homeHeadlineFirstRoom;

  /// No description provided for @homeHeadlineContinue.
  ///
  /// In en, this message translates to:
  /// **'One room at a time.'**
  String get homeHeadlineContinue;

  /// No description provided for @homeBodyEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add the property and tenancy. We’ll guide you from the first photo to the signed report.'**
  String get homeBodyEmpty;

  /// No description provided for @homeBodyAwaiting.
  ///
  /// In en, this message translates to:
  /// **'The inventory is frozen. Check who still needs to sign, or send their signing email again.'**
  String get homeBodyAwaiting;

  /// No description provided for @homeBodyFirstRoom.
  ///
  /// In en, this message translates to:
  /// **'Add a room, take photos, then write down what you find.'**
  String get homeBodyFirstRoom;

  /// No description provided for @homeBodyContinue.
  ///
  /// In en, this message translates to:
  /// **'Open a room, choose an inventory item, then add photos and check its condition before reviewing the room.'**
  String get homeBodyContinue;

  /// No description provided for @homeStartCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Start check-in'**
  String get homeStartCheckIn;

  /// No description provided for @homeCheckSignatures.
  ///
  /// In en, this message translates to:
  /// **'Check signatures'**
  String get homeCheckSignatures;

  /// No description provided for @homeAddFirstRoom.
  ///
  /// In en, this message translates to:
  /// **'Add your first room'**
  String get homeAddFirstRoom;

  /// No description provided for @homeContinueInspection.
  ///
  /// In en, this message translates to:
  /// **'Continue inspection'**
  String get homeContinueInspection;

  /// No description provided for @homeOpenProperty.
  ///
  /// In en, this message translates to:
  /// **'Open property'**
  String get homeOpenProperty;

  /// No description provided for @homeOpenCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Open check-in'**
  String get homeOpenCheckIn;

  /// No description provided for @homeOpenCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Open check-out'**
  String get homeOpenCheckOut;

  /// No description provided for @viewReport.
  ///
  /// In en, this message translates to:
  /// **'View report'**
  String get viewReport;

  /// No description provided for @homeYouAreLandlord.
  ///
  /// In en, this message translates to:
  /// **'You are the landlord'**
  String get homeYouAreLandlord;

  /// No description provided for @homeYouAreTenant.
  ///
  /// In en, this message translates to:
  /// **'You are the tenant'**
  String get homeYouAreTenant;

  /// No description provided for @homeReportPending.
  ///
  /// In en, this message translates to:
  /// **'Your check-in report appears here once your agent sends it.'**
  String get homeReportPending;

  /// No description provided for @homeReviewAndSign.
  ///
  /// In en, this message translates to:
  /// **'Review and sign'**
  String get homeReviewAndSign;

  /// No description provided for @checkOutReport.
  ///
  /// In en, this message translates to:
  /// **'Check-out report'**
  String get checkOutReport;

  /// No description provided for @checkInReport.
  ///
  /// In en, this message translates to:
  /// **'Check-in report'**
  String get checkInReport;

  /// No description provided for @repairs.
  ///
  /// In en, this message translates to:
  /// **'Repairs'**
  String get repairs;

  /// No description provided for @homeNoProperties.
  ///
  /// In en, this message translates to:
  /// **'No properties yet'**
  String get homeNoProperties;

  /// No description provided for @homeNoPropertiesDetail.
  ///
  /// In en, this message translates to:
  /// **'Create a check-in to add your first property.'**
  String get homeNoPropertiesDetail;

  /// No description provided for @agent.
  ///
  /// In en, this message translates to:
  /// **'Agent'**
  String get agent;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @filterInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get filterInProgress;

  /// No description provided for @filterAwaitingSignature.
  ///
  /// In en, this message translates to:
  /// **'Awaiting signature'**
  String get filterAwaitingSignature;

  /// No description provided for @inspectionsLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load inspections'**
  String get inspectionsLoadFailed;

  /// No description provided for @inspectionsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your check-in and check-out reports, all in one place.'**
  String get inspectionsSubtitle;

  /// No description provided for @inspectionsResponsibleAgent.
  ///
  /// In en, this message translates to:
  /// **'Responsible agent'**
  String get inspectionsResponsibleAgent;

  /// No description provided for @inspectionsAllAgents.
  ///
  /// In en, this message translates to:
  /// **'All agents'**
  String get inspectionsAllAgents;

  /// No description provided for @inspectionsTeamNote.
  ///
  /// In en, this message translates to:
  /// **'Shows team work your account can access.'**
  String get inspectionsTeamNote;

  /// No description provided for @inspectionsOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline. Showing what was last loaded; you can keep taking photos.'**
  String get inspectionsOffline;

  /// No description provided for @inspectionsSearch.
  ///
  /// In en, this message translates to:
  /// **'Search inspections'**
  String get inspectionsSearch;

  /// No description provided for @inspectionsSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Property, tenant or check-in / check-out'**
  String get inspectionsSearchHint;

  /// No description provided for @inspectionsClearSearch.
  ///
  /// In en, this message translates to:
  /// **'Clear search'**
  String get inspectionsClearSearch;

  /// No description provided for @inspectionsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 report} other{{count} reports}}'**
  String inspectionsCount(int count);

  /// No description provided for @inspectionsFound.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 report found} other{{count} reports found}}'**
  String inspectionsFound(int count);

  /// No description provided for @inspectionsNoMatch.
  ///
  /// In en, this message translates to:
  /// **'No matching inspections'**
  String get inspectionsNoMatch;

  /// No description provided for @inspectionsNoMatchDetail.
  ///
  /// In en, this message translates to:
  /// **'Try another property or tenant, or change your filters.'**
  String get inspectionsNoMatchDetail;

  /// No description provided for @inspectionsShowAll.
  ///
  /// In en, this message translates to:
  /// **'Show all inspections'**
  String get inspectionsShowAll;

  /// No description provided for @inspectionsResponsible.
  ///
  /// In en, this message translates to:
  /// **'Responsible: {name}'**
  String inspectionsResponsible(String name);

  /// No description provided for @roomCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 room} other{{count} rooms}}'**
  String roomCount(int count);

  /// No description provided for @inspectionsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No inspections yet'**
  String get inspectionsEmpty;

  /// No description provided for @inspectionsEmptyOffline.
  ///
  /// In en, this message translates to:
  /// **'Connect to create a new check-in.'**
  String get inspectionsEmptyOffline;

  /// No description provided for @inspectionsEmptyDetail.
  ///
  /// In en, this message translates to:
  /// **'Start a check-in for your next handover. Your inventory, photos and signed report will live here.'**
  String get inspectionsEmptyDetail;

  /// No description provided for @workspaceChoose.
  ///
  /// In en, this message translates to:
  /// **'Choose workspace'**
  String get workspaceChoose;

  /// No description provided for @workspaceAll.
  ///
  /// In en, this message translates to:
  /// **'All properties'**
  String get workspaceAll;

  /// No description provided for @workspacePersonal.
  ///
  /// In en, this message translates to:
  /// **'Personal'**
  String get workspacePersonal;

  /// No description provided for @workspaceInvitations.
  ///
  /// In en, this message translates to:
  /// **'Team invitations ({count})'**
  String workspaceInvitations(int count);

  /// No description provided for @workspaceAddTeam.
  ///
  /// In en, this message translates to:
  /// **'Add a team'**
  String get workspaceAddTeam;

  /// No description provided for @teamAccessChanged.
  ///
  /// In en, this message translates to:
  /// **'Team access changed. Refresh and try again.'**
  String get teamAccessChanged;

  /// No description provided for @newWhoOwns.
  ///
  /// In en, this message translates to:
  /// **'Who owns this work?'**
  String get newWhoOwns;

  /// No description provided for @newPersonalDetail.
  ///
  /// In en, this message translates to:
  /// **'Private to you until you add collaborators'**
  String get newPersonalDetail;

  /// No description provided for @newTeamDetail.
  ///
  /// In en, this message translates to:
  /// **'Assigned agents and team owners and managers can access this work'**
  String get newTeamDetail;

  /// No description provided for @newCreateTeamHint.
  ///
  /// In en, this message translates to:
  /// **'Create or join a team in Account → Team.'**
  String get newCreateTeamHint;

  /// No description provided for @newFurnishingRequired.
  ///
  /// In en, this message translates to:
  /// **'Choose whether the property is fully furnished.'**
  String get newFurnishingRequired;

  /// No description provided for @newEndAfterStart.
  ///
  /// In en, this message translates to:
  /// **'The tenancy must end after it starts.'**
  String get newEndAfterStart;

  /// No description provided for @fieldRequired.
  ///
  /// In en, this message translates to:
  /// **'{label} (required)'**
  String fieldRequired(String label);

  /// No description provided for @fieldOptional.
  ///
  /// In en, this message translates to:
  /// **'{label} (optional)'**
  String fieldOptional(String label);

  /// No description provided for @fieldIsRequired.
  ///
  /// In en, this message translates to:
  /// **'{label} is required'**
  String fieldIsRequired(String label);

  /// No description provided for @fieldInvalidEmail.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address'**
  String get fieldInvalidEmail;

  /// No description provided for @fieldInvalidAmount.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid {currency} amount with up to 2 decimals'**
  String fieldInvalidAmount(String currency);

  /// No description provided for @newEssentials.
  ///
  /// In en, this message translates to:
  /// **'Start with the essentials'**
  String get newEssentials;

  /// No description provided for @newEssentialsDetail.
  ///
  /// In en, this message translates to:
  /// **'Set up the property and tenancy. You can add rooms after this.'**
  String get newEssentialsDetail;

  /// No description provided for @newWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Workspace: {name}'**
  String newWorkspace(String name);

  /// No description provided for @newPrivate.
  ///
  /// In en, this message translates to:
  /// **'Private to you until you share it.'**
  String get newPrivate;

  /// No description provided for @newTeamResponsible.
  ///
  /// In en, this message translates to:
  /// **'You are the responsible agent. Assigned colleagues can work with you; owners and managers oversee all team properties.'**
  String get newTeamResponsible;

  /// No description provided for @newProperty.
  ///
  /// In en, this message translates to:
  /// **'Property'**
  String get newProperty;

  /// No description provided for @newPropertyDetail.
  ///
  /// In en, this message translates to:
  /// **'Where the handover takes place'**
  String get newPropertyDetail;

  /// No description provided for @newAddress.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get newAddress;

  /// No description provided for @newUnit.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get newUnit;

  /// No description provided for @newPostalCode.
  ///
  /// In en, this message translates to:
  /// **'Postal code'**
  String get newPostalCode;

  /// No description provided for @newPropertyTypeRequired.
  ///
  /// In en, this message translates to:
  /// **'Property type (required)'**
  String get newPropertyTypeRequired;

  /// No description provided for @newChoosePropertyType.
  ///
  /// In en, this message translates to:
  /// **'Choose a property type'**
  String get newChoosePropertyType;

  /// No description provided for @propertyTypePrivate.
  ///
  /// In en, this message translates to:
  /// **'Private, non-landed'**
  String get propertyTypePrivate;

  /// No description provided for @propertyTypePrivateDetail.
  ///
  /// In en, this message translates to:
  /// **'Condominium or private apartment'**
  String get propertyTypePrivateDetail;

  /// No description provided for @propertyTypeHdb.
  ///
  /// In en, this message translates to:
  /// **'HDB'**
  String get propertyTypeHdb;

  /// No description provided for @propertyTypeHdbDetail.
  ///
  /// In en, this message translates to:
  /// **'Public housing flat'**
  String get propertyTypeHdbDetail;

  /// No description provided for @propertyTypeLanded.
  ///
  /// In en, this message translates to:
  /// **'Landed'**
  String get propertyTypeLanded;

  /// No description provided for @propertyTypeLandedDetail.
  ///
  /// In en, this message translates to:
  /// **'Terrace, semi-detached or detached home'**
  String get propertyTypeLandedDetail;

  /// No description provided for @propertyTypeCommercial.
  ///
  /// In en, this message translates to:
  /// **'Commercial'**
  String get propertyTypeCommercial;

  /// No description provided for @propertyTypeCommercialDetail.
  ///
  /// In en, this message translates to:
  /// **'Office, retail or other business premises'**
  String get propertyTypeCommercialDetail;

  /// No description provided for @newFurnishing.
  ///
  /// In en, this message translates to:
  /// **'Furnishing (required)'**
  String get newFurnishing;

  /// No description provided for @newFurnishingDetail.
  ///
  /// In en, this message translates to:
  /// **'Fully furnished rooms start with standard inventory rows. Other rooms start empty.'**
  String get newFurnishingDetail;

  /// No description provided for @newFullyFurnished.
  ///
  /// In en, this message translates to:
  /// **'Fully furnished'**
  String get newFullyFurnished;

  /// No description provided for @newNotFullyFurnished.
  ///
  /// In en, this message translates to:
  /// **'Not fully furnished'**
  String get newNotFullyFurnished;

  /// No description provided for @newPeople.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get newPeople;

  /// No description provided for @newPeopleDetail.
  ///
  /// In en, this message translates to:
  /// **'The landlord and tenant on the report'**
  String get newPeopleDetail;

  /// No description provided for @newLandlordName.
  ///
  /// In en, this message translates to:
  /// **'Landlord name'**
  String get newLandlordName;

  /// No description provided for @newLandlordEmail.
  ///
  /// In en, this message translates to:
  /// **'Landlord email'**
  String get newLandlordEmail;

  /// No description provided for @newTenantName.
  ///
  /// In en, this message translates to:
  /// **'Tenant name'**
  String get newTenantName;

  /// No description provided for @newTenantEmail.
  ///
  /// In en, this message translates to:
  /// **'Tenant email'**
  String get newTenantEmail;

  /// No description provided for @newTenancy.
  ///
  /// In en, this message translates to:
  /// **'Tenancy'**
  String get newTenancy;

  /// No description provided for @newTenancyDetail.
  ///
  /// In en, this message translates to:
  /// **'Dates and agreed amounts'**
  String get newTenancyDetail;

  /// No description provided for @newStarts.
  ///
  /// In en, this message translates to:
  /// **'Starts (required)'**
  String get newStarts;

  /// No description provided for @newEnds.
  ///
  /// In en, this message translates to:
  /// **'Ends (required)'**
  String get newEnds;

  /// No description provided for @newMonthlyRent.
  ///
  /// In en, this message translates to:
  /// **'Monthly rent ({currency})'**
  String newMonthlyRent(String currency);

  /// No description provided for @newDeposit.
  ///
  /// In en, this message translates to:
  /// **'Deposit ({currency})'**
  String newDeposit(String currency);

  /// No description provided for @creating.
  ///
  /// In en, this message translates to:
  /// **'Creating…'**
  String get creating;

  /// No description provided for @newCreate.
  ///
  /// In en, this message translates to:
  /// **'Create check-in'**
  String get newCreate;

  /// No description provided for @assetAddTitle.
  ///
  /// In en, this message translates to:
  /// **'Add property asset'**
  String get assetAddTitle;

  /// No description provided for @assetName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get assetName;

  /// No description provided for @assetCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get assetCategory;

  /// No description provided for @assetAppliance.
  ///
  /// In en, this message translates to:
  /// **'Appliance'**
  String get assetAppliance;

  /// No description provided for @assetFixture.
  ///
  /// In en, this message translates to:
  /// **'Fixture'**
  String get assetFixture;

  /// No description provided for @assetFurniture.
  ///
  /// In en, this message translates to:
  /// **'Furniture'**
  String get assetFurniture;

  /// No description provided for @assetSurface.
  ///
  /// In en, this message translates to:
  /// **'Surface'**
  String get assetSurface;

  /// No description provided for @assetSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get assetSystem;

  /// No description provided for @assetRoomOptional.
  ///
  /// In en, this message translates to:
  /// **'Room (optional)'**
  String get assetRoomOptional;

  /// No description provided for @assetIdentifierOptional.
  ///
  /// In en, this message translates to:
  /// **'Make, model or serial (optional)'**
  String get assetIdentifierOptional;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @minorRepairCap.
  ///
  /// In en, this message translates to:
  /// **'Minor repair cap'**
  String get minorRepairCap;

  /// No description provided for @minorRepairCapBody.
  ///
  /// In en, this message translates to:
  /// **'The amount the tenant pays towards each minor repair under the tenancy agreement. It prefills a split when someone proposes who pays; the tenant still accepts every proposal.'**
  String get minorRepairCapBody;

  /// No description provided for @minorRepairCapLabel.
  ///
  /// In en, this message translates to:
  /// **'Tenant pays up to'**
  String get minorRepairCapLabel;

  /// No description provided for @currencyPrefix.
  ///
  /// In en, this message translates to:
  /// **'S\$ '**
  String get currencyPrefix;

  /// No description provided for @minorRepairCapHelper.
  ///
  /// In en, this message translates to:
  /// **'Leave empty if the agreement has no cap'**
  String get minorRepairCapHelper;

  /// No description provided for @minorRepairCapInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount like 150'**
  String get minorRepairCapInvalid;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @defectPeriod.
  ///
  /// In en, this message translates to:
  /// **'Move-in defect period'**
  String get defectPeriod;

  /// No description provided for @defectPeriodBody.
  ///
  /// In en, this message translates to:
  /// **'Use the period in the tenancy agreement. The tenancy start date is day 1, in Singapore time. This is fixed when the tenant first signs the check-in.'**
  String get defectPeriodBody;

  /// No description provided for @defectPeriodDays.
  ///
  /// In en, this message translates to:
  /// **'Number of days'**
  String get defectPeriodDays;

  /// No description provided for @defectPeriodHelper.
  ///
  /// In en, this message translates to:
  /// **'0 disables the move-in defect period'**
  String get defectPeriodHelper;

  /// No description provided for @defectPeriodInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a whole number from 0 to 365'**
  String get defectPeriodInvalid;

  /// No description provided for @tenancyEyebrow.
  ///
  /// In en, this message translates to:
  /// **'YOUR PROPERTY'**
  String get tenancyEyebrow;

  /// No description provided for @tenancySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Reports, repairs and the history of this home.'**
  String get tenancySubtitle;

  /// No description provided for @tenancyRecord.
  ///
  /// In en, this message translates to:
  /// **'Property record'**
  String get tenancyRecord;

  /// No description provided for @tenancyRecordDetail.
  ///
  /// In en, this message translates to:
  /// **'The agreed condition and what has happened since'**
  String get tenancyRecordDetail;

  /// No description provided for @tenancyManageAccess.
  ///
  /// In en, this message translates to:
  /// **'Manage access'**
  String get tenancyManageAccess;

  /// No description provided for @tenancyPropertyAccess.
  ///
  /// In en, this message translates to:
  /// **'Property access'**
  String get tenancyPropertyAccess;

  /// No description provided for @tenancyOpenInspectionDetail.
  ///
  /// In en, this message translates to:
  /// **'Rooms, inventory and signatures'**
  String get tenancyOpenInspectionDetail;

  /// No description provided for @tenancyLatestCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Latest check-out report'**
  String get tenancyLatestCheckOut;

  /// No description provided for @tenancyLatestCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Latest check-in report'**
  String get tenancyLatestCheckIn;

  /// No description provided for @tenancyViewReport.
  ///
  /// In en, this message translates to:
  /// **'View the condition report'**
  String get tenancyViewReport;

  /// No description provided for @tenancyTimeline.
  ///
  /// In en, this message translates to:
  /// **'Property timeline'**
  String get tenancyTimeline;

  /// No description provided for @tenancyTimelineDetail.
  ///
  /// In en, this message translates to:
  /// **'Signed reports, repairs and agreed costs at this address'**
  String get tenancyTimelineDetail;

  /// No description provided for @propertySettings.
  ///
  /// In en, this message translates to:
  /// **'Property settings'**
  String get propertySettings;

  /// No description provided for @tenancyCare.
  ///
  /// In en, this message translates to:
  /// **'Property care'**
  String get tenancyCare;

  /// No description provided for @tenancyCareDetail.
  ///
  /// In en, this message translates to:
  /// **'Report a problem and follow each repair through'**
  String get tenancyCareDetail;

  /// No description provided for @tenancyDanger.
  ///
  /// In en, this message translates to:
  /// **'Immediate danger?'**
  String get tenancyDanger;

  /// No description provided for @tenancyDangerNumbers.
  ///
  /// In en, this message translates to:
  /// **'Police 999 · Fire or ambulance 995'**
  String get tenancyDangerNumbers;

  /// No description provided for @reportProblem.
  ///
  /// In en, this message translates to:
  /// **'Report a problem'**
  String get reportProblem;

  /// No description provided for @defectPeriodDisabled.
  ///
  /// In en, this message translates to:
  /// **'Disabled. Repairs can still be reported.'**
  String get defectPeriodDisabled;

  /// No description provided for @defectPeriodSummary.
  ///
  /// In en, this message translates to:
  /// **'{days, plural, =1{1 day} other{{days} days}} · Report by {date} (Singapore time)'**
  String defectPeriodSummary(int days, String date);

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @maintenance.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get maintenance;

  /// No description provided for @tenancyMaintenanceEmpty.
  ///
  /// In en, this message translates to:
  /// **'Requests for this property will appear here'**
  String get tenancyMaintenanceEmpty;

  /// No description provided for @requestCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 request} other{{count} requests}}'**
  String requestCount(int count);

  /// No description provided for @repairAttempts.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 repair attempt} other{{count} repair attempts}}'**
  String repairAttempts(int count);

  /// No description provided for @repairCosts.
  ///
  /// In en, this message translates to:
  /// **'Repair costs'**
  String get repairCosts;

  /// No description provided for @repairCostsDetail.
  ///
  /// In en, this message translates to:
  /// **'Terms that shape who pays for a repair'**
  String get repairCostsDetail;

  /// No description provided for @assets.
  ///
  /// In en, this message translates to:
  /// **'Property assets'**
  String get assets;

  /// No description provided for @assetsDetail.
  ///
  /// In en, this message translates to:
  /// **'Appliances and fixtures linked to maintenance'**
  String get assetsDetail;

  /// No description provided for @assetAdd.
  ///
  /// In en, this message translates to:
  /// **'Add asset'**
  String get assetAdd;

  /// No description provided for @assetRepairs.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 repair in 365 days} other{{count} repairs in 365 days}}'**
  String assetRepairs(int count);

  /// No description provided for @assetRepeatFault.
  ///
  /// In en, this message translates to:
  /// **'Repeat fault'**
  String get assetRepeatFault;

  /// No description provided for @notSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get notSet;

  /// No description provided for @minorRepairCapSummary.
  ///
  /// In en, this message translates to:
  /// **'Tenant pays up to S\${amount} per repair'**
  String minorRepairCapSummary(String amount);

  /// No description provided for @set.
  ///
  /// In en, this message translates to:
  /// **'Set'**
  String get set;

  /// No description provided for @agentMayAgreeCosts.
  ///
  /// In en, this message translates to:
  /// **'Agent can agree costs'**
  String get agentMayAgreeCosts;

  /// No description provided for @agentMayAgreeCostsOn.
  ///
  /// In en, this message translates to:
  /// **'Lets the agent accept or reject cost proposals for you'**
  String get agentMayAgreeCostsOn;

  /// No description provided for @agentMayAgreeCostsLandlordOnly.
  ///
  /// In en, this message translates to:
  /// **'Only the landlord can change this'**
  String get agentMayAgreeCostsLandlordOnly;

  /// No description provided for @tenancyNoRequests.
  ///
  /// In en, this message translates to:
  /// **'No open requests'**
  String get tenancyNoRequests;

  /// No description provided for @tenancyNoRequestsDetail.
  ///
  /// In en, this message translates to:
  /// **'This tenancy has no reported maintenance problems.'**
  String get tenancyNoRequestsDetail;

  /// No description provided for @assetsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No assets have been added to this property yet.'**
  String get assetsEmpty;

  /// No description provided for @propertyArchived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get propertyArchived;

  /// No description provided for @propertyInTrash.
  ///
  /// In en, this message translates to:
  /// **'In trash'**
  String get propertyInTrash;

  /// No description provided for @propertyActive.
  ///
  /// In en, this message translates to:
  /// **'Active property'**
  String get propertyActive;

  /// No description provided for @propertyCounts.
  ///
  /// In en, this message translates to:
  /// **'{tenancies, plural, =1{1 tenancy} other{{tenancies} tenancies}} · {inspections, plural, =1{1 inspection} other{{inspections} inspections}} · {photos, plural, =1{1 photo} other{{photos} photos}}'**
  String propertyCounts(int tenancies, int inspections, int photos);

  /// No description provided for @propertyTenancyAccess.
  ///
  /// In en, this message translates to:
  /// **'Tenancy access'**
  String get propertyTenancyAccess;

  /// No description provided for @propertyPersonalTenancy.
  ///
  /// In en, this message translates to:
  /// **'Personal tenancy'**
  String get propertyPersonalTenancy;

  /// No description provided for @propertyResponsibleAgent.
  ///
  /// In en, this message translates to:
  /// **'Responsible agent: {name}'**
  String propertyResponsibleAgent(String name);

  /// No description provided for @propertyOpenCheckOutReport.
  ///
  /// In en, this message translates to:
  /// **'Open check-out report'**
  String get propertyOpenCheckOutReport;

  /// No description provided for @propertyOpenCheckInReport.
  ///
  /// In en, this message translates to:
  /// **'Open check-in report'**
  String get propertyOpenCheckInReport;

  /// No description provided for @propertyDangerZone.
  ///
  /// In en, this message translates to:
  /// **'Danger zone'**
  String get propertyDangerZone;

  /// No description provided for @propertyManageOnly.
  ///
  /// In en, this message translates to:
  /// **'Only the property’s lead agents or agency managers can archive or delete it. You need management access to every tenancy at this address.'**
  String get propertyManageOnly;

  /// No description provided for @propertyTrashedNoDate.
  ///
  /// In en, this message translates to:
  /// **'This property is hidden from active work. Restore it before its recovery period ends.'**
  String get propertyTrashedNoDate;

  /// No description provided for @propertyTrashedUntil.
  ///
  /// In en, this message translates to:
  /// **'This property is hidden from active work. Restore before {date}. After that, eligible records and media are permanently removed.'**
  String propertyTrashedUntil(String date);

  /// No description provided for @propertyRestore.
  ///
  /// In en, this message translates to:
  /// **'Restore property'**
  String get propertyRestore;

  /// No description provided for @propertyArchivedBody.
  ///
  /// In en, this message translates to:
  /// **'This property is outside the active portfolio. Its records and reports are preserved.'**
  String get propertyArchivedBody;

  /// No description provided for @propertyArchiveBody.
  ///
  /// In en, this message translates to:
  /// **'Archive removes this address from active work and preserves its reports and history. You can restore it later.'**
  String get propertyArchiveBody;

  /// No description provided for @propertyRestoreActive.
  ///
  /// In en, this message translates to:
  /// **'Restore to active properties'**
  String get propertyRestoreActive;

  /// No description provided for @propertyArchive.
  ///
  /// In en, this message translates to:
  /// **'Archive property'**
  String get propertyArchive;

  /// No description provided for @propertyDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'Delete a mistaken or draft-only property. It moves to trash for 30 days before eligible records and media are permanently removed.'**
  String get propertyDeleteBody;

  /// No description provided for @propertyDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete property'**
  String get propertyDelete;

  /// No description provided for @propertyMoveToTrash.
  ///
  /// In en, this message translates to:
  /// **'Move to trash'**
  String get propertyMoveToTrash;

  /// A confirmation title made from an action, such as Archive property?
  ///
  /// In en, this message translates to:
  /// **'{label}?'**
  String questionTitle(String label);

  /// No description provided for @propertyTrashBody.
  ///
  /// In en, this message translates to:
  /// **'This affects {tenancies, plural, =1{1 tenancy} other{{tenancies} tenancies}}, {inspections, plural, =1{1 inspection} other{{inspections} inspections}} and {photos, plural, =1{1 photo} other{{photos} photos}}. You have 30 days to restore them from Properties → Trash.'**
  String propertyTrashBody(int tenancies, int inspections, int photos);

  /// No description provided for @propertyArchiveConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This removes the property from active work for everyone with access. Reports and evidence remain available in Archived properties.'**
  String get propertyArchiveConfirmBody;

  /// No description provided for @propertyRestoreConfirmBody.
  ///
  /// In en, this message translates to:
  /// **'This restores the property and its saved work to their previous state.'**
  String get propertyRestoreConfirmBody;

  /// No description provided for @propertyTypeToConfirm.
  ///
  /// In en, this message translates to:
  /// **'Type “{label}” to confirm.'**
  String propertyTypeToConfirm(String label);

  /// No description provided for @propertyAddress.
  ///
  /// In en, this message translates to:
  /// **'Property address'**
  String get propertyAddress;

  /// No description provided for @propertiesActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get propertiesActive;

  /// No description provided for @propertiesTrash.
  ///
  /// In en, this message translates to:
  /// **'Trash'**
  String get propertiesTrash;

  /// No description provided for @propertiesNoActive.
  ///
  /// In en, this message translates to:
  /// **'No active properties.'**
  String get propertiesNoActive;

  /// No description provided for @propertiesNoArchived.
  ///
  /// In en, this message translates to:
  /// **'No archived properties.'**
  String get propertiesNoArchived;

  /// No description provided for @propertiesTrashEmpty.
  ///
  /// In en, this message translates to:
  /// **'Trash is empty.'**
  String get propertiesTrashEmpty;

  /// No description provided for @propertyListCounts.
  ///
  /// In en, this message translates to:
  /// **'{tenancies, plural, =1{1 tenancy} other{{tenancies} tenancies}} · {inspections, plural, =1{1 inspection} other{{inspections} inspections}}'**
  String propertyListCounts(int tenancies, int inspections);

  /// No description provided for @propertyRestoreBefore.
  ///
  /// In en, this message translates to:
  /// **'Restore before {date}'**
  String propertyRestoreBefore(String date);

  /// No description provided for @teamCreateTitle.
  ///
  /// In en, this message translates to:
  /// **'Create a team'**
  String get teamCreateTitle;

  /// No description provided for @teamWorkTogether.
  ///
  /// In en, this message translates to:
  /// **'Work together'**
  String get teamWorkTogether;

  /// No description provided for @teamIntro.
  ///
  /// In en, this message translates to:
  /// **'Create or join a team, invite colleagues, then add properties in its workspace. Agents work on assignments; owners and managers oversee the team. Choose Personal for your own properties.'**
  String get teamIntro;

  /// No description provided for @teamInvitationTo.
  ///
  /// In en, this message translates to:
  /// **'Invitation to {team}'**
  String teamInvitationTo(String team);

  /// No description provided for @teamInvitationRole.
  ///
  /// In en, this message translates to:
  /// **'{role} · Expires {date}'**
  String teamInvitationRole(String role, String date);

  /// No description provided for @teamJoinDetail.
  ///
  /// In en, this message translates to:
  /// **'Joining gives you a place in this team. Agents work on assigned tenancies; managers oversee team work.'**
  String get teamJoinDetail;

  /// No description provided for @teamJoin.
  ///
  /// In en, this message translates to:
  /// **'Join team'**
  String get teamJoin;

  /// No description provided for @teamDecline.
  ///
  /// In en, this message translates to:
  /// **'Decline invitation'**
  String get teamDecline;

  /// No description provided for @teamRoleMembers.
  ///
  /// In en, this message translates to:
  /// **'{role} · {count, plural, =1{1 member} other{{count} members}}'**
  String teamRoleMembers(String role, int count);

  /// No description provided for @teamOpenWorkspace.
  ///
  /// In en, this message translates to:
  /// **'Open {team} workspace'**
  String teamOpenWorkspace(String team);

  /// No description provided for @teamCreate.
  ///
  /// In en, this message translates to:
  /// **'Create team'**
  String get teamCreate;

  /// No description provided for @teamMembers.
  ///
  /// In en, this message translates to:
  /// **'Team members'**
  String get teamMembers;

  /// No description provided for @teamRoleSummary.
  ///
  /// In en, this message translates to:
  /// **'{role} · Agents see assigned tenancies. Owners and managers oversee the team portfolio.'**
  String teamRoleSummary(String role);

  /// No description provided for @teamInviteMember.
  ///
  /// In en, this message translates to:
  /// **'Invite member'**
  String get teamInviteMember;

  /// No description provided for @teamRename.
  ///
  /// In en, this message translates to:
  /// **'Rename team'**
  String get teamRename;

  /// No description provided for @teamMembersAndInvitations.
  ///
  /// In en, this message translates to:
  /// **'Members and invitations'**
  String get teamMembersAndInvitations;

  /// No description provided for @teamMemberActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get teamMemberActive;

  /// No description provided for @teamInvitationPending.
  ///
  /// In en, this message translates to:
  /// **'Invitation pending'**
  String get teamInvitationPending;

  /// No description provided for @teamMemberRemoved.
  ///
  /// In en, this message translates to:
  /// **'removed'**
  String get teamMemberRemoved;

  /// No description provided for @teamAssignedTenancies.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 assigned tenancy} other{{count} assigned tenancies}}'**
  String teamAssignedTenancies(int count);

  /// No description provided for @teamExpires.
  ///
  /// In en, this message translates to:
  /// **'Expires {date}'**
  String teamExpires(String date);

  /// No description provided for @teamAssignedWork.
  ///
  /// In en, this message translates to:
  /// **'Assigned work'**
  String get teamAssignedWork;

  /// No description provided for @teamNoProperties.
  ///
  /// In en, this message translates to:
  /// **'No team properties yet. Open this team’s workspace and start a check-in. You can also move an existing personal tenancy from Property access.'**
  String get teamNoProperties;

  /// No description provided for @teamRecentActivity.
  ///
  /// In en, this message translates to:
  /// **'Recent activity'**
  String get teamRecentActivity;

  /// No description provided for @activityCreatedTeam.
  ///
  /// In en, this message translates to:
  /// **'created team'**
  String get activityCreatedTeam;

  /// No description provided for @activityInvitedMember.
  ///
  /// In en, this message translates to:
  /// **'invited member'**
  String get activityInvitedMember;

  /// No description provided for @activityResentInvitation.
  ///
  /// In en, this message translates to:
  /// **'resent invitation'**
  String get activityResentInvitation;

  /// No description provided for @activityRevokedInvitation.
  ///
  /// In en, this message translates to:
  /// **'revoked invitation'**
  String get activityRevokedInvitation;

  /// No description provided for @activityRemovedMember.
  ///
  /// In en, this message translates to:
  /// **'removed member'**
  String get activityRemovedMember;

  /// No description provided for @activityRenamedTeam.
  ///
  /// In en, this message translates to:
  /// **'renamed team'**
  String get activityRenamedTeam;

  /// No description provided for @activityJoinedTeam.
  ///
  /// In en, this message translates to:
  /// **'joined team'**
  String get activityJoinedTeam;

  /// No description provided for @activityDeclinedInvitation.
  ///
  /// In en, this message translates to:
  /// **'declined invitation'**
  String get activityDeclinedInvitation;

  /// No description provided for @activityReassigned.
  ///
  /// In en, this message translates to:
  /// **'reassigned departing member’s properties'**
  String get activityReassigned;

  /// No description provided for @activityChangedAssignments.
  ///
  /// In en, this message translates to:
  /// **'changed property assignments'**
  String get activityChangedAssignments;

  /// No description provided for @activityAddedProperty.
  ///
  /// In en, this message translates to:
  /// **'added property to team'**
  String get activityAddedProperty;

  /// No description provided for @activityAddedCollaborator.
  ///
  /// In en, this message translates to:
  /// **'added property collaborator'**
  String get activityAddedCollaborator;

  /// No description provided for @activityRemovedCollaborator.
  ///
  /// In en, this message translates to:
  /// **'removed property collaborator'**
  String get activityRemovedCollaborator;

  /// No description provided for @activityPropertyArchive.
  ///
  /// In en, this message translates to:
  /// **'archived property'**
  String get activityPropertyArchive;

  /// No description provided for @activityPropertyUnarchive.
  ///
  /// In en, this message translates to:
  /// **'restored archived property'**
  String get activityPropertyUnarchive;

  /// No description provided for @activityPropertyTrash.
  ///
  /// In en, this message translates to:
  /// **'moved property to trash'**
  String get activityPropertyTrash;

  /// No description provided for @activityPropertyRestore.
  ///
  /// In en, this message translates to:
  /// **'restored property from trash'**
  String get activityPropertyRestore;

  /// No description provided for @activityChangedRole.
  ///
  /// In en, this message translates to:
  /// **'changed role to {role}'**
  String activityChangedRole(String role);

  /// No description provided for @teamName.
  ///
  /// In en, this message translates to:
  /// **'Team name'**
  String get teamName;

  /// No description provided for @teamInviteColleague.
  ///
  /// In en, this message translates to:
  /// **'Invite a colleague'**
  String get teamInviteColleague;

  /// No description provided for @teamEmailAddress.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get teamEmailAddress;

  /// No description provided for @roleManager.
  ///
  /// In en, this message translates to:
  /// **'Manager'**
  String get roleManager;

  /// No description provided for @teamManagerDetail.
  ///
  /// In en, this message translates to:
  /// **'Managers can see team tenancies, assign work and manage members.'**
  String get teamManagerDetail;

  /// No description provided for @teamAgentDetail.
  ///
  /// In en, this message translates to:
  /// **'Agents work on tenancies assigned to them. Other team records stay private.'**
  String get teamAgentDetail;

  /// No description provided for @teamSendInvitation.
  ///
  /// In en, this message translates to:
  /// **'Send invitation'**
  String get teamSendInvitation;

  /// No description provided for @teamInvitationNotAccepted.
  ///
  /// In en, this message translates to:
  /// **'This invitation has not been accepted. It gives no access to team work.'**
  String get teamInvitationNotAccepted;

  /// No description provided for @teamResendInvitation.
  ///
  /// In en, this message translates to:
  /// **'Resend invitation'**
  String get teamResendInvitation;

  /// No description provided for @teamRevokeInvitation.
  ///
  /// In en, this message translates to:
  /// **'Revoke invitation'**
  String get teamRevokeInvitation;

  /// No description provided for @teamRemoveConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove {name} from {team}? Their agency access will stop. Saved work and authorship stay intact; personal properties are unaffected.'**
  String teamRemoveConfirm(String name, String team);

  /// No description provided for @teamReassignFirst.
  ///
  /// In en, this message translates to:
  /// **'Reassign {count, plural, =1{1 tenancy} other{{count} tenancies}} before removing this member.'**
  String teamReassignFirst(int count);

  /// No description provided for @teamNewResponsibleAgent.
  ///
  /// In en, this message translates to:
  /// **'New responsible agent'**
  String get teamNewResponsibleAgent;

  /// No description provided for @teamChooseMember.
  ///
  /// In en, this message translates to:
  /// **'Choose a member'**
  String get teamChooseMember;

  /// No description provided for @teamRolesExplained.
  ///
  /// In en, this message translates to:
  /// **'Owners manage the team. Managers oversee its portfolio. Agents work on assigned tenancies.'**
  String get teamRolesExplained;

  /// No description provided for @teamRemoveMember.
  ///
  /// In en, this message translates to:
  /// **'Remove member'**
  String get teamRemoveMember;

  /// No description provided for @teamSaveRole.
  ///
  /// In en, this message translates to:
  /// **'Save role'**
  String get teamSaveRole;

  /// No description provided for @roleOwner.
  ///
  /// In en, this message translates to:
  /// **'Owner'**
  String get roleOwner;

  /// No description provided for @accessRemoveTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove {name}?'**
  String accessRemoveTitle(String name);

  /// No description provided for @accessRemoveReportsBody.
  ///
  /// In en, this message translates to:
  /// **'They will lose access to their previous reports for this tenancy. Work they have already saved stays on the property.'**
  String get accessRemoveReportsBody;

  /// No description provided for @accessRemoveBody.
  ///
  /// In en, this message translates to:
  /// **'They will lose access to this tenancy and its inspections, updates and repairs. Work they have already saved stays on the property.'**
  String get accessRemoveBody;

  /// No description provided for @accessRemove.
  ///
  /// In en, this message translates to:
  /// **'Remove access'**
  String get accessRemove;

  /// No description provided for @accessPreviousReports.
  ///
  /// In en, this message translates to:
  /// **'Access to previous reports'**
  String get accessPreviousReports;

  /// No description provided for @accessReportsOnlyIntro.
  ///
  /// In en, this message translates to:
  /// **'Your access covers previous reports you worked on. The lead agent can add you as a collaborator to work on this tenancy.'**
  String get accessReportsOnlyIntro;

  /// No description provided for @accessIntro.
  ///
  /// In en, this message translates to:
  /// **'Collaborators can capture photos, edit inventory and manage repairs for this tenancy. This grants no access to other tenancies or properties.'**
  String get accessIntro;

  /// No description provided for @accessPersonalDetail.
  ///
  /// In en, this message translates to:
  /// **'This work belongs to the lead agent. Moving it into a team gives its owners and managers access.'**
  String get accessPersonalDetail;

  /// No description provided for @accessTeamDetail.
  ///
  /// In en, this message translates to:
  /// **'Team owners and managers oversee this tenancy. Assigned agents and external collaborators can work on it.'**
  String get accessTeamDetail;

  /// No description provided for @accessMoveToTeam.
  ///
  /// In en, this message translates to:
  /// **'Move to team'**
  String get accessMoveToTeam;

  /// No description provided for @accessAssignMembers.
  ///
  /// In en, this message translates to:
  /// **'Assign team members'**
  String get accessAssignMembers;

  /// No description provided for @accessLeadOnly.
  ///
  /// In en, this message translates to:
  /// **'Only the lead agent can work on this tenancy.'**
  String get accessLeadOnly;

  /// No description provided for @accessLeadAgent.
  ///
  /// In en, this message translates to:
  /// **'Lead agent'**
  String get accessLeadAgent;

  /// No description provided for @accessCanWork.
  ///
  /// In en, this message translates to:
  /// **'Can work on this tenancy'**
  String get accessCanWork;

  /// No description provided for @remove.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get remove;

  /// No description provided for @accessPreviousReportsOnly.
  ///
  /// In en, this message translates to:
  /// **'Previous reports only'**
  String get accessPreviousReportsOnly;

  /// No description provided for @accessPreviousReportsDetail.
  ///
  /// In en, this message translates to:
  /// **'These agents keep access to reports they previously worked on. They cannot work on the rest of this tenancy.'**
  String get accessPreviousReportsDetail;

  /// No description provided for @accessPreviousReportCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 previous report} other{{count} previous reports}}'**
  String accessPreviousReportCount(int count);

  /// No description provided for @accessAddCollaboratorTitle.
  ///
  /// In en, this message translates to:
  /// **'Add a collaborator'**
  String get accessAddCollaboratorTitle;

  /// No description provided for @accessAddCollaboratorDetail.
  ///
  /// In en, this message translates to:
  /// **'They can open the property after signing in to Kivilo with this email address.'**
  String get accessAddCollaboratorDetail;

  /// No description provided for @saving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get saving;

  /// No description provided for @accessAddCollaborator.
  ///
  /// In en, this message translates to:
  /// **'Add collaborator'**
  String get accessAddCollaborator;

  /// No description provided for @accessLeadManages.
  ///
  /// In en, this message translates to:
  /// **'Only the lead agent can add or remove collaborators.'**
  String get accessLeadManages;

  /// No description provided for @accessTeamManages.
  ///
  /// In en, this message translates to:
  /// **'The responsible agent and team managers can change access.'**
  String get accessTeamManages;

  /// No description provided for @accessHandoverDetail.
  ///
  /// In en, this message translates to:
  /// **'Changing the responsible agent hands over management without changing authorship or signed reports. External collaborators keep their existing access.'**
  String get accessHandoverDetail;

  /// No description provided for @accessFindMember.
  ///
  /// In en, this message translates to:
  /// **'Find a team member'**
  String get accessFindMember;

  /// No description provided for @accessTeamMember.
  ///
  /// In en, this message translates to:
  /// **'Team member'**
  String get accessTeamMember;

  /// No description provided for @accessSaveAssignment.
  ///
  /// In en, this message translates to:
  /// **'Save assignment'**
  String get accessSaveAssignment;

  /// No description provided for @accessMoveTitle.
  ///
  /// In en, this message translates to:
  /// **'Move tenancy to team?'**
  String get accessMoveTitle;

  /// No description provided for @accessMoveBody.
  ///
  /// In en, this message translates to:
  /// **'This tenancy becomes team work. Owners and managers gain access and can reassign it. Existing collaborators, signed reports and authorship are preserved. Other personal tenancies stay personal.'**
  String get accessMoveBody;

  /// No description provided for @accessCreateTeamFirst.
  ///
  /// In en, this message translates to:
  /// **'Create or join a team first in Account → Team.'**
  String get accessCreateTeamFirst;

  /// No description provided for @accessChooseTeam.
  ///
  /// In en, this message translates to:
  /// **'Choose a team'**
  String get accessChooseTeam;

  /// No description provided for @accessTeamTenancy.
  ///
  /// In en, this message translates to:
  /// **'Team tenancy · {team}'**
  String accessTeamTenancy(String team);

  /// No description provided for @accessPrivate.
  ///
  /// In en, this message translates to:
  /// **'Private'**
  String get accessPrivate;

  /// No description provided for @accessShared.
  ///
  /// In en, this message translates to:
  /// **'Shared tenancy'**
  String get accessShared;

  /// No description provided for @accessSharedWith.
  ///
  /// In en, this message translates to:
  /// **'Shared with {names}'**
  String accessSharedWith(String names);

  /// No description provided for @accessReportsSharedWith.
  ///
  /// In en, this message translates to:
  /// **'Previous reports shared with {names}'**
  String accessReportsSharedWith(String names);

  /// No description provided for @changeDamage.
  ///
  /// In en, this message translates to:
  /// **'Damage'**
  String get changeDamage;

  /// No description provided for @changeWear.
  ///
  /// In en, this message translates to:
  /// **'Wear'**
  String get changeWear;

  /// No description provided for @changeMissing.
  ///
  /// In en, this message translates to:
  /// **'Missing'**
  String get changeMissing;

  /// No description provided for @changeImproved.
  ///
  /// In en, this message translates to:
  /// **'Improved'**
  String get changeImproved;

  /// No description provided for @changeUnchanged.
  ///
  /// In en, this message translates to:
  /// **'Unchanged'**
  String get changeUnchanged;

  /// No description provided for @verdictUndecided.
  ///
  /// In en, this message translates to:
  /// **'Undecided'**
  String get verdictUndecided;

  /// No description provided for @verdictTenantLiable.
  ///
  /// In en, this message translates to:
  /// **'Tenant liable'**
  String get verdictTenantLiable;

  /// No description provided for @verdictFairWear.
  ///
  /// In en, this message translates to:
  /// **'Fair wear'**
  String get verdictFairWear;

  /// No description provided for @verdictDisputed.
  ///
  /// In en, this message translates to:
  /// **'Disputed'**
  String get verdictDisputed;

  /// No description provided for @roomAddTitle.
  ///
  /// In en, this message translates to:
  /// **'Add a room'**
  String get roomAddTitle;

  /// No description provided for @roomName.
  ///
  /// In en, this message translates to:
  /// **'Room name'**
  String get roomName;

  /// No description provided for @stillUploading.
  ///
  /// In en, this message translates to:
  /// **'Still uploading'**
  String get stillUploading;

  /// No description provided for @stillUploadingBody.
  ///
  /// In en, this message translates to:
  /// **'Some photos, videos or changes have not uploaded yet. Open the rooms and tap Retry uploads before sending for signature.'**
  String get stillUploadingBody;

  /// No description provided for @sendForSignatureTitle.
  ///
  /// In en, this message translates to:
  /// **'Send for signature?'**
  String get sendForSignatureTitle;

  /// No description provided for @sendForSignatureBody.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{The room has been reviewed.} other{All {count} rooms have been reviewed.}} Sending freezes the inventory, captions and photo marks. Review the report with both parties before they sign.'**
  String sendForSignatureBody(int count);

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @signingLinkSent.
  ///
  /// In en, this message translates to:
  /// **'Signing link on its way to {name}'**
  String signingLinkSent(String name);

  /// No description provided for @pdfNoViewer.
  ///
  /// In en, this message translates to:
  /// **'Install a PDF viewer to open this report, or use Share PDF to send it.'**
  String get pdfNoViewer;

  /// No description provided for @pdfOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open this PDF. Please try again, or use Share PDF.'**
  String get pdfOpenFailed;

  /// No description provided for @findingPhotosUnfinished.
  ///
  /// In en, this message translates to:
  /// **'Finish marking and uploading your finding photos before publishing. Reopen Add finding or Review finding to resume them.'**
  String get findingPhotosUnfinished;

  /// No description provided for @publishNoDamageTitle.
  ///
  /// In en, this message translates to:
  /// **'Publish: no damage found?'**
  String get publishNoDamageTitle;

  /// No description provided for @publishAssessmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Publish assessment?'**
  String get publishAssessmentTitle;

  /// No description provided for @publishNoDamageBody.
  ///
  /// In en, this message translates to:
  /// **'No changes are recorded between check-in and check-out. Publishing states that you checked and found no damage, and both parties see that in the shared report. Future edits require publishing a new version.'**
  String get publishNoDamageBody;

  /// No description provided for @publishAssessmentBody.
  ///
  /// In en, this message translates to:
  /// **'The reviewed findings will be visible as a dated assessment separate from the signed inventory. Future edits require publishing a new version.'**
  String get publishAssessmentBody;

  /// No description provided for @publishNoDamage.
  ///
  /// In en, this message translates to:
  /// **'Publish no damage'**
  String get publishNoDamage;

  /// No description provided for @publish.
  ///
  /// In en, this message translates to:
  /// **'Publish'**
  String get publish;

  /// No description provided for @inspection.
  ///
  /// In en, this message translates to:
  /// **'Inspection'**
  String get inspection;

  /// No description provided for @inspectionOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open this inspection. {error}'**
  String inspectionOpenFailed(String error);

  /// No description provided for @inspectionOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline copy. Open a saved room to keep capturing. Review and signatures need a connection.'**
  String get inspectionOffline;

  /// No description provided for @inspectionCheckInEyebrow.
  ///
  /// In en, this message translates to:
  /// **'CHECK-IN REPORT'**
  String get inspectionCheckInEyebrow;

  /// No description provided for @inspectionCheckOutEyebrow.
  ///
  /// In en, this message translates to:
  /// **'CHECK-OUT REPORT'**
  String get inspectionCheckOutEyebrow;

  /// No description provided for @step.
  ///
  /// In en, this message translates to:
  /// **'Step {number} of 3: {name}'**
  String step(int number, String name);

  /// No description provided for @stepComplete.
  ///
  /// In en, this message translates to:
  /// **'Step {number} of 3: {name}, complete'**
  String stepComplete(int number, String name);

  /// No description provided for @stepCurrent.
  ///
  /// In en, this message translates to:
  /// **'Step {number} of 3: {name}, current'**
  String stepCurrent(int number, String name);

  /// No description provided for @stepRooms.
  ///
  /// In en, this message translates to:
  /// **'Rooms'**
  String get stepRooms;

  /// No description provided for @stepReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get stepReview;

  /// No description provided for @stepSign.
  ///
  /// In en, this message translates to:
  /// **'Sign'**
  String get stepSign;

  /// No description provided for @inspectionSigned.
  ///
  /// In en, this message translates to:
  /// **'Signed and safely recorded.'**
  String get inspectionSigned;

  /// No description provided for @inspectionReadyToSign.
  ///
  /// In en, this message translates to:
  /// **'Ready for both parties to sign.'**
  String get inspectionReadyToSign;

  /// No description provided for @inspectionRoomsReady.
  ///
  /// In en, this message translates to:
  /// **'Your rooms are ready. Review, then send.'**
  String get inspectionRoomsReady;

  /// No description provided for @inspectionBuildRecord.
  ///
  /// In en, this message translates to:
  /// **'Build the record, room by room.'**
  String get inspectionBuildRecord;

  /// No description provided for @inspectionCheckEachRoom.
  ///
  /// In en, this message translates to:
  /// **'Check each room before you send.'**
  String get inspectionCheckEachRoom;

  /// No description provided for @inspectionSignedBody.
  ///
  /// In en, this message translates to:
  /// **'Both parties have signed. The agreed report is ready to view and share.'**
  String get inspectionSignedBody;

  /// No description provided for @inspectionSentBody.
  ///
  /// In en, this message translates to:
  /// **'The report is fixed. Collect signatures below, in person or by email.'**
  String get inspectionSentBody;

  /// No description provided for @inspectionRoomsReadyBody.
  ///
  /// In en, this message translates to:
  /// **'Sending fixes the inventory, captions and photo marks for both parties to sign.'**
  String get inspectionRoomsReadyBody;

  /// No description provided for @inspectionRecordingBody.
  ///
  /// In en, this message translates to:
  /// **'Start with the room inventory. Open each item to record its condition, take photos and mark details.'**
  String get inspectionRecordingBody;

  /// No description provided for @inspectionReviewBody.
  ///
  /// In en, this message translates to:
  /// **'Check the inventory against your photos and videos, then mark each room reviewed.'**
  String get inspectionReviewBody;

  /// Follows an animated number, as in 3/5 rooms reviewed.
  ///
  /// In en, this message translates to:
  /// **'/{total} rooms reviewed'**
  String roomsReviewedSuffix(int total);

  /// No description provided for @sendForSignature.
  ///
  /// In en, this message translates to:
  /// **'Send for signature'**
  String get sendForSignature;

  /// No description provided for @continueRoom.
  ///
  /// In en, this message translates to:
  /// **'Continue {room}'**
  String continueRoom(String room);

  /// No description provided for @inspectionPeople.
  ///
  /// In en, this message translates to:
  /// **'People on this report'**
  String get inspectionPeople;

  /// No description provided for @tenantHandover.
  ///
  /// In en, this message translates to:
  /// **'Tenant handover'**
  String get tenantHandover;

  /// No description provided for @viewCheckInBaseline.
  ///
  /// In en, this message translates to:
  /// **'View check-in baseline'**
  String get viewCheckInBaseline;

  /// No description provided for @reportSummary.
  ///
  /// In en, this message translates to:
  /// **'Report summary'**
  String get reportSummary;

  /// No description provided for @roomsStartFirst.
  ///
  /// In en, this message translates to:
  /// **'Start with your first room'**
  String get roomsStartFirst;

  /// No description provided for @roomsDetail.
  ///
  /// In en, this message translates to:
  /// **'Inventory and media, room by room'**
  String get roomsDetail;

  /// No description provided for @roomsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No rooms yet'**
  String get roomsEmpty;

  /// No description provided for @roomsEmptyDetail.
  ///
  /// In en, this message translates to:
  /// **'Add a room to start the inventory.'**
  String get roomsEmptyDetail;

  /// No description provided for @signatures.
  ///
  /// In en, this message translates to:
  /// **'Signatures'**
  String get signatures;

  /// No description provided for @signaturesDetail.
  ///
  /// In en, this message translates to:
  /// **'The agreed inventory is now fixed for signing.'**
  String get signaturesDetail;

  /// No description provided for @shareReport.
  ///
  /// In en, this message translates to:
  /// **'Share report'**
  String get shareReport;

  /// No description provided for @shareReportDetail.
  ///
  /// In en, this message translates to:
  /// **'A private link, or a PDF headed with your agency.'**
  String get shareReportDetail;

  /// No description provided for @shareReportSigned.
  ///
  /// In en, this message translates to:
  /// **'View or send the signed report'**
  String get shareReportSigned;

  /// No description provided for @viewPdf.
  ///
  /// In en, this message translates to:
  /// **'View PDF'**
  String get viewPdf;

  /// No description provided for @sharePdf.
  ///
  /// In en, this message translates to:
  /// **'Share PDF'**
  String get sharePdf;

  /// No description provided for @shareLink.
  ///
  /// In en, this message translates to:
  /// **'Share link'**
  String get shareLink;

  /// No description provided for @shareLinkWarning.
  ///
  /// In en, this message translates to:
  /// **'Anyone with the link can read this report.'**
  String get shareLinkWarning;

  /// No description provided for @signedReportAndUpdates.
  ///
  /// In en, this message translates to:
  /// **'Signed report and updates'**
  String get signedReportAndUpdates;

  /// No description provided for @writeUpdate.
  ///
  /// In en, this message translates to:
  /// **'Write an update'**
  String get writeUpdate;

  /// No description provided for @endOfTenancy.
  ///
  /// In en, this message translates to:
  /// **'End of tenancy'**
  String get endOfTenancy;

  /// No description provided for @endOfTenancyDetail.
  ///
  /// In en, this message translates to:
  /// **'Use this signed check-in as the baseline for a check-out.'**
  String get endOfTenancyDetail;

  /// No description provided for @startCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Start check-out'**
  String get startCheckOut;

  /// No description provided for @maintenanceHistory.
  ///
  /// In en, this message translates to:
  /// **'Maintenance history'**
  String get maintenanceHistory;

  /// No description provided for @maintenanceHistoryDetail.
  ///
  /// In en, this message translates to:
  /// **'Context for review. A person decides whether it affects a finding.'**
  String get maintenanceHistoryDetail;

  /// No description provided for @repairCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 repair} other{{count} repairs}}'**
  String repairCount(int count);

  /// No description provided for @mediaFileCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 media file} other{{count} media files}}'**
  String mediaFileCount(int count);

  /// No description provided for @costAgreed.
  ///
  /// In en, this message translates to:
  /// **'Cost agreed: {agreement}'**
  String costAgreed(String agreement);

  /// No description provided for @costPending.
  ///
  /// In en, this message translates to:
  /// **'Cost proposal waiting for an answer'**
  String get costPending;

  /// No description provided for @costDisputed.
  ///
  /// In en, this message translates to:
  /// **'Cost disputed'**
  String get costDisputed;

  /// No description provided for @costNotProposed.
  ///
  /// In en, this message translates to:
  /// **'Nobody has proposed who pays'**
  String get costNotProposed;

  /// No description provided for @costsOpen.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 repair has no agreed cost} other{{count} repairs have no agreed cost}}'**
  String costsOpen(int count);

  /// No description provided for @costsOpenBody.
  ///
  /// In en, this message translates to:
  /// **'Settle who pays on each one before the deposit is decided, or link it to a finding so the decision is made there.'**
  String get costsOpenBody;

  /// No description provided for @roomPreview.
  ///
  /// In en, this message translates to:
  /// **'{room} preview {number}'**
  String roomPreview(String room, int number);

  /// No description provided for @signed.
  ///
  /// In en, this message translates to:
  /// **'Signed'**
  String get signed;

  /// No description provided for @noEmailOnFile.
  ///
  /// In en, this message translates to:
  /// **'No email on file'**
  String get noEmailOnFile;

  /// No description provided for @signingLinkEmailed.
  ///
  /// In en, this message translates to:
  /// **'Signing link emailed {date}'**
  String signingLinkEmailed(String date);

  /// No description provided for @signingLinkQueued.
  ///
  /// In en, this message translates to:
  /// **'Emailing the signing link'**
  String get signingLinkQueued;

  /// No description provided for @signingLinkFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not email the signing link'**
  String get signingLinkFailed;

  /// No description provided for @signingLinkNotEmailed.
  ///
  /// In en, this message translates to:
  /// **'Signing link not emailed'**
  String get signingLinkNotEmailed;

  /// No description provided for @emailSigningLink.
  ///
  /// In en, this message translates to:
  /// **'Email signing link'**
  String get emailSigningLink;

  /// No description provided for @resend.
  ///
  /// In en, this message translates to:
  /// **'Resend'**
  String get resend;

  /// No description provided for @checkOutAssessment.
  ///
  /// In en, this message translates to:
  /// **'Check-out assessment'**
  String get checkOutAssessment;

  /// No description provided for @checkOutAssessmentDetail.
  ///
  /// In en, this message translates to:
  /// **'A separate, dated record of changes and responsibility.'**
  String get checkOutAssessmentDetail;

  /// No description provided for @checkOutAssessmentIntro.
  ///
  /// In en, this message translates to:
  /// **'Record each change since check-in. Findings stay private until you publish them, and the signed inventory does not change.'**
  String get checkOutAssessmentIntro;

  /// No description provided for @publishedVersion.
  ///
  /// In en, this message translates to:
  /// **'Published version {version}'**
  String publishedVersion(int version);

  /// No description provided for @findings.
  ///
  /// In en, this message translates to:
  /// **'Findings'**
  String get findings;

  /// No description provided for @findingsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No changes recorded yet'**
  String get findingsEmpty;

  /// No description provided for @findingsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 change recorded} other{{count} changes recorded}}'**
  String findingsCount(int count);

  /// No description provided for @findingUnconfirmed.
  ///
  /// In en, this message translates to:
  /// **'Unconfirmed'**
  String get findingUnconfirmed;

  /// No description provided for @findingEstimatedCost.
  ///
  /// In en, this message translates to:
  /// **'Estimated cost · SGD {amount}'**
  String findingEstimatedCost(String amount);

  /// No description provided for @findingsConfirmFirst.
  ///
  /// In en, this message translates to:
  /// **'Open and confirm each unconfirmed finding before publishing.'**
  String get findingsConfirmFirst;

  /// No description provided for @publishNoDamageFound.
  ///
  /// In en, this message translates to:
  /// **'Publish: no damage found'**
  String get publishNoDamageFound;

  /// No description provided for @publishAssessment.
  ///
  /// In en, this message translates to:
  /// **'Publish assessment'**
  String get publishAssessment;

  /// No description provided for @publishNewVersion.
  ///
  /// In en, this message translates to:
  /// **'Publish new version'**
  String get publishNewVersion;

  /// No description provided for @categoryMeter.
  ///
  /// In en, this message translates to:
  /// **'Meter'**
  String get categoryMeter;

  /// No description provided for @conditionNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get conditionNew;

  /// No description provided for @conditionGood.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get conditionGood;

  /// No description provided for @conditionFair.
  ///
  /// In en, this message translates to:
  /// **'Fair'**
  String get conditionFair;

  /// No description provided for @conditionPoor.
  ///
  /// In en, this message translates to:
  /// **'Poor'**
  String get conditionPoor;

  /// No description provided for @conditionDamaged.
  ///
  /// In en, this message translates to:
  /// **'Damaged'**
  String get conditionDamaged;

  /// No description provided for @photoActions.
  ///
  /// In en, this message translates to:
  /// **'Photo actions'**
  String get photoActions;

  /// No description provided for @videoActions.
  ///
  /// In en, this message translates to:
  /// **'Video actions'**
  String get videoActions;

  /// No description provided for @preview.
  ///
  /// In en, this message translates to:
  /// **'Preview'**
  String get preview;

  /// No description provided for @previewDetail.
  ///
  /// In en, this message translates to:
  /// **'Open the original file'**
  String get previewDetail;

  /// No description provided for @editNote.
  ///
  /// In en, this message translates to:
  /// **'Edit note'**
  String get editNote;

  /// No description provided for @noteHint.
  ///
  /// In en, this message translates to:
  /// **'Describe what this shows'**
  String get noteHint;

  /// No description provided for @markPhoto.
  ///
  /// In en, this message translates to:
  /// **'Mark photo'**
  String get markPhoto;

  /// No description provided for @markPhotoDetail.
  ///
  /// In en, this message translates to:
  /// **'Circle, point to, or draw over a detail'**
  String get markPhotoDetail;

  /// No description provided for @deleteMedia.
  ///
  /// In en, this message translates to:
  /// **'Delete media'**
  String get deleteMedia;

  /// No description provided for @photo.
  ///
  /// In en, this message translates to:
  /// **'Photo'**
  String get photo;

  /// No description provided for @deletePhotoTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this photo?'**
  String get deletePhotoTitle;

  /// No description provided for @deleteVideoTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this video?'**
  String get deleteVideoTitle;

  /// No description provided for @deleteMediaBody.
  ///
  /// In en, this message translates to:
  /// **'This removes it from the room and from any inventory item it is attached to.'**
  String get deleteMediaBody;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @deleteNamed.
  ///
  /// In en, this message translates to:
  /// **'Delete {name}?'**
  String deleteNamed(String name);

  /// No description provided for @deleteItemBody.
  ///
  /// In en, this message translates to:
  /// **'This removes the line from the inventory.'**
  String get deleteItemBody;

  /// No description provided for @nothingToRecordTitle.
  ///
  /// In en, this message translates to:
  /// **'Nothing to record in {room}?'**
  String nothingToRecordTitle(String room);

  /// No description provided for @nothingToRecordBody.
  ///
  /// In en, this message translates to:
  /// **'This marks the room reviewed with no items. The report will say nothing was recorded in this room.'**
  String get nothingToRecordBody;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @signInAgain.
  ///
  /// In en, this message translates to:
  /// **'Sign in again to continue.'**
  String get signInAgain;

  /// No description provided for @roomStillUploadingBody.
  ///
  /// In en, this message translates to:
  /// **'Some photos, videos or changes in this room have not uploaded yet. Open the item or Room media & walkthrough to finish any photo marks and retry uploads before continuing.'**
  String get roomStillUploadingBody;

  /// No description provided for @roomRename.
  ///
  /// In en, this message translates to:
  /// **'Rename room'**
  String get roomRename;

  /// No description provided for @roomActions.
  ///
  /// In en, this message translates to:
  /// **'Room actions'**
  String get roomActions;

  /// No description provided for @roomRenameDetail.
  ///
  /// In en, this message translates to:
  /// **'Change the room name'**
  String get roomRenameDetail;

  /// No description provided for @roomDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete room'**
  String get roomDelete;

  /// No description provided for @roomDeleteDetail.
  ///
  /// In en, this message translates to:
  /// **'Remove its photos, videos and inventory'**
  String get roomDeleteDetail;

  /// No description provided for @roomDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete this room?'**
  String get roomDeleteTitle;

  /// No description provided for @roomDeleteBody.
  ///
  /// In en, this message translates to:
  /// **'Its photos, videos and inventory will be removed.'**
  String get roomDeleteBody;

  /// No description provided for @room.
  ///
  /// In en, this message translates to:
  /// **'Room'**
  String get room;

  /// No description provided for @roomInventory.
  ///
  /// In en, this message translates to:
  /// **'Room inventory'**
  String get roomInventory;

  /// No description provided for @roomOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open this room. {error}'**
  String roomOpenFailed(String error);

  /// No description provided for @atCheckIn.
  ///
  /// In en, this message translates to:
  /// **'At check-in'**
  String get atCheckIn;

  /// No description provided for @atCheckInSigned.
  ///
  /// In en, this message translates to:
  /// **'This room as it was signed'**
  String get atCheckInSigned;

  /// No description provided for @atCheckInSignedOn.
  ///
  /// In en, this message translates to:
  /// **'This room as it was signed on {date}'**
  String atCheckInSignedOn(String date);

  /// No description provided for @hide.
  ///
  /// In en, this message translates to:
  /// **'Hide'**
  String get hide;

  /// No description provided for @show.
  ///
  /// In en, this message translates to:
  /// **'Show'**
  String get show;

  /// No description provided for @inventory.
  ///
  /// In en, this message translates to:
  /// **'Inventory'**
  String get inventory;

  /// No description provided for @itemsInRoom.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item in this room} other{{count} items in this room}}'**
  String itemsInRoom(int count);

  /// No description provided for @inventoryEmpty.
  ///
  /// In en, this message translates to:
  /// **'No inventory items yet'**
  String get inventoryEmpty;

  /// No description provided for @inventoryEmptyDetail.
  ///
  /// In en, this message translates to:
  /// **'Add an item, then open it to take photos and mark details.'**
  String get inventoryEmptyDetail;

  /// No description provided for @media.
  ///
  /// In en, this message translates to:
  /// **'Media'**
  String get media;

  /// No description provided for @mediaEmptyDetail.
  ///
  /// In en, this message translates to:
  /// **'Photos and videos of this room'**
  String get mediaEmptyDetail;

  /// No description provided for @mediaOne.
  ///
  /// In en, this message translates to:
  /// **'1 photo or video'**
  String get mediaOne;

  /// No description provided for @mediaMany.
  ///
  /// In en, this message translates to:
  /// **'{count} photos and videos'**
  String mediaMany(int count);

  /// No description provided for @newestFirst.
  ///
  /// In en, this message translates to:
  /// **'Newest first'**
  String get newestFirst;

  /// No description provided for @oldestFirst.
  ///
  /// In en, this message translates to:
  /// **'Oldest first'**
  String get oldestFirst;

  /// No description provided for @roomMediaWalkthrough.
  ///
  /// In en, this message translates to:
  /// **'Room media & walkthrough'**
  String get roomMediaWalkthrough;

  /// No description provided for @mediaEmpty.
  ///
  /// In en, this message translates to:
  /// **'No photos or videos yet'**
  String get mediaEmpty;

  /// No description provided for @mediaEmptyUploading.
  ///
  /// In en, this message translates to:
  /// **'Photos and videos appear here once they upload.'**
  String get mediaEmptyUploading;

  /// No description provided for @finishRoom.
  ///
  /// In en, this message translates to:
  /// **'Finish this room'**
  String get finishRoom;

  /// No description provided for @finishRoomEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add an item, or confirm there is nothing to record in this room.'**
  String get finishRoomEmpty;

  /// No description provided for @finishRoomBody.
  ///
  /// In en, this message translates to:
  /// **'Check every item against the photos and video. Your review makes this room ready for the report.'**
  String get finishRoomBody;

  /// No description provided for @reviewedRoom.
  ///
  /// In en, this message translates to:
  /// **'I reviewed this room'**
  String get reviewedRoom;

  /// No description provided for @nothingToRecord.
  ///
  /// In en, this message translates to:
  /// **'Nothing to record'**
  String get nothingToRecord;

  /// No description provided for @roomOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline copy. Keep capturing; review edits need a connection.'**
  String get roomOffline;

  /// No description provided for @roomRecordEyebrow.
  ///
  /// In en, this message translates to:
  /// **'ROOM RECORD'**
  String get roomRecordEyebrow;

  /// No description provided for @roomCounts.
  ///
  /// In en, this message translates to:
  /// **'{items, plural, =1{1 item} other{{items} items}} · {photos, plural, =1{1 photo} other{{photos} photos}} · {videos, plural, =1{1 video} other{{videos} videos}}'**
  String roomCounts(int items, int photos, int videos);

  /// No description provided for @roomFixedBody.
  ///
  /// In en, this message translates to:
  /// **'This inventory is fixed for signing. Media remains available below.'**
  String get roomFixedBody;

  /// No description provided for @roomPendingBody.
  ///
  /// In en, this message translates to:
  /// **'Start with the inventory. Open an item to add photos and mark details.'**
  String get roomPendingBody;

  /// No description provided for @roomReviewBody.
  ///
  /// In en, this message translates to:
  /// **'Open each inventory item to check its details and add photos, then mark this room reviewed.'**
  String get roomReviewBody;

  /// No description provided for @roomReviewedBody.
  ///
  /// In en, this message translates to:
  /// **'This room has been reviewed. Open an item to update its details or add photos.'**
  String get roomReviewedBody;

  /// No description provided for @roomCapturingBody.
  ///
  /// In en, this message translates to:
  /// **'Add each item to the inventory, then open it to take photos and mark details.'**
  String get roomCapturingBody;

  /// No description provided for @video.
  ///
  /// In en, this message translates to:
  /// **'Video'**
  String get video;

  /// No description provided for @photoNumber.
  ///
  /// In en, this message translates to:
  /// **'Photo {number}'**
  String photoNumber(int number);

  /// No description provided for @videoNumber.
  ///
  /// In en, this message translates to:
  /// **'Video {number}'**
  String videoNumber(int number);

  /// A check-in field that was empty, such as no serial.
  ///
  /// In en, this message translates to:
  /// **'no {field}'**
  String fieldNone(String field);

  /// No description provided for @fieldValue.
  ///
  /// In en, this message translates to:
  /// **'{field}: {value}'**
  String fieldValue(String field, String value);

  /// No description provided for @atCheckInUpdatedPrefix.
  ///
  /// In en, this message translates to:
  /// **'At check-in, updated:'**
  String get atCheckInUpdatedPrefix;

  /// No description provided for @atCheckInPrefix.
  ///
  /// In en, this message translates to:
  /// **'At check-in:'**
  String get atCheckInPrefix;

  /// No description provided for @fieldName.
  ///
  /// In en, this message translates to:
  /// **'name'**
  String get fieldName;

  /// No description provided for @fieldSerial.
  ///
  /// In en, this message translates to:
  /// **'serial'**
  String get fieldSerial;

  /// No description provided for @fieldReading.
  ///
  /// In en, this message translates to:
  /// **'reading'**
  String get fieldReading;

  /// No description provided for @fieldNotes.
  ///
  /// In en, this message translates to:
  /// **'notes'**
  String get fieldNotes;

  /// No description provided for @openItem.
  ///
  /// In en, this message translates to:
  /// **'Open item'**
  String get openItem;

  /// No description provided for @deleteItem.
  ///
  /// In en, this message translates to:
  /// **'Delete item'**
  String get deleteItem;

  /// No description provided for @quantityShort.
  ///
  /// In en, this message translates to:
  /// **'Qty {count}'**
  String quantityShort(int count);

  /// No description provided for @identifierLine.
  ///
  /// In en, this message translates to:
  /// **'Identifier  {value}'**
  String identifierLine(String value);

  /// No description provided for @readingLine.
  ///
  /// In en, this message translates to:
  /// **'Reading  {value}'**
  String readingLine(String value);

  /// No description provided for @attachedMedia.
  ///
  /// In en, this message translates to:
  /// **'Attached media'**
  String get attachedMedia;

  /// No description provided for @markedPhotoNumber.
  ///
  /// In en, this message translates to:
  /// **'Marked photo {number}'**
  String markedPhotoNumber(int number);

  /// No description provided for @openAttachedTo.
  ///
  /// In en, this message translates to:
  /// **'Open {label} attached to {item}'**
  String openAttachedTo(String label, String item);

  /// No description provided for @backToMediaActions.
  ///
  /// In en, this message translates to:
  /// **'Back to media actions'**
  String get backToMediaActions;

  /// No description provided for @note.
  ///
  /// In en, this message translates to:
  /// **'Note'**
  String get note;

  /// No description provided for @saveNote.
  ///
  /// In en, this message translates to:
  /// **'Save note'**
  String get saveNote;

  /// No description provided for @itemNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Enter an item name and quantity of at least one.'**
  String get itemNameRequired;

  /// No description provided for @editItem.
  ///
  /// In en, this message translates to:
  /// **'Edit inventory item'**
  String get editItem;

  /// No description provided for @editItemDetail.
  ///
  /// In en, this message translates to:
  /// **'Describe this item. Take photos from its inventory page.'**
  String get editItemDetail;

  /// No description provided for @condition.
  ///
  /// In en, this message translates to:
  /// **'Condition'**
  String get condition;

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantity;

  /// No description provided for @makeModelSerial.
  ///
  /// In en, this message translates to:
  /// **'Make, model or serial'**
  String get makeModelSerial;

  /// No description provided for @meterReading.
  ///
  /// In en, this message translates to:
  /// **'Meter reading'**
  String get meterReading;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @hideRoomMedia.
  ///
  /// In en, this message translates to:
  /// **'Hide existing room media'**
  String get hideRoomMedia;

  /// No description provided for @linkRoomMedia.
  ///
  /// In en, this message translates to:
  /// **'Link existing room media'**
  String get linkRoomMedia;

  /// No description provided for @finishUploadingBeforeLink.
  ///
  /// In en, this message translates to:
  /// **'Finish uploading this room’s photos before linking existing media.'**
  String get finishUploadingBeforeLink;

  /// No description provided for @linkRoomMediaDetail.
  ///
  /// In en, this message translates to:
  /// **'Choose the room photos and videos that support this inventory line. Their notes and photo marks stay attached.'**
  String get linkRoomMediaDetail;

  /// No description provided for @noRoomMedia.
  ///
  /// In en, this message translates to:
  /// **'No media in this room yet.'**
  String get noRoomMedia;

  /// No description provided for @hasPhotoMarks.
  ///
  /// In en, this message translates to:
  /// **'Has photo marks'**
  String get hasPhotoMarks;

  /// No description provided for @saveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get saveChanges;

  /// No description provided for @captureCheckFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not check saved media. {error}'**
  String captureCheckFailed(String error);

  /// No description provided for @captureAccountChanged.
  ///
  /// In en, this message translates to:
  /// **'Account changed. Open this room again.'**
  String get captureAccountChanged;

  /// No description provided for @captureRoomNotLoaded.
  ///
  /// In en, this message translates to:
  /// **'Room has not been loaded on this phone. Connect once to open it.'**
  String get captureRoomNotLoaded;

  /// No description provided for @captureSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save that photo or video. {error}'**
  String captureSaveFailed(String error);

  /// No description provided for @captureAddFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not add that photo or video. {error}'**
  String captureAddFailed(String error);

  /// No description provided for @uploadPausedError.
  ///
  /// In en, this message translates to:
  /// **'Upload paused. {error}'**
  String uploadPausedError(String error);

  /// No description provided for @mediaActions.
  ///
  /// In en, this message translates to:
  /// **'Media actions'**
  String get mediaActions;

  /// No description provided for @playVideo.
  ///
  /// In en, this message translates to:
  /// **'Play video'**
  String get playVideo;

  /// No description provided for @markPhotoDetailShort.
  ///
  /// In en, this message translates to:
  /// **'Circle or point to a detail'**
  String get markPhotoDetailShort;

  /// No description provided for @capturePhotoNotFoundNote.
  ///
  /// In en, this message translates to:
  /// **'Could not find this photo. Please try the note again.'**
  String get capturePhotoNotFoundNote;

  /// No description provided for @capturePhotoOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open this photo. Please retry when connected.'**
  String get capturePhotoOpenFailed;

  /// No description provided for @savePhoto.
  ///
  /// In en, this message translates to:
  /// **'Save photo'**
  String get savePhoto;

  /// No description provided for @capturePhotoNotFoundMarks.
  ///
  /// In en, this message translates to:
  /// **'Could not find this photo. Please try the marks again.'**
  String get capturePhotoNotFoundMarks;

  /// No description provided for @captureNotFoundDelete.
  ///
  /// In en, this message translates to:
  /// **'Could not find this photo or video. Please try deleting it again.'**
  String get captureNotFoundDelete;

  /// No description provided for @captureWaitForSave.
  ///
  /// In en, this message translates to:
  /// **'Wait for the photo or video to finish saving.'**
  String get captureWaitForSave;

  /// No description provided for @captureNotUploaded.
  ///
  /// In en, this message translates to:
  /// **'Some photos, videos or changes have not uploaded yet. Try again when you have signal.'**
  String get captureNotUploaded;

  /// No description provided for @captureReviewFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open review. {error}'**
  String captureReviewFailed(String error);

  /// No description provided for @captureMarksFailed.
  ///
  /// In en, this message translates to:
  /// **'The photo uploaded, but its marks did not. Try again, or edit the marks.'**
  String get captureMarksFailed;

  /// No description provided for @finishMarking.
  ///
  /// In en, this message translates to:
  /// **'Finish marking'**
  String get finishMarking;

  /// Follows an animated number, as in 2.1 MB of 4.0 MB.
  ///
  /// In en, this message translates to:
  /// **' {unit} of {total} {totalUnit}'**
  String uploadSizeSuffix(String unit, String total, String totalUnit);

  /// No description provided for @roomMedia.
  ///
  /// In en, this message translates to:
  /// **'Room media'**
  String get roomMedia;

  /// No description provided for @atCheckInDate.
  ///
  /// In en, this message translates to:
  /// **'At check-in · {date}'**
  String atCheckInDate(String date);

  /// No description provided for @retryUploads.
  ///
  /// In en, this message translates to:
  /// **'Retry uploads'**
  String get retryUploads;

  /// No description provided for @atCheckInLine.
  ///
  /// In en, this message translates to:
  /// **'At check-in: {name} · {condition} · Qty {count}'**
  String atCheckInLine(String name, String condition, int count);

  /// No description provided for @serialAtCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Serial / model at check-in: {value}'**
  String serialAtCheckIn(String value);

  /// No description provided for @meterAtCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Meter at check-in: {value}'**
  String meterAtCheckIn(String value);

  /// No description provided for @checkInNotes.
  ///
  /// In en, this message translates to:
  /// **'Check-in notes: {value}'**
  String checkInNotes(String value);

  /// No description provided for @serialModel.
  ///
  /// In en, this message translates to:
  /// **'Serial / model: {value}'**
  String serialModel(String value);

  /// No description provided for @meterReadingValue.
  ///
  /// In en, this message translates to:
  /// **'Meter reading: {value}'**
  String meterReadingValue(String value);

  /// No description provided for @editDetails.
  ///
  /// In en, this message translates to:
  /// **'Edit details'**
  String get editDetails;

  /// No description provided for @photosAndVideo.
  ///
  /// In en, this message translates to:
  /// **'Photos & video'**
  String get photosAndVideo;

  /// No description provided for @captureRoomIntro.
  ///
  /// In en, this message translates to:
  /// **'Record a room walkthrough or manage existing room media.'**
  String get captureRoomIntro;

  /// No description provided for @captureItemIntro.
  ///
  /// In en, this message translates to:
  /// **'Take a photo, add any marks, then save. It is attached to this item automatically.'**
  String get captureItemIntro;

  /// No description provided for @captureOffline.
  ///
  /// In en, this message translates to:
  /// **'Offline. Photos and videos stay on this phone and upload when you have signal.'**
  String get captureOffline;

  /// No description provided for @captureInterrupted.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{A photo or video was} other{{count} photos or videos were}} interrupted while saving. Do not uninstall Kivilo or clear its data, so nothing is lost.'**
  String captureInterrupted(int count);

  /// No description provided for @editsWaiting.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{A change is} other{{count} changes are}} waiting to upload. Tap to try again.'**
  String editsWaiting(int count);

  /// No description provided for @photos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get photos;

  /// No description provided for @recordVideo.
  ///
  /// In en, this message translates to:
  /// **'Record video'**
  String get recordVideo;

  /// No description provided for @takeAnotherPhoto.
  ///
  /// In en, this message translates to:
  /// **'Take another photo'**
  String get takeAnotherPhoto;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take a photo'**
  String get takePhoto;

  /// No description provided for @chooseVideo.
  ///
  /// In en, this message translates to:
  /// **'Choose video'**
  String get chooseVideo;

  /// No description provided for @choosePhotos.
  ///
  /// In en, this message translates to:
  /// **'Choose photos'**
  String get choosePhotos;

  /// No description provided for @itemMedia.
  ///
  /// In en, this message translates to:
  /// **'Item media'**
  String get itemMedia;

  /// No description provided for @captureSavedFirst.
  ///
  /// In en, this message translates to:
  /// **'Saved on your phone first, then added to the report'**
  String get captureSavedFirst;

  /// No description provided for @captureReviewWaits.
  ///
  /// In en, this message translates to:
  /// **'Review opens once this room’s photos, videos and changes have uploaded. Your media stays saved on this phone while you wait for signal.'**
  String get captureReviewWaits;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @reviewRoom.
  ///
  /// In en, this message translates to:
  /// **'Review room'**
  String get reviewRoom;

  /// No description provided for @photoOnPhone.
  ///
  /// In en, this message translates to:
  /// **'Photo on this phone'**
  String get photoOnPhone;

  /// No description provided for @videoOnPhone.
  ///
  /// In en, this message translates to:
  /// **'Video on this phone'**
  String get videoOnPhone;

  /// No description provided for @inTheReport.
  ///
  /// In en, this message translates to:
  /// **'In the report'**
  String get inTheReport;

  /// No description provided for @uploadedUpdating.
  ///
  /// In en, this message translates to:
  /// **'Uploaded · updating report'**
  String get uploadedUpdating;

  /// No description provided for @readyToMark.
  ///
  /// In en, this message translates to:
  /// **'Ready to mark'**
  String get readyToMark;

  /// No description provided for @marksNeedAttention.
  ///
  /// In en, this message translates to:
  /// **'Marks need attention'**
  String get marksNeedAttention;

  /// No description provided for @uploadPaused.
  ///
  /// In en, this message translates to:
  /// **'Upload paused'**
  String get uploadPaused;

  /// No description provided for @preparingUpload.
  ///
  /// In en, this message translates to:
  /// **'Preparing secure upload'**
  String get preparingUpload;

  /// No description provided for @uploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading'**
  String get uploading;

  /// No description provided for @addingToRoom.
  ///
  /// In en, this message translates to:
  /// **'Adding to room'**
  String get addingToRoom;

  /// No description provided for @addingToItem.
  ///
  /// In en, this message translates to:
  /// **'Adding to item'**
  String get addingToItem;

  /// No description provided for @uploadingNotes.
  ///
  /// In en, this message translates to:
  /// **'Uploading notes and marks'**
  String get uploadingNotes;

  /// No description provided for @savedWaiting.
  ///
  /// In en, this message translates to:
  /// **'Saved safely · waiting to upload'**
  String get savedWaiting;

  /// No description provided for @photoNote.
  ///
  /// In en, this message translates to:
  /// **'Photo note'**
  String get photoNote;

  /// No description provided for @photoNoteDetail.
  ///
  /// In en, this message translates to:
  /// **'Describe what the viewer should notice in this photo.'**
  String get photoNoteDetail;

  /// No description provided for @photoNoteHint.
  ///
  /// In en, this message translates to:
  /// **'For example: chip beside the sink'**
  String get photoNoteHint;

  /// No description provided for @disputeMoveIn.
  ///
  /// In en, this message translates to:
  /// **'Dispute move-in condition'**
  String get disputeMoveIn;

  /// No description provided for @disputeMoveInLabel.
  ///
  /// In en, this message translates to:
  /// **'What do you disagree with?'**
  String get disputeMoveInLabel;

  /// No description provided for @disputeMoveInHelper.
  ///
  /// In en, this message translates to:
  /// **'Your reason stays on the dated notice.'**
  String get disputeMoveInHelper;

  /// No description provided for @recordDispute.
  ///
  /// In en, this message translates to:
  /// **'Record dispute'**
  String get recordDispute;

  /// No description provided for @handPhoneTo.
  ///
  /// In en, this message translates to:
  /// **'Hand the phone to {name}'**
  String handPhoneTo(String name);

  /// No description provided for @acknowledgeInPersonBody.
  ///
  /// In en, this message translates to:
  /// **'{name}, the {role}, has read Update {number}: {title}. Tapping below records that they acknowledged it in person, with the time and the exact content shown. It is not a new signature on the report.'**
  String acknowledgeInPersonBody(
    String name,
    String role,
    int number,
    String title,
  );

  /// No description provided for @acknowledgeUpdate.
  ///
  /// In en, this message translates to:
  /// **'I acknowledge this update'**
  String get acknowledgeUpdate;

  /// No description provided for @disputeDeductions.
  ///
  /// In en, this message translates to:
  /// **'Dispute the deductions'**
  String get disputeDeductions;

  /// No description provided for @partyDisputesDeductions.
  ///
  /// In en, this message translates to:
  /// **'{name} disputes the deductions'**
  String partyDisputesDeductions(String name);

  /// No description provided for @disputeDeductionsLabel.
  ///
  /// In en, this message translates to:
  /// **'What is disputed, and why?'**
  String get disputeDeductionsLabel;

  /// No description provided for @disputeDeductionsHelper.
  ///
  /// In en, this message translates to:
  /// **'The reason is recorded beside the statement.'**
  String get disputeDeductionsHelper;

  /// No description provided for @agreeInPersonBody.
  ///
  /// In en, this message translates to:
  /// **'{name}, the {role}, has read the deposit statement. Tapping below records that they agreed to the deductions in person, with the time and the exact statement shown.'**
  String agreeInPersonBody(String name, String role);

  /// No description provided for @agreeDeductions.
  ///
  /// In en, this message translates to:
  /// **'Agree to the deductions'**
  String get agreeDeductions;

  /// No description provided for @money.
  ///
  /// In en, this message translates to:
  /// **'S\${amount}'**
  String money(String amount);

  /// No description provided for @depositStatement.
  ///
  /// In en, this message translates to:
  /// **'Deposit statement'**
  String get depositStatement;

  /// No description provided for @deposit.
  ///
  /// In en, this message translates to:
  /// **'Deposit'**
  String get deposit;

  /// No description provided for @deductionsLine.
  ///
  /// In en, this message translates to:
  /// **'Deductions ({count} of {total, plural, =1{1 finding} other{{total} findings}}, tenant liable)'**
  String deductionsLine(int count, int total);

  /// No description provided for @toReturnToTenant.
  ///
  /// In en, this message translates to:
  /// **'To return to the tenant'**
  String get toReturnToTenant;

  /// No description provided for @deductionsExceed.
  ///
  /// In en, this message translates to:
  /// **'Deductions exceed the deposit by'**
  String get deductionsExceed;

  /// No description provided for @answerAgreed.
  ///
  /// In en, this message translates to:
  /// **'agreed'**
  String get answerAgreed;

  /// No description provided for @answerDisputed.
  ///
  /// In en, this message translates to:
  /// **'disputed'**
  String get answerDisputed;

  /// No description provided for @answerNotYet.
  ///
  /// In en, this message translates to:
  /// **'not answered yet'**
  String get answerNotYet;

  /// No description provided for @inPersonSuffix.
  ///
  /// In en, this message translates to:
  /// **' in person'**
  String get inPersonSuffix;

  /// No description provided for @depositRecordsOnly.
  ///
  /// In en, this message translates to:
  /// **'Kivilo records each answer. It does not hold or move the deposit.'**
  String get depositRecordsOnly;

  /// No description provided for @recording.
  ///
  /// In en, this message translates to:
  /// **'Recording…'**
  String get recording;

  /// No description provided for @iAgreeDeductions.
  ///
  /// In en, this message translates to:
  /// **'I agree to the deductions'**
  String get iAgreeDeductions;

  /// No description provided for @dispute.
  ///
  /// In en, this message translates to:
  /// **'Dispute'**
  String get dispute;

  /// No description provided for @inPersonParty.
  ///
  /// In en, this message translates to:
  /// **'In person: {role} {name}'**
  String inPersonParty(String role, String name);

  /// No description provided for @agrees.
  ///
  /// In en, this message translates to:
  /// **'Agrees'**
  String get agrees;

  /// No description provided for @disputes.
  ///
  /// In en, this message translates to:
  /// **'Disputes'**
  String get disputes;

  /// No description provided for @report.
  ///
  /// In en, this message translates to:
  /// **'Report'**
  String get report;

  /// No description provided for @propertyReport.
  ///
  /// In en, this message translates to:
  /// **'Property report'**
  String get propertyReport;

  /// No description provided for @signAsLandlord.
  ///
  /// In en, this message translates to:
  /// **'Sign as landlord'**
  String get signAsLandlord;

  /// No description provided for @signAsTenant.
  ///
  /// In en, this message translates to:
  /// **'Sign as tenant'**
  String get signAsTenant;

  /// No description provided for @signedByBoth.
  ///
  /// In en, this message translates to:
  /// **'Signed by both parties · {date}'**
  String signedByBoth(String date);

  /// No description provided for @dateRange.
  ///
  /// In en, this message translates to:
  /// **'{start} to {end}'**
  String dateRange(String start, String end);

  /// No description provided for @inspected.
  ///
  /// In en, this message translates to:
  /// **'Inspected'**
  String get inspected;

  /// No description provided for @notRecorded.
  ///
  /// In en, this message translates to:
  /// **'Not recorded'**
  String get notRecorded;

  /// No description provided for @byName.
  ///
  /// In en, this message translates to:
  /// **'by {name}'**
  String byName(String name);

  /// No description provided for @agreedAndSigned.
  ///
  /// In en, this message translates to:
  /// **'Agreed and signed'**
  String get agreedAndSigned;

  /// No description provided for @notCountersigned.
  ///
  /// In en, this message translates to:
  /// **'Not yet countersigned.'**
  String get notCountersigned;

  /// No description provided for @updatesSinceSigning.
  ///
  /// In en, this message translates to:
  /// **'Updates since signing'**
  String get updatesSinceSigning;

  /// No description provided for @updatesSinceSigningDetail.
  ///
  /// In en, this message translates to:
  /// **'Recorded beside the signed report, which they do not change. Updates count once acknowledged. A move-in condition notice counts once the landlord accepts it.'**
  String get updatesSinceSigningDetail;

  /// No description provided for @reportFooter.
  ///
  /// In en, this message translates to:
  /// **'Rooms and items in this report were written by the inspector against a recorded walkthrough and agreed by the people named above. Where a photograph carries marks, the inspector drew them to point out a detail; they are recorded separately and nothing has been painted onto the photograph itself.'**
  String get reportFooter;

  /// No description provided for @nothingRecordedInRoom.
  ///
  /// In en, this message translates to:
  /// **'Nothing recorded in this room.'**
  String get nothingRecordedInRoom;

  /// No description provided for @readingValue.
  ///
  /// In en, this message translates to:
  /// **'Reading: {value}'**
  String readingValue(String value);

  /// No description provided for @roomPhoto.
  ///
  /// In en, this message translates to:
  /// **'{room} photo'**
  String roomPhoto(String room);

  /// No description provided for @areasMarked.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 area marked} other{{count} areas marked}}'**
  String areasMarked(int count);

  /// No description provided for @signatureOf.
  ///
  /// In en, this message translates to:
  /// **'Signature of {name}'**
  String signatureOf(String name);

  /// No description provided for @signedOn.
  ///
  /// In en, this message translates to:
  /// **'Signed {date}'**
  String signedOn(String date);

  /// No description provided for @updatedOn.
  ///
  /// In en, this message translates to:
  /// **'Updated {date} · Update {number}'**
  String updatedOn(String date, int number);

  /// No description provided for @pendingAcknowledgement.
  ///
  /// In en, this message translates to:
  /// **'Pending acknowledgement'**
  String get pendingAcknowledgement;

  /// No description provided for @moveInConditionLine.
  ///
  /// In en, this message translates to:
  /// **'Tenant move-in condition · Reported {reported} · Deadline {deadline}'**
  String moveInConditionLine(String reported, String deadline);

  /// No description provided for @disputedByOn.
  ///
  /// In en, this message translates to:
  /// **'Disputed by {name} on {date}'**
  String disputedByOn(String name, String date);

  /// No description provided for @disputedNoticeKept.
  ///
  /// In en, this message translates to:
  /// **'This notice is kept on the report and excluded from the agreed condition for check-out.'**
  String get disputedNoticeKept;

  /// No description provided for @publishedByOn.
  ///
  /// In en, this message translates to:
  /// **'Published by {name}, {date}'**
  String publishedByOn(String name, String date);

  /// No description provided for @conditionReported.
  ///
  /// In en, this message translates to:
  /// **'Condition reported: {name}'**
  String conditionReported(String name);

  /// No description provided for @itemFallback.
  ///
  /// In en, this message translates to:
  /// **'Item'**
  String get itemFallback;

  /// No description provided for @wasValue.
  ///
  /// In en, this message translates to:
  /// **'Was: {value}'**
  String wasValue(String value);

  /// No description provided for @fromRepairRecord.
  ///
  /// In en, this message translates to:
  /// **'From the repair record: {title}'**
  String fromRepairRecord(String title);

  /// No description provided for @agreePresentAtMoveIn.
  ///
  /// In en, this message translates to:
  /// **'I agree this was present at move-in'**
  String get agreePresentAtMoveIn;

  /// No description provided for @assessmentVersionLine.
  ///
  /// In en, this message translates to:
  /// **'Version {version}, published {date}. Separate from the signed inventory above.'**
  String assessmentVersionLine(int version, String date);

  /// No description provided for @liabilitySummary.
  ///
  /// In en, this message translates to:
  /// **'{count} of {total, plural, =1{1 finding assesses} other{{total} findings assess}} tenant liability, totalling S\${claim} against a deposit of S\${deposit}.'**
  String liabilitySummary(int count, int total, String claim, String deposit);

  /// No description provided for @findingPhotos.
  ///
  /// In en, this message translates to:
  /// **'Finding photos'**
  String get findingPhotos;

  /// No description provided for @openFindingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Open finding photo: {name}'**
  String openFindingPhoto(String name);

  /// No description provided for @maintenanceRecord.
  ///
  /// In en, this message translates to:
  /// **'Maintenance record: {title}'**
  String maintenanceRecord(String title);

  /// No description provided for @findingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Finding photo'**
  String get findingPhoto;

  /// No description provided for @itemCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 item} other{{count} items}}'**
  String itemCount(int count);

  /// No description provided for @findingAlreadySaved.
  ///
  /// In en, this message translates to:
  /// **'This finding was already saved. Save to apply any further changes to it.'**
  String get findingAlreadySaved;

  /// No description provided for @findingDraftSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save the finding draft on this phone. {error}'**
  String findingDraftSaveFailed(String error);

  /// No description provided for @chooseItemFirst.
  ///
  /// In en, this message translates to:
  /// **'Choose an item first.'**
  String get chooseItemFirst;

  /// No description provided for @describeChange.
  ///
  /// In en, this message translates to:
  /// **'Describe what changed and why.'**
  String get describeChange;

  /// No description provided for @costInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a cost with up to 2 decimal places.'**
  String get costInvalid;

  /// No description provided for @photoDraftNotReady.
  ///
  /// In en, this message translates to:
  /// **'Wait until the photo draft is ready.'**
  String get photoDraftNotReady;

  /// No description provided for @findingSavedOriginalItem.
  ///
  /// In en, this message translates to:
  /// **'This finding was already saved for its original item. Choose that item to save your latest text, or discard this draft and add another finding.'**
  String get findingSavedOriginalItem;

  /// No description provided for @findingSavedDraftKept.
  ///
  /// In en, this message translates to:
  /// **'This finding was already saved. Your latest draft is kept. Reopen the saved finding to make further changes.'**
  String get findingSavedDraftKept;

  /// No description provided for @photoOpenRetry.
  ///
  /// In en, this message translates to:
  /// **'Connect and retry to open this photo. Its upload is kept on this phone.'**
  String get photoOpenRetry;

  /// No description provided for @photoViewRetry.
  ///
  /// In en, this message translates to:
  /// **'Connect and retry to view this photo.'**
  String get photoViewRetry;

  /// No description provided for @photoCaption.
  ///
  /// In en, this message translates to:
  /// **'Photo caption'**
  String get photoCaption;

  /// No description provided for @caption.
  ///
  /// In en, this message translates to:
  /// **'Caption'**
  String get caption;

  /// No description provided for @saveCaption.
  ///
  /// In en, this message translates to:
  /// **'Save caption'**
  String get saveCaption;

  /// No description provided for @discardDraftTitle.
  ///
  /// In en, this message translates to:
  /// **'Discard this finding draft?'**
  String get discardDraftTitle;

  /// No description provided for @discardDraftBody.
  ///
  /// In en, this message translates to:
  /// **'The draft text and newly added photos will be removed. Saved finding photos stay with their finding.'**
  String get discardDraftBody;

  /// No description provided for @keepDraft.
  ///
  /// In en, this message translates to:
  /// **'Keep draft'**
  String get keepDraft;

  /// No description provided for @discardDraft.
  ///
  /// In en, this message translates to:
  /// **'Discard draft'**
  String get discardDraft;

  /// No description provided for @findingPhotosDetail.
  ///
  /// In en, this message translates to:
  /// **'Add evidence for this finding. Originals are kept; marks are stored beside each photo.'**
  String get findingPhotosDetail;

  /// No description provided for @takePhotoShort.
  ///
  /// In en, this message translates to:
  /// **'Take photo'**
  String get takePhotoShort;

  /// No description provided for @addFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Add from gallery'**
  String get addFromGallery;

  /// No description provided for @photoUploadPending.
  ///
  /// In en, this message translates to:
  /// **'Photo upload pending'**
  String get photoUploadPending;

  /// No description provided for @removingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Removing photo…'**
  String get removingPhoto;

  /// No description provided for @savedFinishMarking.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone · Finish marking'**
  String get savedFinishMarking;

  /// No description provided for @savedUploadFailed.
  ///
  /// In en, this message translates to:
  /// **'Saved on this phone · Upload failed. Retry when connected.'**
  String get savedUploadFailed;

  /// No description provided for @uploadingPercent.
  ///
  /// In en, this message translates to:
  /// **'Uploading {percent}%…'**
  String uploadingPercent(int percent);

  /// No description provided for @savingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Saving photo…'**
  String get savingPhoto;

  /// No description provided for @uploaded.
  ///
  /// In en, this message translates to:
  /// **'Uploaded'**
  String get uploaded;

  /// No description provided for @resumeMarking.
  ///
  /// In en, this message translates to:
  /// **'Resume marking'**
  String get resumeMarking;

  /// No description provided for @removePhoto.
  ///
  /// In en, this message translates to:
  /// **'Remove photo'**
  String get removePhoto;

  /// No description provided for @chooseAnItem.
  ///
  /// In en, this message translates to:
  /// **'Choose an item'**
  String get chooseAnItem;

  /// No description provided for @addFinding.
  ///
  /// In en, this message translates to:
  /// **'Add finding'**
  String get addFinding;

  /// No description provided for @reviewFinding.
  ///
  /// In en, this message translates to:
  /// **'Review finding'**
  String get reviewFinding;

  /// No description provided for @items.
  ///
  /// In en, this message translates to:
  /// **'Items'**
  String get items;

  /// No description provided for @searchItems.
  ///
  /// In en, this message translates to:
  /// **'Search items, rooms or serial numbers'**
  String get searchItems;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @atCheckOut.
  ///
  /// In en, this message translates to:
  /// **'At check-out'**
  String get atCheckOut;

  /// No description provided for @chooseItemMissing.
  ///
  /// In en, this message translates to:
  /// **'For an item no longer here at check-out.'**
  String get chooseItemMissing;

  /// No description provided for @chooseItemDetail.
  ///
  /// In en, this message translates to:
  /// **'Choose an item using its photos and recorded condition.'**
  String get chooseItemDetail;

  /// No description provided for @allRooms.
  ///
  /// In en, this message translates to:
  /// **'All rooms'**
  String get allRooms;

  /// No description provided for @noItemsRecorded.
  ///
  /// In en, this message translates to:
  /// **'No items recorded in this inventory.'**
  String get noItemsRecorded;

  /// No description provided for @noMatchingItems.
  ///
  /// In en, this message translates to:
  /// **'No matching items. Try another room, name or serial number.'**
  String get noMatchingItems;

  /// No description provided for @selectedItem.
  ///
  /// In en, this message translates to:
  /// **'Selected item'**
  String get selectedItem;

  /// No description provided for @changeItem.
  ///
  /// In en, this message translates to:
  /// **'Change item'**
  String get changeItem;

  /// No description provided for @hideItemDetails.
  ///
  /// In en, this message translates to:
  /// **'Hide item details'**
  String get hideItemDetails;

  /// No description provided for @showItemDetails.
  ///
  /// In en, this message translates to:
  /// **'Show item details'**
  String get showItemDetails;

  /// No description provided for @change.
  ///
  /// In en, this message translates to:
  /// **'Change'**
  String get change;

  /// No description provided for @verdict.
  ///
  /// In en, this message translates to:
  /// **'Verdict'**
  String get verdict;

  /// No description provided for @rationale.
  ///
  /// In en, this message translates to:
  /// **'Rationale'**
  String get rationale;

  /// No description provided for @maintenanceMedia.
  ///
  /// In en, this message translates to:
  /// **'Maintenance media'**
  String get maintenanceMedia;

  /// No description provided for @noLinkedMaintenance.
  ///
  /// In en, this message translates to:
  /// **'No linked maintenance record'**
  String get noLinkedMaintenance;

  /// No description provided for @estimatedCost.
  ///
  /// In en, this message translates to:
  /// **'Estimated cost (SGD)'**
  String get estimatedCost;

  /// No description provided for @removeFinding.
  ///
  /// In en, this message translates to:
  /// **'Remove finding'**
  String get removeFinding;

  /// No description provided for @saveReviewedFinding.
  ///
  /// In en, this message translates to:
  /// **'Save reviewed finding'**
  String get saveReviewedFinding;

  /// No description provided for @openSourcePhoto.
  ///
  /// In en, this message translates to:
  /// **'Open {source} photo'**
  String openSourcePhoto(String source);

  /// No description provided for @openSourcePhotoNote.
  ///
  /// In en, this message translates to:
  /// **'Open {source} photo: {note}'**
  String openSourcePhotoNote(String source, String note);

  /// No description provided for @sourcePhoto.
  ///
  /// In en, this message translates to:
  /// **'{source} photo'**
  String sourcePhoto(String source);

  /// No description provided for @serialId.
  ///
  /// In en, this message translates to:
  /// **'Serial / ID: {value}'**
  String serialId(String value);

  /// No description provided for @quantityValue.
  ///
  /// In en, this message translates to:
  /// **'Quantity: {count}'**
  String quantityValue(int count);

  /// No description provided for @meterValue.
  ///
  /// In en, this message translates to:
  /// **'Meter: {value}'**
  String meterValue(String value);

  /// No description provided for @checkInValue.
  ///
  /// In en, this message translates to:
  /// **'Check-in: {value}'**
  String checkInValue(String value);

  /// No description provided for @checkOutValue.
  ///
  /// In en, this message translates to:
  /// **'Check-out: {value}'**
  String checkOutValue(String value);

  /// No description provided for @alsoListedAtCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Also listed at check-out'**
  String get alsoListedAtCheckOut;

  /// No description provided for @noLinkedPhotos.
  ///
  /// In en, this message translates to:
  /// **'No linked photos recorded for this item.'**
  String get noLinkedPhotos;

  /// No description provided for @photoFinishingUpload.
  ///
  /// In en, this message translates to:
  /// **'Photo is finishing uploading…'**
  String get photoFinishingUpload;

  /// No description provided for @categoryPlumbing.
  ///
  /// In en, this message translates to:
  /// **'Plumbing'**
  String get categoryPlumbing;

  /// No description provided for @categoryLocksmith.
  ///
  /// In en, this message translates to:
  /// **'Locksmith'**
  String get categoryLocksmith;

  /// No description provided for @categoryElectrical.
  ///
  /// In en, this message translates to:
  /// **'Electrical'**
  String get categoryElectrical;

  /// No description provided for @categoryAirCon.
  ///
  /// In en, this message translates to:
  /// **'Air conditioning'**
  String get categoryAirCon;

  /// No description provided for @categoryStructural.
  ///
  /// In en, this message translates to:
  /// **'Structural'**
  String get categoryStructural;

  /// No description provided for @categoryPest.
  ///
  /// In en, this message translates to:
  /// **'Pest'**
  String get categoryPest;

  /// No description provided for @errorDraftSaved.
  ///
  /// In en, this message translates to:
  /// **'{error} Your draft is saved on this phone.'**
  String errorDraftSaved(String error);

  /// No description provided for @errorDraftNotSaved.
  ///
  /// In en, this message translates to:
  /// **'{error} This phone could not save your draft. Keep this screen open and try again.'**
  String errorDraftNotSaved(String error);

  /// No description provided for @propertyItemOptional.
  ///
  /// In en, this message translates to:
  /// **'Property item (optional)'**
  String get propertyItemOptional;

  /// No description provided for @noSpecificItem.
  ///
  /// In en, this message translates to:
  /// **'No specific item'**
  String get noSpecificItem;

  /// No description provided for @priorityRoutine.
  ///
  /// In en, this message translates to:
  /// **'Routine'**
  String get priorityRoutine;

  /// No description provided for @priorityUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get priorityUrgent;

  /// No description provided for @priorityDanger.
  ///
  /// In en, this message translates to:
  /// **'Danger'**
  String get priorityDanger;

  /// No description provided for @immediateDanger.
  ///
  /// In en, this message translates to:
  /// **'If someone is in immediate danger'**
  String get immediateDanger;

  /// No description provided for @immediateDangerDetail.
  ///
  /// In en, this message translates to:
  /// **'Call Police 999 or SCDF fire/ambulance 995 before reporting here.'**
  String get immediateDangerDetail;

  /// No description provided for @presentAtMoveIn.
  ///
  /// In en, this message translates to:
  /// **'It was like this when I moved in'**
  String get presentAtMoveIn;

  /// No description provided for @presentAtMoveInDetail.
  ///
  /// In en, this message translates to:
  /// **'After reporting, add photos and record the move-in condition. The landlord can accept or dispute it.'**
  String get presentAtMoveInDetail;

  /// No description provided for @shortTitle.
  ///
  /// In en, this message translates to:
  /// **'Short title'**
  String get shortTitle;

  /// No description provided for @whatHappened.
  ///
  /// In en, this message translates to:
  /// **'What happened?'**
  String get whatHappened;

  /// No description provided for @whatHappenedHelper.
  ///
  /// In en, this message translates to:
  /// **'Include when it started and what you have already tried.'**
  String get whatHappenedHelper;

  /// No description provided for @submitReport.
  ///
  /// In en, this message translates to:
  /// **'Submit report'**
  String get submitReport;

  /// No description provided for @recordMoveIn.
  ///
  /// In en, this message translates to:
  /// **'Record move-in condition'**
  String get recordMoveIn;

  /// No description provided for @recordMoveInBody.
  ///
  /// In en, this message translates to:
  /// **'Record what was already present when you moved in. This saves a dated notice with the problem description and selected photos. It counts towards the agreed condition once the landlord accepts it.'**
  String get recordMoveInBody;

  /// No description provided for @itemInCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Item in the check-in'**
  String get itemInCheckIn;

  /// No description provided for @notInCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Not listed in the check-in'**
  String get notInCheckIn;

  /// No description provided for @itemName.
  ///
  /// In en, this message translates to:
  /// **'Item name'**
  String get itemName;

  /// No description provided for @itemCategory.
  ///
  /// In en, this message translates to:
  /// **'Item category'**
  String get itemCategory;

  /// No description provided for @conditionAtMoveIn.
  ///
  /// In en, this message translates to:
  /// **'Condition when you moved in'**
  String get conditionAtMoveIn;

  /// No description provided for @chooseCondition.
  ///
  /// In en, this message translates to:
  /// **'Choose condition'**
  String get chooseCondition;

  /// No description provided for @photosToInclude.
  ///
  /// In en, this message translates to:
  /// **'Photos to include'**
  String get photosToInclude;

  /// No description provided for @beforePhoto.
  ///
  /// In en, this message translates to:
  /// **'Before photo {number}'**
  String beforePhoto(int number);

  /// No description provided for @uploadedOn.
  ///
  /// In en, this message translates to:
  /// **'Uploaded {date}'**
  String uploadedOn(String date);

  /// No description provided for @recordCondition.
  ///
  /// In en, this message translates to:
  /// **'Record condition'**
  String get recordCondition;

  /// No description provided for @recordCompletedRepair.
  ///
  /// In en, this message translates to:
  /// **'Record completed repair'**
  String get recordCompletedRepair;

  /// No description provided for @whatWasRepaired.
  ///
  /// In en, this message translates to:
  /// **'What was repaired?'**
  String get whatWasRepaired;

  /// No description provided for @costOptional.
  ///
  /// In en, this message translates to:
  /// **'Cost (optional)'**
  String get costOptional;

  /// No description provided for @costHelper.
  ///
  /// In en, this message translates to:
  /// **'Used to split the cost as agreed'**
  String get costHelper;

  /// No description provided for @costInvalidExample.
  ///
  /// In en, this message translates to:
  /// **'Enter an amount like 150 or 150.50'**
  String get costInvalidExample;

  /// No description provided for @addComment.
  ///
  /// In en, this message translates to:
  /// **'Add a comment'**
  String get addComment;

  /// No description provided for @closeWithoutAction.
  ///
  /// In en, this message translates to:
  /// **'Close without action'**
  String get closeWithoutAction;

  /// No description provided for @closeReasonHint.
  ///
  /// In en, this message translates to:
  /// **'A reason is required. Both sides see it.'**
  String get closeReasonHint;

  /// No description provided for @whatIsStillWrong.
  ///
  /// In en, this message translates to:
  /// **'What is still wrong?'**
  String get whatIsStillWrong;

  /// No description provided for @signInBeforeRecording.
  ///
  /// In en, this message translates to:
  /// **'Sign in again before recording the condition.'**
  String get signInBeforeRecording;

  /// No description provided for @photosNotUploadedMoveIn.
  ///
  /// In en, this message translates to:
  /// **'Some photos have not uploaded yet. Keep them on this phone and retry uploads before recording the move-in condition.'**
  String get photosNotUploadedMoveIn;

  /// No description provided for @disputeMoveInHint.
  ///
  /// In en, this message translates to:
  /// **'Explain what you disagree with. Your reason stays on the dated notice.'**
  String get disputeMoveInHint;

  /// No description provided for @reportedOn.
  ///
  /// In en, this message translates to:
  /// **'Reported {date}'**
  String reportedOn(String date);

  /// No description provided for @reportedOnDeadline.
  ///
  /// In en, this message translates to:
  /// **'Reported {date} · Defect deadline {deadline}'**
  String reportedOnDeadline(String date, String deadline);

  /// No description provided for @moveInDetail.
  ///
  /// In en, this message translates to:
  /// **'Add photos, then record the move-in condition as a dated notice beside the signed check-in. The landlord can accept or dispute it. The signed report stays unchanged.'**
  String get moveInDetail;

  /// No description provided for @addBeforePhotos.
  ///
  /// In en, this message translates to:
  /// **'Add before photos'**
  String get addBeforePhotos;

  /// No description provided for @addBeforePhotoFirst.
  ///
  /// In en, this message translates to:
  /// **'Add at least one uploaded before photo to continue.'**
  String get addBeforePhotoFirst;

  /// No description provided for @moveInAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted by the landlord. Included in the agreed condition for check-out.'**
  String get moveInAccepted;

  /// No description provided for @moveInDisputed.
  ///
  /// In en, this message translates to:
  /// **'Disputed by the landlord. Kept as a dated notice and excluded from the agreed condition.'**
  String get moveInDisputed;

  /// No description provided for @moveInWaiting.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the landlord to accept or dispute the condition.'**
  String get moveInWaiting;

  /// No description provided for @viewConditionNotice.
  ///
  /// In en, this message translates to:
  /// **'View dated condition notice'**
  String get viewConditionNotice;

  /// No description provided for @dangerCallFirst.
  ///
  /// In en, this message translates to:
  /// **'If anyone is in danger, call Police 999 or SCDF fire and ambulance 995 first.'**
  String get dangerCallFirst;

  /// No description provided for @whatHappenedHeading.
  ///
  /// In en, this message translates to:
  /// **'What happened'**
  String get whatHappenedHeading;

  /// No description provided for @reportedByOn.
  ///
  /// In en, this message translates to:
  /// **'Reported by {name} on {date}'**
  String reportedByOn(String name, String date);

  /// No description provided for @photosBeforeAfter.
  ///
  /// In en, this message translates to:
  /// **'Before and after the repair'**
  String get photosBeforeAfter;

  /// No description provided for @noPhotosYetRepair.
  ///
  /// In en, this message translates to:
  /// **'No photos yet. A photo of the problem now settles arguments later.'**
  String get noPhotosYetRepair;

  /// No description provided for @history.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get history;

  /// No description provided for @historyDetail.
  ///
  /// In en, this message translates to:
  /// **'Everything on this request'**
  String get historyDetail;

  /// No description provided for @comment.
  ///
  /// In en, this message translates to:
  /// **'Comment'**
  String get comment;

  /// No description provided for @waitingAcknowledge.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the landlord or agent to acknowledge'**
  String get waitingAcknowledge;

  /// No description provided for @recordRepairWhenDone.
  ///
  /// In en, this message translates to:
  /// **'Record the repair once it is done'**
  String get recordRepairWhenDone;

  /// No description provided for @waitingTenantRepair.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the tenant to repair it'**
  String get waitingTenantRepair;

  /// No description provided for @waitingLandlordRepair.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the landlord to repair it'**
  String get waitingLandlordRepair;

  /// No description provided for @checkRepair.
  ///
  /// In en, this message translates to:
  /// **'Check the repair and confirm'**
  String get checkRepair;

  /// No description provided for @waitingConfirm.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the other side to confirm the repair'**
  String get waitingConfirm;

  /// No description provided for @confirmedFixed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed fixed'**
  String get confirmedFixed;

  /// No description provided for @closedWithoutRepair.
  ///
  /// In en, this message translates to:
  /// **'Closed without a repair'**
  String get closedWithoutRepair;

  /// No description provided for @repair.
  ///
  /// In en, this message translates to:
  /// **'Repair'**
  String get repair;

  /// No description provided for @acknowledgeReport.
  ///
  /// In en, this message translates to:
  /// **'Acknowledge report'**
  String get acknowledgeReport;

  /// No description provided for @didRepairWork.
  ///
  /// In en, this message translates to:
  /// **'Did the repair work?'**
  String get didRepairWork;

  /// No description provided for @fixed.
  ///
  /// In en, this message translates to:
  /// **'Fixed'**
  String get fixed;

  /// No description provided for @notFixed.
  ///
  /// In en, this message translates to:
  /// **'Not fixed'**
  String get notFixed;

  /// No description provided for @addAfterPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add an after photo'**
  String get addAfterPhoto;

  /// No description provided for @addToReportAsUpdate.
  ///
  /// In en, this message translates to:
  /// **'Add to the report as an update'**
  String get addToReportAsUpdate;

  /// No description provided for @repairedOn.
  ///
  /// In en, this message translates to:
  /// **'Repaired {date}'**
  String repairedOn(String date);

  /// No description provided for @repairedOnCost.
  ///
  /// In en, this message translates to:
  /// **'Repaired {date} · S\${cost}'**
  String repairedOnCost(String date, String cost);

  /// No description provided for @beforeRepair.
  ///
  /// In en, this message translates to:
  /// **'Before repair'**
  String get beforeRepair;

  /// No description provided for @afterRepair.
  ///
  /// In en, this message translates to:
  /// **'After repair'**
  String get afterRepair;

  /// No description provided for @receipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get receipt;

  /// No description provided for @couldNotLoadPull.
  ///
  /// In en, this message translates to:
  /// **'Could not load. Pull to refresh the link.'**
  String get couldNotLoadPull;

  /// No description provided for @statusChanged.
  ///
  /// In en, this message translates to:
  /// **'Status changed'**
  String get statusChanged;

  /// No description provided for @repairRecorded.
  ///
  /// In en, this message translates to:
  /// **'Repair recorded'**
  String get repairRecorded;

  /// No description provided for @repairScheduled.
  ///
  /// In en, this message translates to:
  /// **'Repair scheduled'**
  String get repairScheduled;

  /// No description provided for @reportedNotFixed.
  ///
  /// In en, this message translates to:
  /// **'Reported not fixed'**
  String get reportedNotFixed;

  /// No description provided for @costProposal.
  ///
  /// In en, this message translates to:
  /// **'Cost proposal: {summary}'**
  String costProposal(String summary);

  /// No description provided for @costProposalRejected.
  ///
  /// In en, this message translates to:
  /// **'Cost proposal rejected'**
  String get costProposalRejected;

  /// No description provided for @costProposalWithdrawn.
  ///
  /// In en, this message translates to:
  /// **'Cost proposal withdrawn'**
  String get costProposalWithdrawn;

  /// No description provided for @waitingForLandlord.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the landlord'**
  String get waitingForLandlord;

  /// No description provided for @waitingForTenant.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the tenant'**
  String get waitingForTenant;

  /// No description provided for @acceptSplitTitle.
  ///
  /// In en, this message translates to:
  /// **'Accept this split?'**
  String get acceptSplitTitle;

  /// No description provided for @youAreAgreeingTo.
  ///
  /// In en, this message translates to:
  /// **'You are agreeing to'**
  String get youAreAgreeingTo;

  /// No description provided for @acceptSplitBody.
  ///
  /// In en, this message translates to:
  /// **'This becomes the agreement for this repair. Changing it later takes a new proposal that both sides accept.'**
  String get acceptSplitBody;

  /// No description provided for @accept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get accept;

  /// No description provided for @notAgreedYet.
  ///
  /// In en, this message translates to:
  /// **'Not agreed yet'**
  String get notAgreedYet;

  /// No description provided for @agreedByBoth.
  ///
  /// In en, this message translates to:
  /// **'Agreed by both sides'**
  String get agreedByBoth;

  /// No description provided for @agreedChangeProposed.
  ///
  /// In en, this message translates to:
  /// **'Agreed, change proposed'**
  String get agreedChangeProposed;

  /// No description provided for @whoPays.
  ///
  /// In en, this message translates to:
  /// **'Who pays'**
  String get whoPays;

  /// No description provided for @agreed.
  ///
  /// In en, this message translates to:
  /// **'Agreed'**
  String get agreed;

  /// No description provided for @proposedBy.
  ///
  /// In en, this message translates to:
  /// **'Proposed by {name}'**
  String proposedBy(String name);

  /// No description provided for @proposedAcceptedBy.
  ///
  /// In en, this message translates to:
  /// **'Proposed by {name}, accepted by {other}'**
  String proposedAcceptedBy(String name, String other);

  /// No description provided for @answerNeeded.
  ///
  /// In en, this message translates to:
  /// **'Your answer is needed'**
  String get answerNeeded;

  /// No description provided for @waitingForAnswer.
  ///
  /// In en, this message translates to:
  /// **'Waiting for an answer'**
  String get waitingForAnswer;

  /// No description provided for @partyProposes.
  ///
  /// In en, this message translates to:
  /// **'{party} proposes'**
  String partyProposes(String party);

  /// No description provided for @partyProposesChange.
  ///
  /// In en, this message translates to:
  /// **'{party} proposes a change'**
  String partyProposesChange(String party);

  /// No description provided for @suggestDifferent.
  ///
  /// In en, this message translates to:
  /// **'Suggest different'**
  String get suggestDifferent;

  /// No description provided for @reject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get reject;

  /// No description provided for @withdrawProposal.
  ///
  /// In en, this message translates to:
  /// **'Withdraw proposal'**
  String get withdrawProposal;

  /// No description provided for @notAgreed.
  ///
  /// In en, this message translates to:
  /// **'Not agreed'**
  String get notAgreed;

  /// No description provided for @changeNotAgreed.
  ///
  /// In en, this message translates to:
  /// **'Proposed change not agreed'**
  String get changeNotAgreed;

  /// No description provided for @rejectedWhatProposed.
  ///
  /// In en, this message translates to:
  /// **'{name} rejected what {proposer} proposed'**
  String rejectedWhatProposed(String name, String proposer);

  /// No description provided for @theOtherSide.
  ///
  /// In en, this message translates to:
  /// **'The other side'**
  String get theOtherSide;

  /// No description provided for @agreeWhoPaysNow.
  ///
  /// In en, this message translates to:
  /// **'Agree who arranges this repair and who pays for it now, so it is not an argument at check-out.'**
  String get agreeWhoPaysNow;

  /// No description provided for @proposeChange.
  ///
  /// In en, this message translates to:
  /// **'Propose a change'**
  String get proposeChange;

  /// No description provided for @makeNewProposal.
  ///
  /// In en, this message translates to:
  /// **'Make a new proposal'**
  String get makeNewProposal;

  /// No description provided for @proposeWhoPays.
  ///
  /// In en, this message translates to:
  /// **'Propose who pays'**
  String get proposeWhoPays;

  /// No description provided for @repairCost.
  ///
  /// In en, this message translates to:
  /// **'Repair cost'**
  String get repairCost;

  /// No description provided for @suggestDifferentSplit.
  ///
  /// In en, this message translates to:
  /// **'Suggest a different split'**
  String get suggestDifferentSplit;

  /// No description provided for @whoPaysQuestion.
  ///
  /// In en, this message translates to:
  /// **'Who pays?'**
  String get whoPaysQuestion;

  /// No description provided for @split.
  ///
  /// In en, this message translates to:
  /// **'Split'**
  String get split;

  /// No description provided for @fromMinorRepairCap.
  ///
  /// In en, this message translates to:
  /// **'From this tenancy\'s minor repair cap'**
  String get fromMinorRepairCap;

  /// No description provided for @landlordPaysAbove.
  ///
  /// In en, this message translates to:
  /// **'Landlord pays anything above this'**
  String get landlordPaysAbove;

  /// No description provided for @whoArranges.
  ///
  /// In en, this message translates to:
  /// **'Who arranges the repair?'**
  String get whoArranges;

  /// No description provided for @why.
  ///
  /// In en, this message translates to:
  /// **'Why?'**
  String get why;

  /// No description provided for @basis.
  ///
  /// In en, this message translates to:
  /// **'Basis'**
  String get basis;

  /// No description provided for @whyThisSplit.
  ///
  /// In en, this message translates to:
  /// **'Why this split?'**
  String get whyThisSplit;

  /// No description provided for @explainSentence.
  ///
  /// In en, this message translates to:
  /// **'Explain in a sentence'**
  String get explainSentence;

  /// No description provided for @otherSideSees.
  ///
  /// In en, this message translates to:
  /// **'The other side sees this with your proposal'**
  String get otherSideSees;

  /// No description provided for @clauseOptional.
  ///
  /// In en, this message translates to:
  /// **'Contract clause (optional)'**
  String get clauseOptional;

  /// No description provided for @clauseHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Clause 5(c)'**
  String get clauseHint;

  /// No description provided for @theyReadCounter.
  ///
  /// In en, this message translates to:
  /// **'They will read your counter-offer as'**
  String get theyReadCounter;

  /// No description provided for @theyRead.
  ///
  /// In en, this message translates to:
  /// **'They will read'**
  String get theyRead;

  /// No description provided for @sendProposal.
  ///
  /// In en, this message translates to:
  /// **'Send proposal'**
  String get sendProposal;

  /// No description provided for @rejectProposalTitle.
  ///
  /// In en, this message translates to:
  /// **'Reject this proposal'**
  String get rejectProposalTitle;

  /// No description provided for @youAreRejecting.
  ///
  /// In en, this message translates to:
  /// **'You are rejecting'**
  String get youAreRejecting;

  /// No description provided for @whyNot.
  ///
  /// In en, this message translates to:
  /// **'Why not?'**
  String get whyNot;

  /// No description provided for @whyNotHint.
  ///
  /// In en, this message translates to:
  /// **'Required. The other side sees this.'**
  String get whyNotHint;

  /// No description provided for @photoOpenFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not open this photo. {error}'**
  String photoOpenFailed(String error);

  /// No description provided for @marksSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not save marks. {error}'**
  String marksSaveFailed(String error);

  /// No description provided for @redrawMark.
  ///
  /// In en, this message translates to:
  /// **'Redraw mark {number}.'**
  String redrawMark(int number);

  /// No description provided for @markCircleHelp.
  ///
  /// In en, this message translates to:
  /// **'Draw around an issue with your finger. Kivilo will smooth it into a clean circle.'**
  String get markCircleHelp;

  /// No description provided for @markArrowHelp.
  ///
  /// In en, this message translates to:
  /// **'Draw from open space toward the issue. Tap any existing mark to edit it.'**
  String get markArrowHelp;

  /// No description provided for @markFreehandHelp.
  ///
  /// In en, this message translates to:
  /// **'Draw directly over the detail. Your freehand stroke stays exactly where you draw it.'**
  String get markFreehandHelp;

  /// No description provided for @markCircle.
  ///
  /// In en, this message translates to:
  /// **'Circle'**
  String get markCircle;

  /// No description provided for @markArrow.
  ///
  /// In en, this message translates to:
  /// **'Arrow'**
  String get markArrow;

  /// No description provided for @markFreehand.
  ///
  /// In en, this message translates to:
  /// **'Freehand'**
  String get markFreehand;

  /// No description provided for @undo.
  ///
  /// In en, this message translates to:
  /// **'Undo'**
  String get undo;

  /// No description provided for @redo.
  ///
  /// In en, this message translates to:
  /// **'Redo'**
  String get redo;

  /// No description provided for @markNumber.
  ///
  /// In en, this message translates to:
  /// **'Mark {number}'**
  String markNumber(int number);

  /// No description provided for @marksOfMax.
  ///
  /// In en, this message translates to:
  /// **'{count} of 12 marks'**
  String marksOfMax(int count);

  /// No description provided for @addNoteToMark.
  ///
  /// In en, this message translates to:
  /// **'Add a note to mark {number}'**
  String addNoteToMark(int number);

  /// No description provided for @editMark.
  ///
  /// In en, this message translates to:
  /// **'Edit mark {number}'**
  String editMark(int number);

  /// No description provided for @markNoteNew.
  ///
  /// In en, this message translates to:
  /// **'Say what this mark identifies.'**
  String get markNoteNew;

  /// No description provided for @markNoteEdit.
  ///
  /// In en, this message translates to:
  /// **'Update its note, redraw its position, or remove it.'**
  String get markNoteEdit;

  /// No description provided for @markNoteHint.
  ///
  /// In en, this message translates to:
  /// **'For example: hairline crack above socket'**
  String get markNoteHint;

  /// No description provided for @saveMark.
  ///
  /// In en, this message translates to:
  /// **'Save mark'**
  String get saveMark;

  /// No description provided for @redraw.
  ///
  /// In en, this message translates to:
  /// **'Redraw'**
  String get redraw;

  /// No description provided for @photoSavedWillUpload.
  ///
  /// In en, this message translates to:
  /// **'Photo saved on this phone. Kivilo will upload it when it can.'**
  String get photoSavedWillUpload;

  /// No description provided for @updateNeedsTitle.
  ///
  /// In en, this message translates to:
  /// **'Give the update a title before publishing.'**
  String get updateNeedsTitle;

  /// No description provided for @updateNeedsChange.
  ///
  /// In en, this message translates to:
  /// **'Add at least one change before publishing.'**
  String get updateNeedsChange;

  /// No description provided for @updatePhotosWaiting.
  ///
  /// In en, this message translates to:
  /// **'Some photos are still on this phone. Wait for them to upload before publishing.'**
  String get updatePhotosWaiting;

  /// No description provided for @publishUpdateTitle.
  ///
  /// In en, this message translates to:
  /// **'Publish this update?'**
  String get publishUpdateTitle;

  /// No description provided for @publishUpdateBody.
  ///
  /// In en, this message translates to:
  /// **'It cannot be changed afterwards, and the landlord and tenant are asked to acknowledge it.'**
  String get publishUpdateBody;

  /// No description provided for @discardUpdateTitle.
  ///
  /// In en, this message translates to:
  /// **'Discard this draft?'**
  String get discardUpdateTitle;

  /// No description provided for @discardUpdateBody.
  ///
  /// In en, this message translates to:
  /// **'Its changes and the photos uploaded to it are deleted. Published updates are not affected.'**
  String get discardUpdateBody;

  /// No description provided for @discard.
  ///
  /// In en, this message translates to:
  /// **'Discard'**
  String get discard;

  /// No description provided for @updatesIntro.
  ///
  /// In en, this message translates to:
  /// **'Record a change after signing, such as a replaced appliance, as a dated update. The signed report stays as it was; the update counts once the landlord and tenant have both acknowledged it.'**
  String get updatesIntro;

  /// No description provided for @published.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get published;

  /// No description provided for @publishedDetail.
  ///
  /// In en, this message translates to:
  /// **'Open the report to show it, or to take an acknowledgement in person.'**
  String get publishedDetail;

  /// No description provided for @updateNumberTitle.
  ///
  /// In en, this message translates to:
  /// **'Update {number}: {title}'**
  String updateNumberTitle(int number, String title);

  /// No description provided for @startUpdate.
  ///
  /// In en, this message translates to:
  /// **'Start an update'**
  String get startUpdate;

  /// No description provided for @resolvedRepairs.
  ///
  /// In en, this message translates to:
  /// **'Resolved repairs'**
  String get resolvedRepairs;

  /// No description provided for @resolvedRepairsDetail.
  ///
  /// In en, this message translates to:
  /// **'Each can start a change, with its before and after photos.'**
  String get resolvedRepairsDetail;

  /// No description provided for @draftUpdate.
  ///
  /// In en, this message translates to:
  /// **'Draft update'**
  String get draftUpdate;

  /// No description provided for @draftUpdateDetail.
  ///
  /// In en, this message translates to:
  /// **'Nobody else sees it until you publish it.'**
  String get draftUpdateDetail;

  /// No description provided for @title.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get title;

  /// No description provided for @reason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reason;

  /// No description provided for @dateOfChange.
  ///
  /// In en, this message translates to:
  /// **'Date of the change: {date}'**
  String dateOfChange(String date);

  /// No description provided for @saveDetails.
  ///
  /// In en, this message translates to:
  /// **'Save details'**
  String get saveDetails;

  /// No description provided for @addChange.
  ///
  /// In en, this message translates to:
  /// **'Add a change'**
  String get addChange;

  /// No description provided for @workingEllipsis.
  ///
  /// In en, this message translates to:
  /// **'Working…'**
  String get workingEllipsis;

  /// No description provided for @publishUpdate.
  ///
  /// In en, this message translates to:
  /// **'Publish update'**
  String get publishUpdate;

  /// No description provided for @publishFreezes.
  ///
  /// In en, this message translates to:
  /// **'Publishing freezes the update and asks the landlord and tenant to acknowledge it.'**
  String get publishFreezes;

  /// No description provided for @fromRepair.
  ///
  /// In en, this message translates to:
  /// **'From the repair: {title}'**
  String fromRepair(String title);

  /// No description provided for @photosWaitingUpload.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 photo saved on this phone, waiting to upload} other{{count} photos saved on this phone, waiting to upload}}'**
  String photosWaitingUpload(int count);

  /// No description provided for @choosePhoto.
  ///
  /// In en, this message translates to:
  /// **'Choose photo'**
  String get choosePhoto;

  /// No description provided for @chooseRoom.
  ///
  /// In en, this message translates to:
  /// **'Choose the room.'**
  String get chooseRoom;

  /// No description provided for @chooseItemReplaced.
  ///
  /// In en, this message translates to:
  /// **'Choose the item this replaces or removes.'**
  String get chooseItemReplaced;

  /// No description provided for @nameNewItem.
  ///
  /// In en, this message translates to:
  /// **'Name the new item.'**
  String get nameNewItem;

  /// No description provided for @editChange.
  ///
  /// In en, this message translates to:
  /// **'Edit change'**
  String get editChange;

  /// No description provided for @changeAdded.
  ///
  /// In en, this message translates to:
  /// **'Added'**
  String get changeAdded;

  /// No description provided for @changeReplaced.
  ///
  /// In en, this message translates to:
  /// **'Replaced'**
  String get changeReplaced;

  /// No description provided for @changeRemoved.
  ///
  /// In en, this message translates to:
  /// **'Removed'**
  String get changeRemoved;

  /// No description provided for @itemItChanges.
  ///
  /// In en, this message translates to:
  /// **'Item it changes'**
  String get itemItChanges;

  /// No description provided for @whichItem.
  ///
  /// In en, this message translates to:
  /// **'Which item?'**
  String get whichItem;

  /// No description provided for @newItem.
  ///
  /// In en, this message translates to:
  /// **'New item'**
  String get newItem;

  /// No description provided for @newItemHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Dishwasher'**
  String get newItemHint;

  /// No description provided for @makeModelAndSerial.
  ///
  /// In en, this message translates to:
  /// **'Make, model and serial'**
  String get makeModelAndSerial;

  /// No description provided for @addChangeShort.
  ///
  /// In en, this message translates to:
  /// **'Add change'**
  String get addChangeShort;

  /// No description provided for @saveChange.
  ///
  /// In en, this message translates to:
  /// **'Save change'**
  String get saveChange;

  /// No description provided for @photoPrepareFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not prepare the photo. {error}'**
  String photoPrepareFailed(String error);

  /// No description provided for @photoAddFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not add the photo. {error}'**
  String photoAddFailed(String error);

  /// No description provided for @photoSavedUploaded.
  ///
  /// In en, this message translates to:
  /// **'Photo saved and uploaded.'**
  String get photoSavedUploaded;

  /// No description provided for @photoSavedRetry.
  ///
  /// In en, this message translates to:
  /// **'Photo saved on this phone. Kivilo will retry automatically.'**
  String get photoSavedRetry;

  /// No description provided for @beforePhotos.
  ///
  /// In en, this message translates to:
  /// **'Before photos'**
  String get beforePhotos;

  /// No description provided for @afterPhotos.
  ///
  /// In en, this message translates to:
  /// **'After photos'**
  String get afterPhotos;

  /// No description provided for @addPhotosCamera.
  ///
  /// In en, this message translates to:
  /// **'Add photos with your phone’s camera'**
  String get addPhotosCamera;

  /// No description provided for @addPhotosCameraDetail.
  ///
  /// In en, this message translates to:
  /// **'Use the full native camera experience, or choose a photo you already took.'**
  String get addPhotosCameraDetail;

  /// No description provided for @chooseExistingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Choose existing photo'**
  String get chooseExistingPhoto;

  /// No description provided for @drawSignatureFirst.
  ///
  /// In en, this message translates to:
  /// **'Draw a signature first.'**
  String get drawSignatureFirst;

  /// No description provided for @uploadBeforeSigning.
  ///
  /// In en, this message translates to:
  /// **'Some photos, videos or changes have not uploaded yet. Go back to the rooms and tap Retry uploads before either person signs.'**
  String get uploadBeforeSigning;

  /// No description provided for @roleSignature.
  ///
  /// In en, this message translates to:
  /// **'{role} signature'**
  String roleSignature(String role);

  /// No description provided for @ownSignatureConfirms.
  ///
  /// In en, this message translates to:
  /// **'Your signature confirms that the report you just read records the property as it was handed over.'**
  String get ownSignatureConfirms;

  /// No description provided for @partySignatureConfirms.
  ///
  /// In en, this message translates to:
  /// **'Review the agreed inventory with this person before they sign. Their signature confirms the report as shown.'**
  String get partySignatureConfirms;

  /// No description provided for @useThisSignature.
  ///
  /// In en, this message translates to:
  /// **'Use this signature'**
  String get useThisSignature;

  /// No description provided for @drawNewOne.
  ///
  /// In en, this message translates to:
  /// **'Draw a new one'**
  String get drawNewOne;

  /// No description provided for @clearSignature.
  ///
  /// In en, this message translates to:
  /// **'Clear signature'**
  String get clearSignature;

  /// No description provided for @saveForNextTime.
  ///
  /// In en, this message translates to:
  /// **'Save for next time'**
  String get saveForNextTime;

  /// No description provided for @saveForNextTimeDetail.
  ///
  /// In en, this message translates to:
  /// **'Kept only on this phone, and removed when you sign out.'**
  String get saveForNextTimeDetail;

  /// No description provided for @confirmSignature.
  ///
  /// In en, this message translates to:
  /// **'Confirm signature'**
  String get confirmSignature;

  /// No description provided for @propertyHistory.
  ///
  /// In en, this message translates to:
  /// **'Property history'**
  String get propertyHistory;

  /// No description provided for @timelineEyebrow.
  ///
  /// In en, this message translates to:
  /// **'PROPERTY TIMELINE'**
  String get timelineEyebrow;

  /// No description provided for @timelineDetail.
  ///
  /// In en, this message translates to:
  /// **'Signed reports, repairs and agreed costs, newest first.'**
  String get timelineDetail;

  /// No description provided for @timelineEmpty.
  ///
  /// In en, this message translates to:
  /// **'Nothing has been settled here yet. Signed reports and repairs will appear as they happen.'**
  String get timelineEmpty;

  /// No description provided for @amountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid SGD amount'**
  String get amountInvalid;

  /// No description provided for @renewTenancy.
  ///
  /// In en, this message translates to:
  /// **'Renew tenancy'**
  String get renewTenancy;

  /// No description provided for @sameParties.
  ///
  /// In en, this message translates to:
  /// **'Same landlord and tenant · {tenant}'**
  String sameParties(String tenant);

  /// No description provided for @startsOn.
  ///
  /// In en, this message translates to:
  /// **'Starts {date}'**
  String startsOn(String date);

  /// No description provided for @endsOn.
  ///
  /// In en, this message translates to:
  /// **'Ends {date}'**
  String endsOn(String date);

  /// No description provided for @renewalConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm these terms with both parties first. This creates a new tenancy and a draft check-in for the same property.'**
  String get renewalConfirm;

  /// No description provided for @keepSharingRenewal.
  ///
  /// In en, this message translates to:
  /// **'Keep sharing this renewal with {names}'**
  String keepSharingRenewal(String names);

  /// No description provided for @renewalPrivate.
  ///
  /// In en, this message translates to:
  /// **'Leave unchecked to keep the new tenancy private.'**
  String get renewalPrivate;

  /// No description provided for @createRenewal.
  ///
  /// In en, this message translates to:
  /// **'Create renewal check-in'**
  String get createRenewal;

  /// No description provided for @brandingIntro.
  ///
  /// In en, this message translates to:
  /// **'Heads every PDF and shared report you prepare. Landlords and tenants see it; the signed contents of a report never change.'**
  String get brandingIntro;

  /// No description provided for @logo.
  ///
  /// In en, this message translates to:
  /// **'Logo'**
  String get logo;

  /// No description provided for @logoDetail.
  ///
  /// In en, this message translates to:
  /// **'PNG or JPEG, shown at the top left'**
  String get logoDetail;

  /// No description provided for @choose.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get choose;

  /// No description provided for @replace.
  ///
  /// In en, this message translates to:
  /// **'Replace'**
  String get replace;

  /// No description provided for @removeLogo.
  ///
  /// In en, this message translates to:
  /// **'Remove logo'**
  String get removeLogo;

  /// No description provided for @yourName.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get yourName;

  /// No description provided for @agencyName.
  ///
  /// In en, this message translates to:
  /// **'Agency name'**
  String get agencyName;

  /// No description provided for @agencyLicenceOptional.
  ///
  /// In en, this message translates to:
  /// **'Agency licence (optional)'**
  String get agencyLicenceOptional;

  /// No description provided for @ceaOptional.
  ///
  /// In en, this message translates to:
  /// **'Your CEA registration (optional)'**
  String get ceaOptional;

  /// No description provided for @phoneOptional.
  ///
  /// In en, this message translates to:
  /// **'Phone (optional)'**
  String get phoneOptional;

  /// No description provided for @partnerPipewell.
  ///
  /// In en, this message translates to:
  /// **'Leaks, blocked drains, water heaters'**
  String get partnerPipewell;

  /// No description provided for @open24Hours.
  ///
  /// In en, this message translates to:
  /// **'Open 24 hours'**
  String get open24Hours;

  /// No description provided for @partnerFernvale.
  ///
  /// In en, this message translates to:
  /// **'Burst pipes, toilets, taps and mixers'**
  String get partnerFernvale;

  /// No description provided for @daily8to10.
  ///
  /// In en, this message translates to:
  /// **'Daily 8am to 10pm'**
  String get daily8to10;

  /// No description provided for @partnerHalcyon.
  ///
  /// In en, this message translates to:
  /// **'Lockouts, lock changes, digital locks'**
  String get partnerHalcyon;

  /// No description provided for @partnerKeyline.
  ///
  /// In en, this message translates to:
  /// **'Gate locks, key cutting, safes'**
  String get partnerKeyline;

  /// No description provided for @monSat9to7.
  ///
  /// In en, this message translates to:
  /// **'Mon to Sat 9am to 7pm'**
  String get monSat9to7;

  /// No description provided for @policeEmergency.
  ///
  /// In en, this message translates to:
  /// **'Police emergency'**
  String get policeEmergency;

  /// No description provided for @fireAmbulance.
  ///
  /// In en, this message translates to:
  /// **'Fire or ambulance'**
  String get fireAmbulance;

  /// No description provided for @kiviloPartners.
  ///
  /// In en, this message translates to:
  /// **'Kivilo partners'**
  String get kiviloPartners;

  /// No description provided for @kiviloPartnersDetail.
  ///
  /// In en, this message translates to:
  /// **'Plumbers and locksmiths we work with'**
  String get kiviloPartnersDetail;

  /// No description provided for @bookingSoon.
  ///
  /// In en, this message translates to:
  /// **'Booking through Kivilo opens soon.'**
  String get bookingSoon;

  /// No description provided for @guideTitle.
  ///
  /// In en, this message translates to:
  /// **'A handover, in three steps'**
  String get guideTitle;

  /// No description provided for @guideDetail.
  ///
  /// In en, this message translates to:
  /// **'Tap a step for a little guidance.'**
  String get guideDetail;

  /// No description provided for @guideStep1.
  ///
  /// In en, this message translates to:
  /// **'Write what you see'**
  String get guideStep1;

  /// No description provided for @guideStep1Short.
  ///
  /// In en, this message translates to:
  /// **'Start with the room inventory.'**
  String get guideStep1Short;

  /// No description provided for @guideStep1Body.
  ///
  /// In en, this message translates to:
  /// **'Open a room and check its starter items. Add, edit or remove lines to match what you see, and record each item’s condition. On check-out, compare with the agreed check-in beside the inventory.'**
  String get guideStep1Body;

  /// No description provided for @guideStep2.
  ///
  /// In en, this message translates to:
  /// **'Capture the details'**
  String get guideStep2;

  /// No description provided for @guideStep2Short.
  ///
  /// In en, this message translates to:
  /// **'Open an item. Photograph its condition.'**
  String get guideStep2Short;

  /// No description provided for @guideStep2Body.
  ///
  /// In en, this message translates to:
  /// **'Open an inventory item to take photos of wear, damage, meter readings and serial labels. Each photo opens for marking and attaches to that item when you save it. Use Room media & walkthrough for room-wide photos or video. Captures stay on your phone until uploaded. Check every item, then review the room; if it has no items, confirm there is nothing to record.'**
  String get guideStep2Body;

  /// No description provided for @guideStep3.
  ///
  /// In en, this message translates to:
  /// **'Agree and sign'**
  String get guideStep3;

  /// No description provided for @guideStep3Short.
  ///
  /// In en, this message translates to:
  /// **'A shared record for both parties.'**
  String get guideStep3Short;

  /// No description provided for @guideStep3Body.
  ///
  /// In en, this message translates to:
  /// **'Let all captures finish uploading, then send for signature. Sending freezes the inventory. The landlord and tenant can sign on your phone or through their emailed link. Once both sign, the PDF is ready.'**
  String get guideStep3Body;

  /// No description provided for @handoverTitle.
  ///
  /// In en, this message translates to:
  /// **'Your tenancy in Kivilo'**
  String get handoverTitle;

  /// No description provided for @handoverLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load the handover. {error}'**
  String handoverLoadFailed(String error);

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @handoverAfterSigning.
  ///
  /// In en, this message translates to:
  /// **'The tenant handover is available after the tenant signs the check-in.'**
  String get handoverAfterSigning;

  /// No description provided for @handoverScan.
  ///
  /// In en, this message translates to:
  /// **'Scan with your phone and sign in as yourself to see your tenancy and report a problem.'**
  String get handoverScan;

  /// No description provided for @handoverQrLabel.
  ///
  /// In en, this message translates to:
  /// **'QR code for the tenant sign-in link'**
  String get handoverQrLabel;

  /// No description provided for @handoverNoDefectPeriod.
  ///
  /// In en, this message translates to:
  /// **'A move-in defect period has not been enabled for this tenancy. You can still report repairs.'**
  String get handoverNoDefectPeriod;

  /// No description provided for @handoverDefectDeadline.
  ///
  /// In en, this message translates to:
  /// **'Flag anything that was already present when you moved in by {date} (Singapore time).'**
  String handoverDefectDeadline(String date);

  /// No description provided for @handoverLinkCopied.
  ///
  /// In en, this message translates to:
  /// **'Tenant sign-in link copied'**
  String get handoverLinkCopied;

  /// No description provided for @handoverCopyLink.
  ///
  /// In en, this message translates to:
  /// **'Copy sign-in link'**
  String get handoverCopyLink;

  /// Marks a line or photo that came from an update after signing.
  ///
  /// In en, this message translates to:
  /// **'Update'**
  String get updateTag;

  /// No description provided for @openCheckInPhoto.
  ///
  /// In en, this message translates to:
  /// **'Open check-in photo {number}'**
  String openCheckInPhoto(int number);

  /// No description provided for @nothingAtCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Nothing recorded in this room at check-in.'**
  String get nothingAtCheckIn;

  /// No description provided for @openFullCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Open the full check-in'**
  String get openFullCheckIn;

  /// No description provided for @renewalRemindersFailed.
  ///
  /// In en, this message translates to:
  /// **'Renewal reminders could not be loaded. Pull down to try again.'**
  String get renewalRemindersFailed;

  /// No description provided for @renewalDue.
  ///
  /// In en, this message translates to:
  /// **'Renewal due'**
  String get renewalDue;

  /// No description provided for @dismissRenewal.
  ///
  /// In en, this message translates to:
  /// **'Dismiss renewal reminder'**
  String get dismissRenewal;

  /// No description provided for @tenancyEnds.
  ///
  /// In en, this message translates to:
  /// **'{tenant} · Tenancy ends {date}'**
  String tenancyEnds(String tenant, String date);

  /// No description provided for @startRenewal.
  ///
  /// In en, this message translates to:
  /// **'Start renewal'**
  String get startRenewal;

  /// No description provided for @notRenewing.
  ///
  /// In en, this message translates to:
  /// **'Not renewing'**
  String get notRenewing;

  /// No description provided for @remindWeek.
  ///
  /// In en, this message translates to:
  /// **'Remind me in a week'**
  String get remindWeek;

  /// No description provided for @videoLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'This video could not be loaded. Check your connection and try again.'**
  String get videoLoadFailed;

  /// No description provided for @pause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get pause;

  /// No description provided for @play.
  ///
  /// In en, this message translates to:
  /// **'Play'**
  String get play;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet.'**
  String get noNotifications;

  /// No description provided for @accountChangedPage.
  ///
  /// In en, this message translates to:
  /// **'Account changed. Open this page again.'**
  String get accountChangedPage;

  /// No description provided for @noResponse.
  ///
  /// In en, this message translates to:
  /// **'Kivilo did not respond. Check your signal and try again. Anything you took is saved on this phone.'**
  String get noResponse;

  /// No description provided for @uploadingMedia.
  ///
  /// In en, this message translates to:
  /// **'Uploading Kivilo media'**
  String get uploadingMedia;

  /// No description provided for @kiviloMedia.
  ///
  /// In en, this message translates to:
  /// **'Kivilo media'**
  String get kiviloMedia;

  /// No description provided for @signInBeforeFindingPhotos.
  ///
  /// In en, this message translates to:
  /// **'Sign in again before adding finding photos.'**
  String get signInBeforeFindingPhotos;

  /// No description provided for @photoDraftDiscarded.
  ///
  /// In en, this message translates to:
  /// **'This photo draft was discarded. Discard the local draft to start again.'**
  String get photoDraftDiscarded;

  /// No description provided for @findingSavedReopen.
  ///
  /// In en, this message translates to:
  /// **'This finding was saved. Reopen it to add more photos.'**
  String get findingSavedReopen;

  /// No description provided for @finishRecoveringCamera.
  ///
  /// In en, this message translates to:
  /// **'Finish recovering the previous camera selection before taking another photo.'**
  String get finishRecoveringCamera;

  /// No description provided for @chooseImageFormat.
  ///
  /// In en, this message translates to:
  /// **'Choose a JPEG, PNG or WebP photo. Your selection is kept; retry or discard this draft.'**
  String get chooseImageFormat;

  /// No description provided for @waitPhotosSaved.
  ///
  /// In en, this message translates to:
  /// **'Wait until your photos are saved on this phone.'**
  String get waitPhotosSaved;

  /// No description provided for @finishFindingPhotos.
  ///
  /// In en, this message translates to:
  /// **'Finish marking and uploading the finding photos before saving. Your draft is kept on this phone.'**
  String get finishFindingPhotos;

  /// No description provided for @connectRetryDiscard.
  ///
  /// In en, this message translates to:
  /// **'Connect and retry discarding. Your photos and draft are still saved on this phone.'**
  String get connectRetryDiscard;

  /// No description provided for @fileMissing.
  ///
  /// In en, this message translates to:
  /// **'The file for this photo or video is missing from this phone.'**
  String get fileMissing;

  /// No description provided for @inventoryLinkFailed.
  ///
  /// In en, this message translates to:
  /// **'Photo uploaded, but its inventory link could not be saved. The photo and its item are still saved on this phone.'**
  String get inventoryLinkFailed;

  /// No description provided for @photoFormatUnsupported.
  ///
  /// In en, this message translates to:
  /// **'This photo is in a format Kivilo cannot store. Take it again, or choose a JPEG or PNG.'**
  String get photoFormatUnsupported;

  /// No description provided for @photoStillSaving.
  ///
  /// In en, this message translates to:
  /// **'A photo is still being saved on this phone. Keep this draft and retry.'**
  String get photoStillSaving;

  /// No description provided for @photoSelectionRecovery.
  ///
  /// In en, this message translates to:
  /// **'A photo selection still needs recovery. Retry or discard this draft before saving.'**
  String get photoSelectionRecovery;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @planFree.
  ///
  /// In en, this message translates to:
  /// **'Free'**
  String get planFree;

  /// No description provided for @agencyErrPartyAsAgent.
  ///
  /// In en, this message translates to:
  /// **'A landlord or tenant cannot be assigned as an agent on their own tenancy.'**
  String get agencyErrPartyAsAgent;

  /// No description provided for @agencyErrAlreadyInTeam.
  ///
  /// In en, this message translates to:
  /// **'A tenancy already assigned to a team cannot be moved to another team.'**
  String get agencyErrAlreadyInTeam;

  /// No description provided for @agencyErrInvitationPending.
  ///
  /// In en, this message translates to:
  /// **'An invitation is already pending. Use Resend invitation if needed.'**
  String get agencyErrInvitationPending;

  /// No description provided for @agencyErrChooseLead.
  ///
  /// In en, this message translates to:
  /// **'Choose a responsible lead agent.'**
  String get agencyErrChooseLead;

  /// No description provided for @agencyErrChooseTeam.
  ///
  /// In en, this message translates to:
  /// **'Choose a team before assigning team members.'**
  String get agencyErrChooseTeam;

  /// No description provided for @agencyErrChooseActive.
  ///
  /// In en, this message translates to:
  /// **'Choose active members of this team.'**
  String get agencyErrChooseActive;

  /// No description provided for @agencyErrChooseSuccessor.
  ///
  /// In en, this message translates to:
  /// **'Choose an active team member to take over this person’s properties.'**
  String get agencyErrChooseSuccessor;

  /// No description provided for @agencyErrLastOwner.
  ///
  /// In en, this message translates to:
  /// **'Make another active member an owner before removing the last owner.'**
  String get agencyErrLastOwner;

  /// No description provided for @agencyErrOwnerDeletion.
  ///
  /// In en, this message translates to:
  /// **'Make another member an owner of each team you own before requesting account deletion.'**
  String get agencyErrOwnerDeletion;

  /// No description provided for @agencyErrOwnerOnly.
  ///
  /// In en, this message translates to:
  /// **'Only a team owner can change ownership.'**
  String get agencyErrOwnerOnly;

  /// No description provided for @agencyErrLeadIsParty.
  ///
  /// In en, this message translates to:
  /// **'The new lead cannot be a landlord or tenant on one of these tenancies.'**
  String get agencyErrLeadIsParty;

  /// No description provided for @agencyErrInvitationExpired.
  ///
  /// In en, this message translates to:
  /// **'This invitation has expired. Ask a team manager to send it again.'**
  String get agencyErrInvitationExpired;

  /// No description provided for @agencyErrAlreadyJoined.
  ///
  /// In en, this message translates to:
  /// **'This person has already joined the team.'**
  String get agencyErrAlreadyJoined;

  /// No description provided for @agencyErrTeamWideAccess.
  ///
  /// In en, this message translates to:
  /// **'This person has team-wide access as an owner or manager. Change their team role to remove that access.'**
  String get agencyErrTeamWideAccess;

  /// No description provided for @agencyErrAlreadyMember.
  ///
  /// In en, this message translates to:
  /// **'This person is already a team member.'**
  String get agencyErrAlreadyMember;

  /// No description provided for @agencyErrMustAccept.
  ///
  /// In en, this message translates to:
  /// **'This team member must accept an invitation before being assigned work.'**
  String get agencyErrMustAccept;

  /// No description provided for @agencyErrTeamChanged.
  ///
  /// In en, this message translates to:
  /// **'This tenancy’s team changed. Refresh and try again.'**
  String get agencyErrTeamChanged;

  /// No description provided for @agencyErrUseRemove.
  ///
  /// In en, this message translates to:
  /// **'Use Remove member to remove an active team member.'**
  String get agencyErrUseRemove;

  /// No description provided for @agencyErrWaitAccept.
  ///
  /// In en, this message translates to:
  /// **'Wait for the invitation to be accepted before changing this role.'**
  String get agencyErrWaitAccept;

  /// No description provided for @showing.
  ///
  /// In en, this message translates to:
  /// **'Showing'**
  String get showing;

  /// No description provided for @allMyWork.
  ///
  /// In en, this message translates to:
  /// **'All my work'**
  String get allMyWork;

  /// No description provided for @homesIOwn.
  ///
  /// In en, this message translates to:
  /// **'Homes I own'**
  String get homesIOwn;

  /// No description provided for @whereYouAreTheLandlord.
  ///
  /// In en, this message translates to:
  /// **'Where you are the landlord'**
  String get whereYouAreTheLandlord;

  /// No description provided for @homesIRent.
  ///
  /// In en, this message translates to:
  /// **'Homes I rent'**
  String get homesIRent;

  /// No description provided for @whereYouAreTheTenant.
  ///
  /// In en, this message translates to:
  /// **'Where you are the tenant'**
  String get whereYouAreTheTenant;

  /// No description provided for @theseTermsReferToAPreviousAgreement.
  ///
  /// In en, this message translates to:
  /// **'These terms refer to a previous agreement. Review the latest file to update them.'**
  String get theseTermsReferToAPreviousAgreement;

  /// No description provided for @hideSourceClause.
  ///
  /// In en, this message translates to:
  /// **'Hide source clause'**
  String get hideSourceClause;

  /// No description provided for @showSourceClause.
  ///
  /// In en, this message translates to:
  /// **'Show source clause'**
  String get showSourceClause;

  /// No description provided for @retake.
  ///
  /// In en, this message translates to:
  /// **'Retake'**
  String get retake;

  /// No description provided for @whatShouldTheViewerNotice.
  ///
  /// In en, this message translates to:
  /// **'What should the viewer notice?'**
  String get whatShouldTheViewerNotice;

  /// No description provided for @photoRemoved.
  ///
  /// In en, this message translates to:
  /// **'Photo removed'**
  String get photoRemoved;

  /// No description provided for @photoDeleted.
  ///
  /// In en, this message translates to:
  /// **'Photo deleted'**
  String get photoDeleted;

  /// No description provided for @flash.
  ///
  /// In en, this message translates to:
  /// **'Flash'**
  String get flash;

  /// No description provided for @switchCamera.
  ///
  /// In en, this message translates to:
  /// **'Switch camera'**
  String get switchCamera;

  /// No description provided for @retryCamera.
  ///
  /// In en, this message translates to:
  /// **'Retry camera'**
  String get retryCamera;

  /// No description provided for @takeTheReplacementPhoto.
  ///
  /// In en, this message translates to:
  /// **'Take the replacement photo'**
  String get takeTheReplacementPhoto;

  /// No description provided for @tapAPhotoToMarkItOr.
  ///
  /// In en, this message translates to:
  /// **'Tap a photo to mark it or add a note'**
  String get tapAPhotoToMarkItOr;

  /// No description provided for @theLeadAgent.
  ///
  /// In en, this message translates to:
  /// **'the lead agent'**
  String get theLeadAgent;

  /// No description provided for @theResponsibleAgentOrATeamOwner.
  ///
  /// In en, this message translates to:
  /// **'the responsible agent or a team owner or manager'**
  String get theResponsibleAgentOrATeamOwner;

  /// No description provided for @roomPhotos.
  ///
  /// In en, this message translates to:
  /// **'Room photos'**
  String get roomPhotos;

  /// No description provided for @takeRoomWidePhotosOrManageExisting.
  ///
  /// In en, this message translates to:
  /// **'Take room-wide photos or manage existing ones.'**
  String get takeRoomWidePhotosOrManageExisting;

  /// No description provided for @takeMorePhotos.
  ///
  /// In en, this message translates to:
  /// **'Take more photos'**
  String get takeMorePhotos;

  /// No description provided for @takePhotos.
  ///
  /// In en, this message translates to:
  /// **'Take photos'**
  String get takePhotos;

  /// No description provided for @noPhotosOfThisItemYet.
  ///
  /// In en, this message translates to:
  /// **'No photos of this item yet.'**
  String get noPhotosOfThisItemYet;

  /// No description provided for @reviewOpensOnceThisRoomsPhotosAnd.
  ///
  /// In en, this message translates to:
  /// **'Review opens once this room’s photos and changes have uploaded. Your media stays saved on this phone while you wait for signal.'**
  String get reviewOpensOnceThisRoomsPhotosAnd;

  /// No description provided for @couldNotOpenThisProperty.
  ///
  /// In en, this message translates to:
  /// **'Could not open this property'**
  String get couldNotOpenThisProperty;

  /// No description provided for @recentlyDeleted.
  ///
  /// In en, this message translates to:
  /// **'Recently deleted'**
  String get recentlyDeleted;

  /// No description provided for @offlineShowingWhatWasLastLoaded.
  ///
  /// In en, this message translates to:
  /// **'Offline. Showing what was last loaded.'**
  String get offlineShowingWhatWasLastLoaded;

  /// No description provided for @reportsAndDocuments.
  ///
  /// In en, this message translates to:
  /// **'Reports and documents'**
  String get reportsAndDocuments;

  /// No description provided for @earlierTenancy.
  ///
  /// In en, this message translates to:
  /// **'Earlier tenancy'**
  String get earlierTenancy;

  /// No description provided for @thisTenancysReportsDetailsAndPaperwork.
  ///
  /// In en, this message translates to:
  /// **'This tenancy’s reports, details and paperwork'**
  String get thisTenancysReportsDetailsAndPaperwork;

  /// No description provided for @more.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get more;

  /// No description provided for @whatHappenedHereOverTheYearsReports.
  ///
  /// In en, this message translates to:
  /// **'What happened here over the years: reports, updates, repairs'**
  String get whatHappenedHereOverTheYearsReports;

  /// No description provided for @changeLog.
  ///
  /// In en, this message translates to:
  /// **'Change log'**
  String get changeLog;

  /// No description provided for @whoChangedWhatInKiviloAndWhen.
  ///
  /// In en, this message translates to:
  /// **'Who changed what in Kivilo, and when'**
  String get whoChangedWhatInKiviloAndWhen;

  /// No description provided for @manageWhoCanWorkOnThisTenancy.
  ///
  /// In en, this message translates to:
  /// **'Manage who can work on this tenancy'**
  String get manageWhoCanWorkOnThisTenancy;

  /// No description provided for @restoreOrDeleteProperty.
  ///
  /// In en, this message translates to:
  /// **'Restore or delete property'**
  String get restoreOrDeleteProperty;

  /// No description provided for @archiveOrDeleteProperty.
  ///
  /// In en, this message translates to:
  /// **'Archive or delete property'**
  String get archiveOrDeleteProperty;

  /// No description provided for @returnItToActiveWorkOrMove.
  ///
  /// In en, this message translates to:
  /// **'Return it to active work or move it to trash'**
  String get returnItToActiveWorkOrMove;

  /// No description provided for @returnItToActiveProperties.
  ///
  /// In en, this message translates to:
  /// **'Return it to active properties'**
  String get returnItToActiveProperties;

  /// No description provided for @removeItFromActiveWorkOrMove.
  ///
  /// In en, this message translates to:
  /// **'Remove it from active work or move it to trash'**
  String get removeItFromActiveWorkOrMove;

  /// No description provided for @kiviloEmailsThemAShortIdentityForm.
  ///
  /// In en, this message translates to:
  /// **'Kivilo emails them a short identity form, screens them against the sanctions and PEP lists, and keeps the record for you. CEA requires this before the tenancy is signed.'**
  String get kiviloEmailsThemAShortIdentityForm;

  /// No description provided for @verify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verify;

  /// No description provided for @checkOutLabel.
  ///
  /// In en, this message translates to:
  /// **'check-out'**
  String get checkOutLabel;

  /// No description provided for @checkInLabel.
  ///
  /// In en, this message translates to:
  /// **'check-in'**
  String get checkInLabel;

  /// No description provided for @tenancyDetails.
  ///
  /// In en, this message translates to:
  /// **'Tenancy details'**
  String get tenancyDetails;

  /// No description provided for @landlordEmailNotProvided.
  ///
  /// In en, this message translates to:
  /// **'Landlord email not provided'**
  String get landlordEmailNotProvided;

  /// No description provided for @tenantEmailNotProvided.
  ///
  /// In en, this message translates to:
  /// **'Tenant email not provided'**
  String get tenantEmailNotProvided;

  /// No description provided for @peopleDatesRentAndDeposit.
  ///
  /// In en, this message translates to:
  /// **'People, dates, rent and deposit'**
  String get peopleDatesRentAndDeposit;

  /// No description provided for @documents.
  ///
  /// In en, this message translates to:
  /// **'Documents'**
  String get documents;

  /// No description provided for @tenancyAgreementAndSupportingFiles.
  ///
  /// In en, this message translates to:
  /// **'Tenancy agreement and supporting files'**
  String get tenancyAgreementAndSupportingFiles;

  /// No description provided for @editPropertyAsset.
  ///
  /// In en, this message translates to:
  /// **'Edit property asset'**
  String get editPropertyAsset;

  /// No description provided for @retireAsset.
  ///
  /// In en, this message translates to:
  /// **'Retire asset'**
  String get retireAsset;

  /// No description provided for @retireThisAsset.
  ///
  /// In en, this message translates to:
  /// **'Retire this asset?'**
  String get retireThisAsset;

  /// No description provided for @couldNotLoadRepairsAndAssets.
  ///
  /// In en, this message translates to:
  /// **'Could not load repairs and assets'**
  String get couldNotLoadRepairsAndAssets;

  /// No description provided for @request.
  ///
  /// In en, this message translates to:
  /// **'request'**
  String get request;

  /// No description provided for @requests.
  ///
  /// In en, this message translates to:
  /// **'requests'**
  String get requests;

  /// No description provided for @opening.
  ///
  /// In en, this message translates to:
  /// **'Opening…'**
  String get opening;

  /// No description provided for @reviewRepairTerms.
  ///
  /// In en, this message translates to:
  /// **'Review repair terms'**
  String get reviewRepairTerms;

  /// No description provided for @noMaintenanceReported.
  ///
  /// In en, this message translates to:
  /// **'No maintenance reported'**
  String get noMaintenanceReported;

  /// No description provided for @theUpdateIsDownloadedAndWillTake.
  ///
  /// In en, this message translates to:
  /// **'The update is downloaded and will take effect the next time Kivilo starts. You can keep working now.'**
  String get theUpdateIsDownloadedAndWillTake;

  /// No description provided for @aKiviloUpdateIsAvailableDownloadIt.
  ///
  /// In en, this message translates to:
  /// **'A Kivilo update is available. Download it now or keep working and update later.'**
  String get aKiviloUpdateIsAvailableDownloadIt;

  /// No description provided for @labelContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get labelContinue;

  /// No description provided for @notNow.
  ///
  /// In en, this message translates to:
  /// **'Not now'**
  String get notNow;

  /// No description provided for @theResponsibleAgentOrATeamOwnerLabel.
  ///
  /// In en, this message translates to:
  /// **'the responsible agent or a team owner or manager for every tenancy here'**
  String get theResponsibleAgentOrATeamOwnerLabel;

  /// No description provided for @propertyActions.
  ///
  /// In en, this message translates to:
  /// **'Property actions'**
  String get propertyActions;

  /// No description provided for @tenancy.
  ///
  /// In en, this message translates to:
  /// **'tenancy'**
  String get tenancy;

  /// No description provided for @tenancies.
  ///
  /// In en, this message translates to:
  /// **'tenancies'**
  String get tenancies;

  /// No description provided for @inspectionLabel.
  ///
  /// In en, this message translates to:
  /// **'inspection'**
  String get inspectionLabel;

  /// No description provided for @inspections.
  ///
  /// In en, this message translates to:
  /// **'inspections'**
  String get inspections;

  /// No description provided for @photoWord.
  ///
  /// In en, this message translates to:
  /// **'photo'**
  String get photoWord;

  /// No description provided for @photosLabel.
  ///
  /// In en, this message translates to:
  /// **'photos'**
  String get photosLabel;

  /// No description provided for @propertyRecovery.
  ///
  /// In en, this message translates to:
  /// **'Property recovery'**
  String get propertyRecovery;

  /// No description provided for @takeSeveralPhotosThenMarkThemOr.
  ///
  /// In en, this message translates to:
  /// **'Take several photos, then mark them or add notes. Originals are always kept.'**
  String get takeSeveralPhotosThenMarkThemOr;

  /// No description provided for @gallery.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get gallery;

  /// No description provided for @resume.
  ///
  /// In en, this message translates to:
  /// **'Resume'**
  String get resume;

  /// No description provided for @mark.
  ///
  /// In en, this message translates to:
  /// **'Mark'**
  String get mark;

  /// No description provided for @deletePhoto.
  ///
  /// In en, this message translates to:
  /// **'Delete photo'**
  String get deletePhoto;

  /// No description provided for @deleteFinding.
  ///
  /// In en, this message translates to:
  /// **'Delete finding'**
  String get deleteFinding;

  /// No description provided for @couldNotOpenThisRenewal.
  ///
  /// In en, this message translates to:
  /// **'Could not open this renewal'**
  String get couldNotOpenThisRenewal;

  /// No description provided for @startWithTheRoomsFromTheLast.
  ///
  /// In en, this message translates to:
  /// **'Start with the rooms from the last check-in'**
  String get startWithTheRoomsFromTheLast;

  /// No description provided for @namesOnlyTheNewCheckInRecords.
  ///
  /// In en, this message translates to:
  /// **'Names only; the new check-in records its own condition.'**
  String get namesOnlyTheNewCheckInRecords;

  /// No description provided for @whereYouWork.
  ///
  /// In en, this message translates to:
  /// **'Where you work'**
  String get whereYouWork;

  /// No description provided for @loadingLabel.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loadingLabel;

  /// No description provided for @notChosenYet.
  ///
  /// In en, this message translates to:
  /// **'Not chosen yet'**
  String get notChosenYet;

  /// No description provided for @member.
  ///
  /// In en, this message translates to:
  /// **'member'**
  String get member;

  /// No description provided for @members.
  ///
  /// In en, this message translates to:
  /// **'members'**
  String get members;

  /// No description provided for @createOrJoinTeam.
  ///
  /// In en, this message translates to:
  /// **'Create or join a team'**
  String get createOrJoinTeam;

  /// No description provided for @addAnotherTeam.
  ///
  /// In en, this message translates to:
  /// **'Add another team'**
  String get addAnotherTeam;

  /// No description provided for @couldNotLoadTeamsTapToTry.
  ///
  /// In en, this message translates to:
  /// **'Could not load teams. Tap to try again.'**
  String get couldNotLoadTeamsTapToTry;

  /// No description provided for @invitation.
  ///
  /// In en, this message translates to:
  /// **'invitation'**
  String get invitation;

  /// No description provided for @invitations.
  ///
  /// In en, this message translates to:
  /// **'invitations'**
  String get invitations;

  /// No description provided for @createATeamOrAcceptAnInvitation.
  ///
  /// In en, this message translates to:
  /// **'Create a team or accept an invitation'**
  String get createATeamOrAcceptAnInvitation;

  /// No description provided for @personalReportBranding.
  ///
  /// In en, this message translates to:
  /// **'Personal report branding'**
  String get personalReportBranding;

  /// No description provided for @usedForPropertiesOutsideYourTeams.
  ///
  /// In en, this message translates to:
  /// **'Used for properties outside your teams.'**
  String get usedForPropertiesOutsideYourTeams;

  /// No description provided for @yourActivePropertyAllowance.
  ///
  /// In en, this message translates to:
  /// **'Your active property allowance.'**
  String get yourActivePropertyAllowance;

  /// No description provided for @howAHandoverWorks.
  ///
  /// In en, this message translates to:
  /// **'How a handover works'**
  String get howAHandoverWorks;

  /// No description provided for @captureWriteTheInventoryThenSign.
  ///
  /// In en, this message translates to:
  /// **'Capture, write the inventory, then sign'**
  String get captureWriteTheInventoryThenSign;

  /// No description provided for @termsOfService.
  ///
  /// In en, this message translates to:
  /// **'Terms of service'**
  String get termsOfService;

  /// No description provided for @theTermsForUsingKivilo.
  ///
  /// In en, this message translates to:
  /// **'The terms for using Kivilo'**
  String get theTermsForUsingKivilo;

  /// No description provided for @anAppleSubscriptionContinuesUntilYouCancel.
  ///
  /// In en, this message translates to:
  /// **'An Apple subscription continues until you cancel it in your Apple Account. Deleting your Kivilo account does not cancel it.'**
  String get anAppleSubscriptionContinuesUntilYouCancel;

  /// No description provided for @manageAppStoreSubscriptions.
  ///
  /// In en, this message translates to:
  /// **'Manage App Store subscriptions'**
  String get manageAppStoreSubscriptions;

  /// No description provided for @couldNotLoadProperties.
  ///
  /// In en, this message translates to:
  /// **'Could not load properties'**
  String get couldNotLoadProperties;

  /// No description provided for @showAllMyWork.
  ///
  /// In en, this message translates to:
  /// **'Show all my work'**
  String get showAllMyWork;

  /// No description provided for @yourPropertiesAndTheirCurrentStatus.
  ///
  /// In en, this message translates to:
  /// **'Your properties and their current status.'**
  String get yourPropertiesAndTheirCurrentStatus;

  /// No description provided for @searchProperties.
  ///
  /// In en, this message translates to:
  /// **'Search properties'**
  String get searchProperties;

  /// No description provided for @addressTenantOrStage.
  ///
  /// In en, this message translates to:
  /// **'Address, tenant or stage'**
  String get addressTenantOrStage;

  /// No description provided for @property.
  ///
  /// In en, this message translates to:
  /// **'property'**
  String get property;

  /// No description provided for @properties.
  ///
  /// In en, this message translates to:
  /// **'properties'**
  String get properties;

  /// No description provided for @found.
  ///
  /// In en, this message translates to:
  /// **' found'**
  String get found;

  /// No description provided for @nothingInRecentlyDeleted.
  ///
  /// In en, this message translates to:
  /// **'Nothing in Recently deleted'**
  String get nothingInRecentlyDeleted;

  /// No description provided for @noArchivedProperties.
  ///
  /// In en, this message translates to:
  /// **'No archived properties'**
  String get noArchivedProperties;

  /// No description provided for @noMatchingProperties.
  ///
  /// In en, this message translates to:
  /// **'No matching properties'**
  String get noMatchingProperties;

  /// No description provided for @tryAnotherAddressOrTenantOrChange.
  ///
  /// In en, this message translates to:
  /// **'Try another address or tenant, or change your filters.'**
  String get tryAnotherAddressOrTenantOrChange;

  /// No description provided for @plansBilling.
  ///
  /// In en, this message translates to:
  /// **'Plans & billing'**
  String get plansBilling;

  /// No description provided for @seat.
  ///
  /// In en, this message translates to:
  /// **'seat'**
  String get seat;

  /// No description provided for @seats.
  ///
  /// In en, this message translates to:
  /// **'seats'**
  String get seats;

  /// No description provided for @accessUntil.
  ///
  /// In en, this message translates to:
  /// **'Access until'**
  String get accessUntil;

  /// No description provided for @currentPeriodEnds.
  ///
  /// In en, this message translates to:
  /// **'Current period ends'**
  String get currentPeriodEnds;

  /// No description provided for @askYourTeamOwnerOrManagerAbout.
  ///
  /// In en, this message translates to:
  /// **'Ask your team owner or manager about this plan.'**
  String get askYourTeamOwnerOrManagerAbout;

  /// No description provided for @thisPlanWasPurchasedOnTheKivilo.
  ///
  /// In en, this message translates to:
  /// **'This plan was purchased on the Kivilo website. You can use it in the app.'**
  String get thisPlanWasPurchasedOnTheKivilo;

  /// No description provided for @proForYourPersonalWork.
  ///
  /// In en, this message translates to:
  /// **'Pro for your personal work'**
  String get proForYourPersonalWork;

  /// No description provided for @yourAppleAccountCanSubscribeForOne.
  ///
  /// In en, this message translates to:
  /// **'Your Apple Account can subscribe for one team workspace, with up to 20 seats, alongside your Personal plan.'**
  String get yourAppleAccountCanSubscribeForOne;

  /// No description provided for @seatsLabel.
  ///
  /// In en, this message translates to:
  /// **'Seats'**
  String get seatsLabel;

  /// No description provided for @moreSeatsTakeEffectImmediatelyFewerSeats.
  ///
  /// In en, this message translates to:
  /// **'More seats take effect immediately. Fewer seats take effect at renewal. Apple confirms the price and timing before you agree.'**
  String get moreSeatsTakeEffectImmediatelyFewerSeats;

  /// No description provided for @aSeatChangeReplacesThisSubscriptionImmediately.
  ///
  /// In en, this message translates to:
  /// **'A seat change replaces this subscription immediately. Google Play credits the remaining time and confirms your next payment date before you agree.'**
  String get aSeatChangeReplacesThisSubscriptionImmediately;

  /// No description provided for @restorePurchases.
  ///
  /// In en, this message translates to:
  /// **'Restore purchases'**
  String get restorePurchases;

  /// No description provided for @paymentIsChargedToYourAppleAccount.
  ///
  /// In en, this message translates to:
  /// **'Payment is charged to your Apple Account when you confirm. Cancel in App Store subscriptions at least 24 hours before renewal to avoid the next charge. Deleting Kivilo or its account does not cancel an Apple subscription.'**
  String get paymentIsChargedToYourAppleAccount;

  /// No description provided for @termsOfUse.
  ///
  /// In en, this message translates to:
  /// **'Terms of Use'**
  String get termsOfUse;

  /// No description provided for @couldNotLoadNotifications.
  ///
  /// In en, this message translates to:
  /// **'Could not load notifications'**
  String get couldNotLoadNotifications;

  /// No description provided for @noNotificationsYet.
  ///
  /// In en, this message translates to:
  /// **'No notifications yet'**
  String get noNotificationsYet;

  /// No description provided for @repairTerms.
  ///
  /// In en, this message translates to:
  /// **'Repair terms'**
  String get repairTerms;

  /// No description provided for @couldNotOpenThisAgreement.
  ///
  /// In en, this message translates to:
  /// **'Could not open this agreement'**
  String get couldNotOpenThisAgreement;

  /// No description provided for @checkTheClauseAgainstTheAgreementBefore.
  ///
  /// In en, this message translates to:
  /// **'Check the clause against the agreement before confirming the repair terms.'**
  String get checkTheClauseAgainstTheAgreementBefore;

  /// No description provided for @openAgreement.
  ///
  /// In en, this message translates to:
  /// **'Open agreement'**
  String get openAgreement;

  /// No description provided for @clausesToReview.
  ///
  /// In en, this message translates to:
  /// **'Clauses to review'**
  String get clausesToReview;

  /// No description provided for @selectAClauseToFillInThe.
  ///
  /// In en, this message translates to:
  /// **'Select a clause to fill in the details below'**
  String get selectAClauseToFillInThe;

  /// No description provided for @noClauseWasFoundInTheReadable.
  ///
  /// In en, this message translates to:
  /// **'No clause was found in the readable text. Open the agreement and enter the source clause below.'**
  String get noClauseWasFoundInTheReadable;

  /// No description provided for @sourcePage.
  ///
  /// In en, this message translates to:
  /// **'Source page'**
  String get sourcePage;

  /// No description provided for @clauseText.
  ///
  /// In en, this message translates to:
  /// **'Clause text'**
  String get clauseText;

  /// No description provided for @repairRule.
  ///
  /// In en, this message translates to:
  /// **'Repair rule'**
  String get repairRule;

  /// No description provided for @firstAmount.
  ///
  /// In en, this message translates to:
  /// **'First amount'**
  String get firstAmount;

  /// No description provided for @anotherRule.
  ///
  /// In en, this message translates to:
  /// **'Another rule'**
  String get anotherRule;

  /// No description provided for @tenantPaysTheFirst.
  ///
  /// In en, this message translates to:
  /// **'Tenant pays the first'**
  String get tenantPaysTheFirst;

  /// No description provided for @explainTheRepairRule.
  ///
  /// In en, this message translates to:
  /// **'Explain the repair rule'**
  String get explainTheRepairRule;

  /// No description provided for @notesAndExceptionsOptional.
  ///
  /// In en, this message translates to:
  /// **'Notes and exceptions (optional)'**
  String get notesAndExceptionsOptional;

  /// No description provided for @confirmRepairTerms.
  ///
  /// In en, this message translates to:
  /// **'Confirm repair terms'**
  String get confirmRepairTerms;

  /// No description provided for @somethingElse.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get somethingElse;

  /// No description provided for @itemOptional.
  ///
  /// In en, this message translates to:
  /// **'Item (optional)'**
  String get itemOptional;

  /// No description provided for @whichItemOptional.
  ///
  /// In en, this message translates to:
  /// **'Which item? (optional)'**
  String get whichItemOptional;

  /// No description provided for @forExampleToiletBowl.
  ///
  /// In en, this message translates to:
  /// **'For example, toilet bowl'**
  String get forExampleToiletBowl;

  /// No description provided for @restored.
  ///
  /// In en, this message translates to:
  /// **'Restored.'**
  String get restored;

  /// No description provided for @everyChangeAndDeletionWithWhoMade.
  ///
  /// In en, this message translates to:
  /// **'Every change and deletion, with who made it. Deleted rooms, lines, photos and findings can be restored for 30 days.'**
  String get everyChangeAndDeletionWithWhoMade;

  /// No description provided for @allChanges.
  ///
  /// In en, this message translates to:
  /// **'All changes'**
  String get allChanges;

  /// No description provided for @deletions.
  ///
  /// In en, this message translates to:
  /// **'Deletions'**
  String get deletions;

  /// No description provided for @offlineShowingPreviouslyLoadedHistory.
  ///
  /// In en, this message translates to:
  /// **'Offline. Showing previously loaded history.'**
  String get offlineShowingPreviouslyLoadedHistory;

  /// No description provided for @historyIsRecordedFrom23October2026.
  ///
  /// In en, this message translates to:
  /// **'History is recorded from 23 October 2026.'**
  String get historyIsRecordedFrom23October2026;

  /// No description provided for @nothingHasBeenDeleted.
  ///
  /// In en, this message translates to:
  /// **'Nothing has been deleted.'**
  String get nothingHasBeenDeleted;

  /// No description provided for @noChangesRecordedYet.
  ///
  /// In en, this message translates to:
  /// **'No changes recorded yet.'**
  String get noChangesRecordedYet;

  /// No description provided for @restoredLabel.
  ///
  /// In en, this message translates to:
  /// **'Restored'**
  String get restoredLabel;

  /// No description provided for @restoring.
  ///
  /// In en, this message translates to:
  /// **'Restoring…'**
  String get restoring;

  /// No description provided for @restore.
  ///
  /// In en, this message translates to:
  /// **'Restore'**
  String get restore;

  /// No description provided for @thisRemovesItFromTheRoomAnd.
  ///
  /// In en, this message translates to:
  /// **'This removes it from the room and any item it is attached to. You can restore it from the property’s Change log for 30 days.'**
  String get thisRemovesItFromTheRoomAnd;

  /// No description provided for @line.
  ///
  /// In en, this message translates to:
  /// **'line'**
  String get line;

  /// No description provided for @lines.
  ///
  /// In en, this message translates to:
  /// **'lines'**
  String get lines;

  /// No description provided for @setCondition.
  ///
  /// In en, this message translates to:
  /// **'Set condition'**
  String get setCondition;

  /// No description provided for @thisRemovesTheLineFromTheInventory.
  ///
  /// In en, this message translates to:
  /// **'This removes the line from the inventory. You can restore it from the property’s Change log for 30 days.'**
  String get thisRemovesTheLineFromTheInventory;

  /// No description provided for @somePhotosOrChangesInThisRoom.
  ///
  /// In en, this message translates to:
  /// **'Some photos or changes in this room have not uploaded yet. Open the item or Room photos to finish any photo marks and retry uploads before continuing.'**
  String get somePhotosOrChangesInThisRoom;

  /// No description provided for @itsPhotosVideosAndInventoryWillBe.
  ///
  /// In en, this message translates to:
  /// **'Its photos, videos and inventory will be removed. You can restore the room from the property’s Change log for 30 days.'**
  String get itsPhotosVideosAndInventoryWillBe;

  /// No description provided for @couldNotOpenThisRoom.
  ///
  /// In en, this message translates to:
  /// **'Could not open this room'**
  String get couldNotOpenThisRoom;

  /// No description provided for @select.
  ///
  /// In en, this message translates to:
  /// **'Select'**
  String get select;

  /// No description provided for @tapLinesToSelectThem.
  ///
  /// In en, this message translates to:
  /// **'Tap lines to select them'**
  String get tapLinesToSelectThem;

  /// No description provided for @noItemsRecordedLabel.
  ///
  /// In en, this message translates to:
  /// **'No items recorded'**
  String get noItemsRecordedLabel;

  /// No description provided for @addAnItemToRecordItsCondition.
  ///
  /// In en, this message translates to:
  /// **'Add an item to record its condition and photos.'**
  String get addAnItemToRecordItsCondition;

  /// No description provided for @noPhotosOrVideosRecorded.
  ///
  /// In en, this message translates to:
  /// **'No photos or videos recorded'**
  String get noPhotosOrVideosRecorded;

  /// No description provided for @checkEveryItemAgainstThePhotosYour.
  ///
  /// In en, this message translates to:
  /// **'Check every item against the photos. Your review makes this room ready for the report.'**
  String get checkEveryItemAgainstThePhotosYour;

  /// No description provided for @worthCheckingBeforeYouReview.
  ///
  /// In en, this message translates to:
  /// **'Worth checking before you review'**
  String get worthCheckingBeforeYouReview;

  /// No description provided for @thisInventoryIsFixedForSigningYou.
  ///
  /// In en, this message translates to:
  /// **'This inventory is fixed for signing. You can still view its photos and videos.'**
  String get thisInventoryIsFixedForSigningYou;

  /// No description provided for @duplicate.
  ///
  /// In en, this message translates to:
  /// **'Duplicate'**
  String get duplicate;

  /// No description provided for @couldNotOpenThisRepair.
  ///
  /// In en, this message translates to:
  /// **'Could not open this repair'**
  String get couldNotOpenThisRepair;

  /// No description provided for @usedWithYourNameOnReportsFor.
  ///
  /// In en, this message translates to:
  /// **'Used with your name on reports for personal properties. Team properties use that team’s branding.'**
  String get usedWithYourNameOnReportsFor;

  /// No description provided for @officePhoneOptional.
  ///
  /// In en, this message translates to:
  /// **'Office phone (optional)'**
  String get officePhoneOptional;

  /// No description provided for @editReportBranding.
  ///
  /// In en, this message translates to:
  /// **'Edit report branding'**
  String get editReportBranding;

  /// No description provided for @aTeamOwner.
  ///
  /// In en, this message translates to:
  /// **'a team owner'**
  String get aTeamOwner;

  /// No description provided for @aTeamOwnerOrManager.
  ///
  /// In en, this message translates to:
  /// **'a team owner or manager'**
  String get aTeamOwnerOrManager;

  /// No description provided for @teamDetails.
  ///
  /// In en, this message translates to:
  /// **'Team details'**
  String get teamDetails;

  /// No description provided for @theTeamIdentityShownOnItsReports.
  ///
  /// In en, this message translates to:
  /// **'The team identity shown on its reports.'**
  String get theTeamIdentityShownOnItsReports;

  /// No description provided for @addAgencyLicenceAndLogo.
  ///
  /// In en, this message translates to:
  /// **'Add agency licence and logo'**
  String get addAgencyLicenceAndLogo;

  /// No description provided for @propertyAssignments.
  ///
  /// In en, this message translates to:
  /// **'Property assignments'**
  String get propertyAssignments;

  /// No description provided for @couldNotLoadTheTimeline.
  ///
  /// In en, this message translates to:
  /// **'Could not load the timeline'**
  String get couldNotLoadTheTimeline;

  /// No description provided for @chooseAProperty.
  ///
  /// In en, this message translates to:
  /// **'Choose a property'**
  String get chooseAProperty;

  /// No description provided for @couldNotLoadYourProperties.
  ///
  /// In en, this message translates to:
  /// **'Could not load your properties'**
  String get couldNotLoadYourProperties;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @addressPostalCodeOrLastTenant.
  ///
  /// In en, this message translates to:
  /// **'Address, postal code or last tenant'**
  String get addressPostalCodeOrLastTenant;

  /// No description provided for @noPropertyMatches.
  ///
  /// In en, this message translates to:
  /// **'No property matches.'**
  String get noPropertyMatches;

  /// No description provided for @paymentProof.
  ///
  /// In en, this message translates to:
  /// **'Payment proof'**
  String get paymentProof;

  /// No description provided for @requestAnotherDocument.
  ///
  /// In en, this message translates to:
  /// **'Request another document'**
  String get requestAnotherDocument;

  /// No description provided for @askTheTenantForAnOptionalSupporting.
  ///
  /// In en, this message translates to:
  /// **'Ask the tenant for an optional supporting file.'**
  String get askTheTenantForAnOptionalSupporting;

  /// No description provided for @document.
  ///
  /// In en, this message translates to:
  /// **'Document'**
  String get document;

  /// No description provided for @requesting.
  ///
  /// In en, this message translates to:
  /// **'Requesting…'**
  String get requesting;

  /// No description provided for @requestLabel.
  ///
  /// In en, this message translates to:
  /// **'Request'**
  String get requestLabel;

  /// No description provided for @photoSavedOnThisPhoneItWill.
  ///
  /// In en, this message translates to:
  /// **'Photo saved on this phone. It will upload when you reconnect.'**
  String get photoSavedOnThisPhoneItWill;

  /// No description provided for @couldNotLoadDocuments.
  ///
  /// In en, this message translates to:
  /// **'Could not load documents'**
  String get couldNotLoadDocuments;

  /// No description provided for @hideOtherDocuments.
  ///
  /// In en, this message translates to:
  /// **'Hide other documents'**
  String get hideOtherDocuments;

  /// No description provided for @otherDocuments.
  ///
  /// In en, this message translates to:
  /// **'Other documents'**
  String get otherDocuments;

  /// No description provided for @optionalSupportingFilesForThisTenancy.
  ///
  /// In en, this message translates to:
  /// **'Optional supporting files for this tenancy'**
  String get optionalSupportingFilesForThisTenancy;

  /// No description provided for @noOtherDocumentsRequested.
  ///
  /// In en, this message translates to:
  /// **'No other documents requested.'**
  String get noOtherDocumentsRequested;

  /// No description provided for @privateToTheTenantLandlordAndAgents.
  ///
  /// In en, this message translates to:
  /// **'Private to the tenant, landlord and agents with access to this tenancy.'**
  String get privateToTheTenantLandlordAndAgents;

  /// No description provided for @tenancyAgreement.
  ///
  /// In en, this message translates to:
  /// **'Tenancy agreement'**
  String get tenancyAgreement;

  /// No description provided for @keepTheSignedAgreementWithThisProperty.
  ///
  /// In en, this message translates to:
  /// **'Keep the signed agreement with this property.'**
  String get keepTheSignedAgreementWithThisProperty;

  /// No description provided for @yourAgreementAndReviewedRepairTerms.
  ///
  /// In en, this message translates to:
  /// **'Your agreement and reviewed repair terms.'**
  String get yourAgreementAndReviewedRepairTerms;

  /// No description provided for @yourAgreementForThisTenancy.
  ///
  /// In en, this message translates to:
  /// **'Your agreement for this tenancy.'**
  String get yourAgreementForThisTenancy;

  /// No description provided for @currentAgreement.
  ///
  /// In en, this message translates to:
  /// **'Current agreement'**
  String get currentAgreement;

  /// No description provided for @hidePreviousAgreements.
  ///
  /// In en, this message translates to:
  /// **'Hide previous agreements'**
  String get hidePreviousAgreements;

  /// No description provided for @previousAgreements.
  ///
  /// In en, this message translates to:
  /// **'Previous agreements'**
  String get previousAgreements;

  /// No description provided for @uploadPdfInBrowser.
  ///
  /// In en, this message translates to:
  /// **'Upload PDF in browser'**
  String get uploadPdfInBrowser;

  /// No description provided for @reviewMaintenanceClause.
  ///
  /// In en, this message translates to:
  /// **'Review maintenance clause'**
  String get reviewMaintenanceClause;

  /// No description provided for @retryUpload.
  ///
  /// In en, this message translates to:
  /// **'Retry upload'**
  String get retryUpload;

  /// No description provided for @uploadTheRequestedDocumentBelow.
  ///
  /// In en, this message translates to:
  /// **'Upload the requested document below.'**
  String get uploadTheRequestedDocumentBelow;

  /// No description provided for @waitingForTheTenantToUpload.
  ///
  /// In en, this message translates to:
  /// **'Waiting for the tenant to upload'**
  String get waitingForTheTenantToUpload;

  /// No description provided for @setUpThePropertyTheTenancyAnd.
  ///
  /// In en, this message translates to:
  /// **'Set up the property, the tenancy and its rooms.'**
  String get setUpThePropertyTheTenancyAnd;

  /// No description provided for @aNewTenancyStaysInThePropertys.
  ///
  /// In en, this message translates to:
  /// **'A new tenancy stays in the property’s workspace.'**
  String get aNewTenancyStaysInThePropertys;

  /// No description provided for @newPropertyLabel.
  ///
  /// In en, this message translates to:
  /// **'New property'**
  String get newPropertyLabel;

  /// No description provided for @existingProperty.
  ///
  /// In en, this message translates to:
  /// **'Existing property'**
  String get existingProperty;

  /// No description provided for @findTheAddressOptional.
  ///
  /// In en, this message translates to:
  /// **'Find the address (optional)'**
  String get findTheAddressOptional;

  /// No description provided for @postalCodeBuildingOrStreet.
  ///
  /// In en, this message translates to:
  /// **'Postal code, building or street'**
  String get postalCodeBuildingOrStreet;

  /// No description provided for @buildingOrStreetAreaAndCity.
  ///
  /// In en, this message translates to:
  /// **'Building or street, area and city'**
  String get buildingOrStreetAreaAndCity;

  /// No description provided for @condominium.
  ///
  /// In en, this message translates to:
  /// **'Condominium'**
  String get condominium;

  /// No description provided for @condominiumServicedResidenceOrApartment.
  ///
  /// In en, this message translates to:
  /// **'Condominium, serviced residence or apartment'**
  String get condominiumServicedResidenceOrApartment;

  /// No description provided for @roomsStartWithEditableInventoryRowsSuited.
  ///
  /// In en, this message translates to:
  /// **'Rooms start with editable inventory rows suited to this furnishing level.'**
  String get roomsStartWithEditableInventoryRowsSuited;

  /// No description provided for @partiallyFurnished.
  ///
  /// In en, this message translates to:
  /// **'Partially furnished'**
  String get partiallyFurnished;

  /// No description provided for @unfurnished.
  ///
  /// In en, this message translates to:
  /// **'Unfurnished'**
  String get unfurnished;

  /// No description provided for @sameLandlordAsLastTime.
  ///
  /// In en, this message translates to:
  /// **'Same landlord as last time'**
  String get sameLandlordAsLastTime;

  /// No description provided for @chooseFromYourContacts.
  ///
  /// In en, this message translates to:
  /// **'Choose from your contacts'**
  String get chooseFromYourContacts;

  /// No description provided for @verifyBothPartiesCea.
  ///
  /// In en, this message translates to:
  /// **'Verify both parties (CEA)'**
  String get verifyBothPartiesCea;

  /// No description provided for @eachStartsWithStandardLinesYouCan.
  ///
  /// In en, this message translates to:
  /// **'Each starts with standard lines you can edit'**
  String get eachStartsWithStandardLinesYouCan;

  /// No description provided for @namesOnlyThisCheckInRecordsIts.
  ///
  /// In en, this message translates to:
  /// **'Names only; this check-in records its own condition'**
  String get namesOnlyThisCheckInRecordsIts;

  /// No description provided for @bedrooms.
  ///
  /// In en, this message translates to:
  /// **'Bedrooms'**
  String get bedrooms;

  /// No description provided for @bathrooms.
  ///
  /// In en, this message translates to:
  /// **'Bathrooms'**
  String get bathrooms;

  /// No description provided for @anotherRoomOptional.
  ///
  /// In en, this message translates to:
  /// **'Another room (optional)'**
  String get anotherRoomOptional;

  /// No description provided for @forExampleStudy.
  ///
  /// In en, this message translates to:
  /// **'For example, study'**
  String get forExampleStudy;

  /// No description provided for @noRoomsYetYouCanAddThem.
  ///
  /// In en, this message translates to:
  /// **'No rooms yet. You can add them after this.'**
  String get noRoomsYetYouCanAddThem;

  /// No description provided for @roomLabel.
  ///
  /// In en, this message translates to:
  /// **'room'**
  String get roomLabel;

  /// No description provided for @rooms.
  ///
  /// In en, this message translates to:
  /// **'rooms'**
  String get rooms;

  /// No description provided for @checkingForPhotosOnThisPhone.
  ///
  /// In en, this message translates to:
  /// **'Checking for photos on this phone…'**
  String get checkingForPhotosOnThisPhone;

  /// No description provided for @deleteChange.
  ///
  /// In en, this message translates to:
  /// **'Delete change'**
  String get deleteChange;

  /// No description provided for @suggestAChange.
  ///
  /// In en, this message translates to:
  /// **'Suggest a change'**
  String get suggestAChange;

  /// No description provided for @chooseTheLandlord.
  ///
  /// In en, this message translates to:
  /// **'Choose the landlord'**
  String get chooseTheLandlord;

  /// No description provided for @chooseTheTenant.
  ///
  /// In en, this message translates to:
  /// **'Choose the tenant'**
  String get chooseTheTenant;

  /// No description provided for @couldNotLoadYourContacts.
  ///
  /// In en, this message translates to:
  /// **'Could not load your contacts'**
  String get couldNotLoadYourContacts;

  /// No description provided for @noContactsYet.
  ///
  /// In en, this message translates to:
  /// **'No contacts yet'**
  String get noContactsYet;

  /// No description provided for @nameOrEmail.
  ///
  /// In en, this message translates to:
  /// **'Name or email'**
  String get nameOrEmail;

  /// No description provided for @noContactMatches.
  ///
  /// In en, this message translates to:
  /// **'No contact matches.'**
  String get noContactMatches;

  /// No description provided for @and.
  ///
  /// In en, this message translates to:
  /// **' and '**
  String get and;

  /// No description provided for @singapore.
  ///
  /// In en, this message translates to:
  /// **'Singapore'**
  String get singapore;

  /// No description provided for @malaysia.
  ///
  /// In en, this message translates to:
  /// **'Malaysia'**
  String get malaysia;

  /// No description provided for @whereDoYouWork.
  ///
  /// In en, this message translates to:
  /// **'Where do you work?'**
  String get whereDoYouWork;

  /// No description provided for @newPropertiesUseThatCountrysAddressesAnd.
  ///
  /// In en, this message translates to:
  /// **'New properties use that country\'s addresses and currency. You can change this later in Account.'**
  String get newPropertiesUseThatCountrysAddressesAnd;

  /// No description provided for @newPropertiesAreMadeInThisCountry.
  ///
  /// In en, this message translates to:
  /// **'New properties are made in this country. Properties you already have keep theirs.'**
  String get newPropertiesAreMadeInThisCountry;

  /// No description provided for @couldNotLoadYourHomes.
  ///
  /// In en, this message translates to:
  /// **'Could not load your homes'**
  String get couldNotLoadYourHomes;

  /// No description provided for @reportsYouAgreedRepairsAndThePeople.
  ///
  /// In en, this message translates to:
  /// **'Reports you agreed, repairs and the people involved.'**
  String get reportsYouAgreedRepairsAndThePeople;

  /// No description provided for @noHomesWhereYouAreTheLandlord.
  ///
  /// In en, this message translates to:
  /// **'No homes where you are the landlord.'**
  String get noHomesWhereYouAreTheLandlord;

  /// No description provided for @noHomesWhereYouAreTheTenant.
  ///
  /// In en, this message translates to:
  /// **'No homes where you are the tenant.'**
  String get noHomesWhereYouAreTheTenant;

  /// No description provided for @andItsAgent.
  ///
  /// In en, this message translates to:
  /// **'and its agent'**
  String get andItsAgent;

  /// No description provided for @saveTenancyChanges.
  ///
  /// In en, this message translates to:
  /// **'Save tenancy changes?'**
  String get saveTenancyChanges;

  /// No description provided for @theseDetailsIdentifyTheTenancyAndIts.
  ///
  /// In en, this message translates to:
  /// **'These details identify the tenancy and its signing parties. Check them carefully before saving.'**
  String get theseDetailsIdentifyTheTenancyAndIts;

  /// No description provided for @theAddressAndTypePrintedOnThe.
  ///
  /// In en, this message translates to:
  /// **'The address and type printed on the report'**
  String get theAddressAndTypePrintedOnThe;

  /// No description provided for @unitOptional.
  ///
  /// In en, this message translates to:
  /// **'Unit (optional)'**
  String get unitOptional;

  /// No description provided for @postcode.
  ///
  /// In en, this message translates to:
  /// **'Postcode'**
  String get postcode;

  /// No description provided for @propertyType.
  ///
  /// In en, this message translates to:
  /// **'Property type'**
  String get propertyType;

  /// No description provided for @condominiumOrApartment.
  ///
  /// In en, this message translates to:
  /// **'Condominium or apartment'**
  String get condominiumOrApartment;

  /// No description provided for @addAnEmailSoEachPartyCan.
  ///
  /// In en, this message translates to:
  /// **'Add an email so each party can receive and sign the report'**
  String get addAnEmailSoEachPartyCan;

  /// No description provided for @landlordEmailOptional.
  ///
  /// In en, this message translates to:
  /// **'Landlord email (optional)'**
  String get landlordEmailOptional;

  /// No description provided for @notProvided.
  ///
  /// In en, this message translates to:
  /// **'Not provided'**
  String get notProvided;

  /// No description provided for @tenantEmailOptional.
  ///
  /// In en, this message translates to:
  /// **'Tenant email (optional)'**
  String get tenantEmailOptional;

  /// No description provided for @openThisOnTheKiviloWebsite.
  ///
  /// In en, this message translates to:
  /// **'Open this on the Kivilo website.'**
  String get openThisOnTheKiviloWebsite;

  /// No description provided for @couldNotLoadYourTasks.
  ///
  /// In en, this message translates to:
  /// **'Could not load your tasks'**
  String get couldNotLoadYourTasks;

  /// No description provided for @nothingHereNow.
  ///
  /// In en, this message translates to:
  /// **'Nothing here now'**
  String get nothingHereNow;

  /// No description provided for @thereIsMoreThanOneScreenOf.
  ///
  /// In en, this message translates to:
  /// **'There is more than one screen of work. Finish some of these, or open Properties to see every record.'**
  String get thereIsMoreThanOneScreenOf;

  /// No description provided for @continueTheCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Continue the check-out'**
  String get continueTheCheckOut;

  /// No description provided for @continueTheCheckIn.
  ///
  /// In en, this message translates to:
  /// **'Continue the check-in'**
  String get continueTheCheckIn;

  /// No description provided for @tasksForYourProperties.
  ///
  /// In en, this message translates to:
  /// **'Tasks for your properties.'**
  String get tasksForYourProperties;

  /// No description provided for @tasksForYourRentedHomes.
  ///
  /// In en, this message translates to:
  /// **'Tasks for your rented homes.'**
  String get tasksForYourRentedHomes;

  /// No description provided for @yourTasksUpdatesAndUpcomingDeadlines.
  ///
  /// In en, this message translates to:
  /// **'Your tasks, updates and upcoming deadlines.'**
  String get yourTasksUpdatesAndUpcomingDeadlines;

  /// No description provided for @offlineShowingTasksAsTheyWereLast.
  ///
  /// In en, this message translates to:
  /// **'Offline. Showing tasks as they were last loaded; some may already be done.'**
  String get offlineShowingTasksAsTheyWereLast;

  /// No description provided for @checkingForUpdates.
  ///
  /// In en, this message translates to:
  /// **'Checking for updates…'**
  String get checkingForUpdates;

  /// No description provided for @nothingNeedsYourActionRightNow.
  ///
  /// In en, this message translates to:
  /// **'Nothing needs your action right now.'**
  String get nothingNeedsYourActionRightNow;

  /// No description provided for @continueWhereYouLeftOff.
  ///
  /// In en, this message translates to:
  /// **'Continue where you left off'**
  String get continueWhereYouLeftOff;

  /// No description provided for @clientChecksKycCdd.
  ///
  /// In en, this message translates to:
  /// **'Client checks (KYC/CDD)'**
  String get clientChecksKycCdd;

  /// No description provided for @verifyClientsKycCdd.
  ///
  /// In en, this message translates to:
  /// **'Verify clients (KYC/CDD)'**
  String get verifyClientsKycCdd;

  /// No description provided for @yourFirstHandover.
  ///
  /// In en, this message translates to:
  /// **'Your first handover'**
  String get yourFirstHandover;

  /// No description provided for @greatHandoversStartWithAClearRecord.
  ///
  /// In en, this message translates to:
  /// **'Great handovers start with a clear record.'**
  String get greatHandoversStartWithAClearRecord;

  /// No description provided for @addThePropertyAndTenancyWellGuide.
  ///
  /// In en, this message translates to:
  /// **'Add the property and tenancy. We’ll guide you from the first photo to the signed report. You can accept team invitations in Account.'**
  String get addThePropertyAndTenancyWellGuide;

  /// No description provided for @youreAllCaughtUp.
  ///
  /// In en, this message translates to:
  /// **'You’re all caught up'**
  String get youreAllCaughtUp;

  /// No description provided for @nothingIsWaitingOnYouOrAnyone.
  ///
  /// In en, this message translates to:
  /// **'Nothing is waiting on you or anyone else here.'**
  String get nothingIsWaitingOnYouOrAnyone;

  /// No description provided for @somePhotosOrChangesHaveNotUploaded.
  ///
  /// In en, this message translates to:
  /// **'Some photos or changes have not uploaded yet. Open the rooms and tap Retry uploads before sending for signature.'**
  String get somePhotosOrChangesHaveNotUploaded;

  /// No description provided for @remindersSentToThePartiesWithAn.
  ///
  /// In en, this message translates to:
  /// **'Reminders sent to the parties with an email address'**
  String get remindersSentToThePartiesWithAn;

  /// No description provided for @confirmNoChanges.
  ///
  /// In en, this message translates to:
  /// **'Confirm no changes?'**
  String get confirmNoChanges;

  /// No description provided for @youAreConfirmingThatTheCheckOut.
  ///
  /// In en, this message translates to:
  /// **'You are confirming that the check-out matches the agreed check-in, with no damage, missing items or other changes to record. Both parties will see this in the report.'**
  String get youAreConfirmingThatTheCheckOut;

  /// No description provided for @confirmNoChangesLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm no changes'**
  String get confirmNoChangesLabel;

  /// No description provided for @couldNotOpenThisInspection.
  ///
  /// In en, this message translates to:
  /// **'Could not open this inspection'**
  String get couldNotOpenThisInspection;

  /// No description provided for @waitingForSignatures.
  ///
  /// In en, this message translates to:
  /// **'Waiting for signatures.'**
  String get waitingForSignatures;

  /// No description provided for @readyToSendForSignature.
  ///
  /// In en, this message translates to:
  /// **'Ready to send for signature.'**
  String get readyToSendForSignature;

  /// No description provided for @checkTheInventoryAgainstYourPhotosThen.
  ///
  /// In en, this message translates to:
  /// **'Check the inventory against your photos, then mark each room reviewed.'**
  String get checkTheInventoryAgainstYourPhotosThen;

  /// No description provided for @openRoom.
  ///
  /// In en, this message translates to:
  /// **'Open room'**
  String get openRoom;

  /// No description provided for @changesAtCheckOut.
  ///
  /// In en, this message translates to:
  /// **'Changes at check-out'**
  String get changesAtCheckOut;

  /// No description provided for @recordAnythingThatDiffersFromTheAgreed.
  ///
  /// In en, this message translates to:
  /// **'Record anything that differs from the agreed check-in.'**
  String get recordAnythingThatDiffersFromTheAgreed;

  /// No description provided for @changeLabel.
  ///
  /// In en, this message translates to:
  /// **'change'**
  String get changeLabel;

  /// No description provided for @changes.
  ///
  /// In en, this message translates to:
  /// **'changes'**
  String get changes;

  /// No description provided for @nothingRecordedYet.
  ///
  /// In en, this message translates to:
  /// **'Nothing recorded yet'**
  String get nothingRecordedYet;

  /// No description provided for @addDamageWearMissingItemsOrImprovements.
  ///
  /// In en, this message translates to:
  /// **'Add damage, wear, missing items or improvements. If there are no changes, confirm that below.'**
  String get addDamageWearMissingItemsOrImprovements;

  /// No description provided for @addAnotherChange.
  ///
  /// In en, this message translates to:
  /// **'Add another change'**
  String get addAnotherChange;

  /// No description provided for @partiesNotVerifiedYet.
  ///
  /// In en, this message translates to:
  /// **'Parties not verified yet'**
  String get partiesNotVerifiedYet;

  /// No description provided for @ceaRequiresDueDiligenceOnTheLandlord.
  ///
  /// In en, this message translates to:
  /// **'CEA requires due diligence on the landlord and tenant before the tenancy is signed.'**
  String get ceaRequiresDueDiligenceOnTheLandlord;

  /// No description provided for @sendForSignatureAnyway.
  ///
  /// In en, this message translates to:
  /// **'Send for signature anyway'**
  String get sendForSignatureAnyway;

  /// No description provided for @sendReminders.
  ///
  /// In en, this message translates to:
  /// **'Send reminders'**
  String get sendReminders;

  /// No description provided for @estimatedRepairCost.
  ///
  /// In en, this message translates to:
  /// **'Estimated cost ({currency})'**
  String estimatedRepairCost(String currency);

  /// No description provided for @previousTenantName.
  ///
  /// In en, this message translates to:
  /// **'Last tenant: {name}'**
  String previousTenantName(String name);

  /// No description provided for @selectPropertyFirst.
  ///
  /// In en, this message translates to:
  /// **'Choose the property, or switch to New property.'**
  String get selectPropertyFirst;

  /// No description provided for @malaysianPostcodeLength.
  ///
  /// In en, this message translates to:
  /// **'A Malaysian postcode has 5 digits'**
  String get malaysianPostcodeLength;

  /// No description provided for @chooseFurnishingLevel.
  ///
  /// In en, this message translates to:
  /// **'Choose the property furnishing level.'**
  String get chooseFurnishingLevel;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'th', 'zh'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'th':
      return AppLocalizationsTh();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
