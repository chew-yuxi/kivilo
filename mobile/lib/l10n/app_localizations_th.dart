// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Thai (`th`).
class AppLocalizationsTh extends AppLocalizations {
  AppLocalizationsTh([String locale = 'th']) : super(locale);

  @override
  String settingsVersion(String version, String build) {
    return 'เวอร์ชัน $version ($build)';
  }

  @override
  String settingsVersionPatch(String version, int patch) {
    return '$version · แพตช์ $patch';
  }

  @override
  String get settingsDeletionDrawerTitle => 'ขอลบบัญชีใช่ไหม';

  @override
  String get settingsDeletionDrawerBody =>
      'เราจะยืนยันคำขอของคุณและลบข้อมูลที่เข้าเงื่อนไขภายใน 30 วัน บันทึกการตรวจและรายงานอาจต้องเก็บไว้ตามนโยบายการเก็บรักษาบันทึกการเช่าที่เกี่ยวข้อง';

  @override
  String get cancel => 'ยกเลิก';

  @override
  String get settingsRequestDeletion => 'ขอลบ';

  @override
  String settingsSignOutFailed(String error) {
    return 'ออกจากระบบไม่ได้ $error';
  }

  @override
  String settingsLicence(String number) {
    return 'ใบอนุญาต $number';
  }

  @override
  String settingsCea(String number) {
    return 'CEA $number';
  }

  @override
  String get settingsAddAgency => 'เพิ่มบริษัทนายหน้าของคุณ';

  @override
  String couldNotLoad(String error) {
    return 'โหลดไม่ได้: $error';
  }

  @override
  String get settingsBrandingEmpty =>
      'ชื่อและโลโก้ของคุณที่ด้านบนของรายงาน PDF';

  @override
  String get settingsBrandingSet => 'แสดงบนรายงาน PDF และรายงานที่แชร์';

  @override
  String get settingsPlan => 'แพ็กเกจ';

  @override
  String get loading => 'กำลังโหลด';

  @override
  String settingsPlanUsage(int used, int limit) {
    return 'ใช้ไปแล้ว $used จาก $limit ที่พักที่ใช้งานอยู่';
  }

  @override
  String get settingsAccount => 'บัญชี';

  @override
  String get settingsYourAccount => 'บัญชีของคุณ';

  @override
  String get settingsSignedIn => 'ลงชื่อเข้าใช้ Kivilo แล้ว';

  @override
  String get settingsForAgents => 'สำหรับนายหน้า';

  @override
  String get settingsStartCheckIn => 'เริ่มเช็กอิน';

  @override
  String get settingsStartCheckInDetail => 'เขียนรายงานที่พักทีละห้อง';

  @override
  String get settingsWorkspace => 'ทีม';

  @override
  String get settingsTeam => 'ทีม';

  @override
  String get settingsTeamDetail => 'สมาชิก คำเชิญ และงานที่มอบหมาย';

  @override
  String get settingsProperties => 'ที่พัก';

  @override
  String get settingsPropertiesDetail =>
      'การตั้งค่าที่พัก ที่พักที่เก็บถาวร และถังขยะ';

  @override
  String get settingsBranding => 'แบรนด์บนรายงาน';

  @override
  String get settingsBrandingDetail =>
      'บริษัทนายหน้าของคุณบนรายงาน PDF และรายงานที่แชร์';

  @override
  String get settingsPlanDetail => 'จำนวนที่พักที่คุณทำงานได้พร้อมกัน';

  @override
  String get settingsPrivacySupport => 'ความเป็นส่วนตัวและการช่วยเหลือ';

  @override
  String get settingsLanguage => 'ภาษา';

  @override
  String get settingsPhoneLanguage => 'ตามภาษาของโทรศัพท์';

  @override
  String get settingsPrivacyPolicy => 'นโยบายความเป็นส่วนตัว';

  @override
  String get settingsPrivacyPolicyDetail => 'Kivilo จัดการข้อมูลของคุณอย่างไร';

  @override
  String get settingsHelp => 'ความช่วยเหลือและการสนับสนุน';

  @override
  String get settingsHelpDetail =>
      'รับความช่วยเหลือเรื่องการตรวจหรือบัญชีของคุณ';

  @override
  String get settingsYourData => 'ข้อมูลของคุณ';

  @override
  String get settingsYourDataDetail => 'จัดการบัญชีและคำขอลบของคุณ';

  @override
  String get settingsAccountDeletion => 'การลบบัญชี';

  @override
  String get settingsDeletionAim =>
      'เราตั้งใจลบข้อมูลที่เข้าเงื่อนไขให้เสร็จภายใน 30 วันหลังได้รับคำขอ';

  @override
  String settingsDeletionDates(String requested, String due) {
    return 'ขอเมื่อ $requested · กำหนด $due';
  }

  @override
  String settingsDeletionDatesCompleted(
    String requested,
    String due,
    String completed,
  ) {
    return 'ขอเมื่อ $requested · กำหนด $due · เสร็จเมื่อ $completed';
  }

  @override
  String get sending => 'กำลังส่ง…';

  @override
  String get settingsRequestAccountDeletion => 'ขอลบบัญชี';

  @override
  String settingsDeletionLoadFailed(String error) {
    return 'โหลดคำขอลบของคุณไม่ได้ $error';
  }

  @override
  String get signOut => 'ออกจากระบบ';

  @override
  String get settingsSignOutDetail =>
      'ลายเซ็นที่บันทึกไว้จะถูกลบออกจากโทรศัพท์เครื่องนี้';

  @override
  String get unknown => 'ไม่ทราบ';

  @override
  String get settingsDeletionCompleted => 'คำขอเสร็จสิ้นแล้ว';

  @override
  String get settingsDeletionInProgress => 'คำขอกำลังดำเนินการ';

  @override
  String get settingsDeletionReceived => 'ได้รับคำขอแล้ว';

  @override
  String get dateShortPattern => 'd MMM y';

  @override
  String get dateMonthYearPattern => 'MMMM y';

  @override
  String get checkIn => 'เช็กอิน';

  @override
  String get checkOut => 'เช็กเอาต์';

  @override
  String get roomNotStarted => 'ยังไม่เริ่ม';

  @override
  String get roomNeedsReview => 'รอตรวจทาน';

  @override
  String get roomReviewed => 'ตรวจทานแล้ว';

  @override
  String get roomCapturing => 'กำลังถ่าย';

  @override
  String videoCount(int count) {
    return 'วิดีโอ $count รายการ';
  }

  @override
  String photoCount(int count) {
    return 'รูปภาพ $count รูป';
  }

  @override
  String get roomNothingCaptured => 'ยังไม่ได้ถ่าย';

  @override
  String get listSeparator => ', ';

  @override
  String roomSummaryWithItems(String summary, int count) {
    return '$summary · $count รายการ';
  }

  @override
  String get errorNoConnection =>
      'ไม่มีการเชื่อมต่อ ทุกอย่างที่คุณถ่ายไว้บันทึกอยู่ในโทรศัพท์เครื่องนี้ ลองอีกครั้งเมื่อมีสัญญาณ';

  @override
  String get errorSignedOut => 'คุณออกจากระบบแล้ว โปรดลงชื่อเข้าใช้อีกครั้ง';

  @override
  String get errorNotFound => 'ไม่พบรายการนี้ หรือบัญชีของคุณไม่มีสิทธิ์เปิด';

  @override
  String get errorReportFrozen => 'รายงานนี้ส่งไปให้ลงนามแล้วและแก้ไขไม่ได้';

  @override
  String get errorInvalidRequest => 'โปรดตรวจสอบรายละเอียดแล้วลองอีกครั้ง';

  @override
  String get errorReviewIncomplete =>
      'แต่ละห้องต้องมีอย่างน้อยหนึ่งรายการและต้องตรวจทานก่อน';

  @override
  String get errorAssessmentReviewIncomplete =>
      'เปิดและยืนยันทุกข้อค้นพบก่อนเผยแพร่การประเมิน';

  @override
  String get errorNoDamageUnconfirmed =>
      'เพิ่มข้อค้นพบ หรือยืนยันว่าไม่พบความเสียหาย ก่อนเผยแพร่';

  @override
  String get errorInvalidState => 'ทำสิ่งนี้ไม่ได้ในขั้นตอนนี้ของรายงาน';

  @override
  String get errorCaptureConflict =>
      'รูปภาพหรือวิดีโอนี้ซ้ำกับรายการที่มีอยู่แล้วในรายงาน รีเฟรชห้องแล้วตรวจสอบ';

  @override
  String get errorCaptureMissing =>
      'อัปโหลดไม่เสร็จ ไฟล์ยังอยู่ในโทรศัพท์เครื่องนี้ โปรดลองอีกครั้ง';

  @override
  String get errorEvidenceMissing =>
      'อัปโหลดไม่เสร็จ รูปภาพยังอยู่ในโทรศัพท์เครื่องนี้ โปรดลองอีกครั้ง';

  @override
  String get errorPlanLimit =>
      'ที่พักที่ใช้งานได้ในแพ็กเกจของคุณเต็มแล้ว ที่พักจะไม่ถูกนับเมื่อลงนามเช็กเอาต์แล้วหรือสัญญาเช่าสิ้นสุด';

  @override
  String get errorMaintenanceConflict =>
      'มีคนอัปเดตงานซ่อมนี้แล้ว รีเฟรชแล้วตรวจสอบไทม์ไลน์';

  @override
  String get errorMoveInDefectStale =>
      'รายการนี้ถูกเปลี่ยนหรือนำออกไปแล้ว จึงยอมรับประกาศนี้ไม่ได้ แต่คุณยังโต้แย้งได้';

  @override
  String get errorAgencyConflict =>
      'สิทธิ์การเข้าถึงของทีมเปลี่ยนไป รีเฟรชแล้วลองอีกครั้ง';

  @override
  String get errorPropertyHistory =>
      'ที่พักนี้มีประวัติรายงานจึงลบไม่ได้ เก็บถาวรไว้เพื่อรักษาบันทึก';

  @override
  String get errorPropertyRestoreExpired =>
      'ระยะเวลากู้คืนสิ้นสุดแล้ว กู้คืนที่พักนี้ไม่ได้อีก';

  @override
  String get errorPropertyTrashed =>
      'ที่พักนี้อยู่ในถังขยะ กู้คืนจาก บัญชี → ที่พัก → ถังขยะ ก่อนดำเนินการต่อ';

  @override
  String get errorFindingSaveConflict =>
      'ข้อค้นพบนี้บันทึกไว้แล้ว เปิดอีกครั้งเพื่อบันทึกการเปลี่ยนแปลงล่าสุด ฉบับร่างของคุณยังอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String errorServer(int status) {
    return 'Kivilo ทำรายการนี้ไม่ได้ในตอนนี้ โปรดลองอีกครั้ง (ข้อผิดพลาด $status)';
  }

  @override
  String get errorUnexpected => 'เกิดข้อผิดพลาด โปรดลองอีกครั้ง';

  @override
  String addendumAdded(String name) {
    return 'เพิ่ม: $name';
  }

  @override
  String addendumRemoved(String name) {
    return 'นำออก: $name';
  }

  @override
  String addendumReplaced(String old, String name) {
    return 'เปลี่ยน: $old เป็น $name';
  }

  @override
  String get addendumItem => 'รายการ';

  @override
  String acknowledgementPending(String role, String name) {
    return '$role $name: รอการรับทราบ';
  }

  @override
  String acknowledgedInPerson(String role, String name, String date) {
    return '$role $name: รับทราบด้วยตนเองเมื่อ $date';
  }

  @override
  String acknowledged(String role, String name, String date) {
    return '$role $name: รับทราบเมื่อ $date';
  }

  @override
  String partyRole(String role) {
    String _temp0 = intl.Intl.selectLogic(role, {
      'Landlord': 'ผู้ให้เช่า',
      'Tenant': 'ผู้เช่า',
      'LANDLORD': 'ผู้ให้เช่า',
      'TENANT': 'ผู้เช่า',
      'other': '$role',
    });
    return '$_temp0';
  }

  @override
  String get landlord => 'ผู้ให้เช่า';

  @override
  String get tenant => 'ผู้เช่า';

  @override
  String get basisMinorRepair => 'ข้อสัญญาการซ่อมเล็กน้อย';

  @override
  String get basisTenantCaused => 'เกิดจากผู้เช่า';

  @override
  String get basisFairWear => 'การเสื่อมสภาพตามปกติ';

  @override
  String get basisLandlordObligation => 'หน้าที่ของผู้ให้เช่า';

  @override
  String get basisOther => 'อื่นๆ';

  @override
  String proposalSharedPays(String cap) {
    return 'ผู้เช่าจ่าย $cap แรก ส่วนที่เหลือผู้ให้เช่าจ่าย';
  }

  @override
  String get proposalLandlordPays => 'ผู้ให้เช่าจ่าย';

  @override
  String get proposalTenantPays => 'ผู้เช่าจ่าย';

  @override
  String get proposalLandlordArranges => 'ผู้ให้เช่าเป็นผู้จัดการซ่อม';

  @override
  String get proposalTenantArranges => 'ผู้เช่าเป็นผู้จัดการซ่อม';

  @override
  String chooseLabel(String label) {
    return 'เลือก$label';
  }

  @override
  String get close => 'ปิด';

  @override
  String get statusReported => 'แจ้งแล้ว';

  @override
  String get statusAcknowledged => 'รับเรื่องแล้ว';

  @override
  String get statusScheduled => 'นัดหมายแล้ว';

  @override
  String get statusAwaitingConfirmation => 'รอการยืนยัน';

  @override
  String get statusResolved => 'แก้ไขแล้ว';

  @override
  String get statusClosed => 'ปิดแล้ว';

  @override
  String get statusCompleted => 'เสร็จสมบูรณ์';

  @override
  String get statusAwaitingSignatures => 'รอลายเซ็น';

  @override
  String get statusDraft => 'ฉบับร่าง';

  @override
  String get signInConnectFailed =>
      'เชื่อมต่อไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';

  @override
  String get signInWelcomeBack => 'ยินดีต้อนรับกลับมา';

  @override
  String get signInCheckEmail => 'ตรวจสอบอีเมลของคุณ';

  @override
  String get signInTagline => 'ที่พักของคุณ มีบันทึกไว้ชัดเจน';

  @override
  String get signInContinue => 'ลงชื่อเข้าใช้เพื่อทำการตรวจต่อ';

  @override
  String signInEnterCode(String email) {
    return 'ป้อนรหัส 6 หลักที่ส่งไปยัง $email';
  }

  @override
  String get signInIntro =>
      'รายงานสภาพที่พัก งานซ่อม และประวัติ สำหรับนายหน้า ผู้ให้เช่า และผู้เช่า';

  @override
  String get signInCodeLabel => 'รหัสยืนยัน';

  @override
  String get signInEmailLabel => 'อีเมล';

  @override
  String get signInPasswordHint => 'รหัสผ่านของคุณ';

  @override
  String get signInHidePassword => 'ซ่อนรหัสผ่าน';

  @override
  String get signInShowPassword => 'แสดงรหัสผ่าน';

  @override
  String get working => 'กำลังดำเนินการ';

  @override
  String get signIn => 'ลงชื่อเข้าใช้';

  @override
  String get signInEmailCode => 'ส่งรหัสทางอีเมล';

  @override
  String get signInResend => 'ส่งรหัสใหม่';

  @override
  String get signInDifferentEmail => 'ใช้อีเมลอื่น';

  @override
  String get signInUseCode => 'ใช้รหัสทางอีเมลแทน';

  @override
  String get signInWithPassword => 'ลงชื่อเข้าใช้ด้วยรหัสผ่าน';

  @override
  String get signInFooter => 'ทุกห้อง ทุกรายละเอียด พร้อมเมื่อคุณต้องการ';

  @override
  String get updateReady => 'อัปเดตพร้อมแล้ว';

  @override
  String get updateKivilo => 'อัปเดต Kivilo';

  @override
  String get updateRestartBody =>
      'ดาวน์โหลดอัปเดตแล้ว Kivilo จะปิดลง แล้วแจ้งเตือนคุณเมื่อพร้อมเปิดใหม่';

  @override
  String get updateDownloadBody =>
      'มีอัปเดตของ Kivilo ดาวน์โหลดตอนนี้ แล้ว Kivilo จะปิดลงและแจ้งเตือนคุณเมื่อพร้อมเปิดใหม่';

  @override
  String get updateCloseAndUpdate => 'ปิดและอัปเดต';

  @override
  String get update => 'อัปเดต';

  @override
  String get updateStoreFailed => 'เปิดสโตร์ไม่ได้ ค้นหา Kivilo ในสโตร์แทน';

  @override
  String get updateOpenAppStore => 'เปิด App Store';

  @override
  String get updateOpenGooglePlay => 'เปิด Google Play';

  @override
  String get updateRequiredBody =>
      'ไม่รองรับเวอร์ชันนี้แล้ว รูปภาพและวิดีโอในโทรศัพท์เครื่องนี้จะยังอยู่ และจะอัปโหลดต่อหลังอัปเดต';

  @override
  String get updateDoneTitle => 'อัปเดต Kivilo แล้ว';

  @override
  String get updateDoneBody => 'แตะเพื่อเปิด Kivilo อีกครั้ง';

  @override
  String get updateChannelName => 'การอัปเดตแอป';

  @override
  String get updateChannelDescription => 'การอัปเดตแอป Kivilo ที่เสร็จแล้ว';

  @override
  String get updateNeedsNotifications =>
      'ต้องเปิดการแจ้งเตือน เพื่อให้ Kivilo บอกคุณได้เมื่อเปิดใหม่ได้อย่างปลอดภัย';

  @override
  String get pushNewNotification => 'การแจ้งเตือนใหม่จาก Kivilo';

  @override
  String get open => 'เปิด';

  @override
  String get homeTitle => 'หน้าแรก';

  @override
  String get notifications => 'การแจ้งเตือน';

  @override
  String get homeUrgentServices => 'บริการเร่งด่วน';

  @override
  String get homeInspections => 'การตรวจ';

  @override
  String get homeWorkspaceFailed => 'โหลดทีมของคุณไม่ได้';

  @override
  String get tryAgain => 'ลองอีกครั้ง';

  @override
  String get homeShowAllProperties => 'แสดงที่พักทั้งหมด';

  @override
  String get homeGoodMorning => 'สวัสดีตอนเช้า';

  @override
  String get homeGoodAfternoon => 'สวัสดีตอนบ่าย';

  @override
  String get homeGoodEvening => 'สวัสดีตอนเย็น';

  @override
  String homeCounts(int inProgress, int awaiting) {
    return 'กำลังดำเนินการ $inProgress · รอลายเซ็น $awaiting';
  }

  @override
  String get homeViewInspections => 'ดูการตรวจ';

  @override
  String get newCheckIn => 'เช็กอินใหม่';

  @override
  String homeGreeting(String greeting, String name) {
    return '$greeting คุณ $name';
  }

  @override
  String get homePartySubtitle =>
      'รายงาน งานซ่อม และประวัติของคุณ อยู่ในที่เดียว';

  @override
  String get homeAgentSubtitle => 'ขั้นตอนถัดไปที่ชัดเจนสำหรับทุกการส่งมอบ';

  @override
  String get homeOffline => 'ออฟไลน์ แสดงงานที่โหลดไว้ก่อนหน้า';

  @override
  String get homeYourProperties => 'ที่พักของคุณ';

  @override
  String get homeYourPropertiesDetail => 'งานซ่อม บันทึก และผู้ที่อาศัยอยู่';

  @override
  String get homeEyebrowNextHandover => 'การส่งมอบครั้งถัดไป';

  @override
  String get homeEyebrowWaiting => 'รอลายเซ็น';

  @override
  String get homeEyebrowNextStep => 'ขั้นตอนถัดไป';

  @override
  String get homeHeadlineEmpty => 'การส่งมอบที่ดี\nเริ่มจากบันทึกที่ชัดเจน';

  @override
  String get homeHeadlineAwaiting => 'ให้ทุกฝ่าย\nเห็นตรงกัน';

  @override
  String get homeHeadlineFirstRoom => 'เริ่มจากห้องแรก';

  @override
  String get homeHeadlineContinue => 'ทีละห้อง';

  @override
  String get homeBodyEmpty =>
      'เพิ่มที่พักและสัญญาเช่า เราจะพาคุณตั้งแต่รูปแรกจนถึงรายงานที่ลงนามแล้ว';

  @override
  String get homeBodyAwaiting =>
      'รายการทรัพย์สินถูกล็อกแล้ว ตรวจสอบว่าใครยังต้องลงนาม หรือส่งอีเมลขอลายเซ็นอีกครั้ง';

  @override
  String get homeBodyFirstRoom => 'เพิ่มห้อง ถ่ายรูป แล้วจดสิ่งที่คุณพบ';

  @override
  String get homeBodyContinue =>
      'เปิดห้อง เลือกรายการทรัพย์สิน เพิ่มรูปและตรวจสภาพ ก่อนตรวจทานห้อง';

  @override
  String get homeStartCheckIn => 'เริ่มเช็กอิน';

  @override
  String get homeCheckSignatures => 'ตรวจสอบลายเซ็น';

  @override
  String get homeAddFirstRoom => 'เพิ่มห้องแรก';

  @override
  String get homeContinueInspection => 'ตรวจต่อ';

  @override
  String get homeOpenProperty => 'เปิดที่พัก';

  @override
  String get homeOpenCheckIn => 'เปิดเช็กอิน';

  @override
  String get homeOpenCheckOut => 'เปิดเช็กเอาต์';

  @override
  String get viewReport => 'ดูรายงาน';

  @override
  String get homeYouAreLandlord => 'คุณเป็นผู้ให้เช่า';

  @override
  String get homeYouAreTenant => 'คุณเป็นผู้เช่า';

  @override
  String get homeReportPending =>
      'รายงานเช็กอินของคุณจะแสดงที่นี่เมื่อนายหน้าส่งมา';

  @override
  String get homeReviewAndSign => 'ตรวจทานและลงนาม';

  @override
  String get checkOutReport => 'รายงานเช็กเอาต์';

  @override
  String get checkInReport => 'รายงานเช็กอิน';

  @override
  String get repairs => 'งานซ่อม';

  @override
  String get homeNoProperties => 'ยังไม่มีที่พัก';

  @override
  String get homeNoPropertiesDetail => 'สร้างเช็กอินเพื่อเพิ่มที่พักแรกของคุณ';

  @override
  String get agent => 'นายหน้า';

  @override
  String get filterAll => 'ทั้งหมด';

  @override
  String get filterInProgress => 'กำลังดำเนินการ';

  @override
  String get filterCheckOutDue => 'ถึงกำหนดตรวจคืนที่พัก';

  @override
  String get filterRunning => 'อยู่ระหว่างการเช่า';

  @override
  String get filterEnded => 'สิ้นสุดแล้ว';

  @override
  String get filterAwaitingSignature => 'รอลายเซ็น';

  @override
  String get inspectionsLoadFailed => 'โหลดการตรวจไม่ได้';

  @override
  String get inspectionsSubtitle =>
      'รายงานเช็กอินและเช็กเอาต์ของคุณ อยู่ในที่เดียว';

  @override
  String get inspectionsResponsibleAgent => 'นายหน้าผู้รับผิดชอบ';

  @override
  String get inspectionsAllAgents => 'นายหน้าทุกคน';

  @override
  String get inspectionsTeamNote => 'แสดงงานของทีมที่บัญชีของคุณเข้าถึงได้';

  @override
  String get inspectionsOffline =>
      'ออฟไลน์ แสดงข้อมูลที่โหลดไว้ล่าสุด คุณยังถ่ายรูปต่อได้';

  @override
  String get inspectionsSearch => 'ค้นหาการตรวจ';

  @override
  String get inspectionsSearchHint => 'ที่พัก ผู้เช่า หรือ เช็กอิน / เช็กเอาต์';

  @override
  String get inspectionsClearSearch => 'ล้างการค้นหา';

  @override
  String inspectionsCount(int count) {
    return '$count รายงาน';
  }

  @override
  String inspectionsFound(int count) {
    return 'พบ $count รายงาน';
  }

  @override
  String get inspectionsNoMatch => 'ไม่พบการตรวจที่ตรงกัน';

  @override
  String get inspectionsNoMatchDetail =>
      'ลองที่พักหรือผู้เช่าอื่น หรือเปลี่ยนตัวกรอง';

  @override
  String get inspectionsShowAll => 'แสดงการตรวจทั้งหมด';

  @override
  String inspectionsResponsible(String name) {
    return 'ผู้รับผิดชอบ: $name';
  }

  @override
  String roomCount(int count) {
    return '$count ห้อง';
  }

  @override
  String get inspectionsEmpty => 'ยังไม่มีการตรวจ';

  @override
  String get inspectionsEmptyOffline =>
      'เชื่อมต่ออินเทอร์เน็ตเพื่อสร้างเช็กอินใหม่';

  @override
  String get inspectionsEmptyDetail =>
      'เริ่มเช็กอินสำหรับการส่งมอบครั้งถัดไป รายการทรัพย์สิน รูปภาพ และรายงานที่ลงนามแล้วจะอยู่ที่นี่';

  @override
  String get workspaceChoose => 'เลือกทีม';

  @override
  String get workspaceAll => 'ที่พักทั้งหมด';

  @override
  String get workspacePersonal => 'ส่วนตัว';

  @override
  String workspaceInvitations(int count) {
    return 'คำเชิญเข้าทีม ($count)';
  }

  @override
  String get workspaceAddTeam => 'เพิ่มทีม';

  @override
  String get teamAccessChanged =>
      'สิทธิ์การเข้าถึงของทีมเปลี่ยนไป รีเฟรชแล้วลองอีกครั้ง';

  @override
  String get newWhoOwns => 'งานนี้เป็นของใคร';

  @override
  String get newPersonalDetail => 'เห็นได้เฉพาะคุณจนกว่าคุณจะเพิ่มผู้ร่วมงาน';

  @override
  String get newTeamDetail =>
      'นายหน้าที่ได้รับมอบหมาย รวมถึงเจ้าของทีมและผู้จัดการ เข้าถึงงานนี้ได้';

  @override
  String get newCreateTeamHint => 'สร้างหรือเข้าร่วมทีมได้ที่ บัญชี → ทีม';

  @override
  String get newFurnishingRequired => 'เลือกว่าที่พักตกแต่งครบหรือไม่';

  @override
  String get newEndAfterStart => 'วันสิ้นสุดสัญญาเช่าต้องอยู่หลังวันเริ่มต้น';

  @override
  String fieldRequired(String label) {
    return '$label (จำเป็น)';
  }

  @override
  String fieldOptional(String label) {
    return '$label (ไม่บังคับ)';
  }

  @override
  String fieldIsRequired(String label) {
    return 'ต้องระบุ$label';
  }

  @override
  String get fieldInvalidEmail => 'ป้อนอีเมลที่ถูกต้อง';

  @override
  String fieldInvalidAmount(String currency) {
    return 'ป้อนจำนวนเงิน $currency ให้ถูกต้อง โดยมีทศนิยมไม่เกิน 2 ตำแหน่ง';
  }

  @override
  String get newEssentials => 'เริ่มจากข้อมูลสำคัญ';

  @override
  String get newEssentialsDetail =>
      'ตั้งค่าที่พักและสัญญาเช่า แล้วค่อยเพิ่มห้องทีหลัง';

  @override
  String newWorkspace(String name) {
    return 'ทีม: $name';
  }

  @override
  String get newPrivate => 'เห็นได้เฉพาะคุณจนกว่าคุณจะแชร์';

  @override
  String get newTeamResponsible =>
      'คุณเป็นนายหน้าผู้รับผิดชอบ เพื่อนร่วมงานที่ได้รับมอบหมายทำงานร่วมกับคุณได้ เจ้าของและผู้จัดการดูแลที่พักทั้งหมดของทีม';

  @override
  String get newProperty => 'ที่พัก';

  @override
  String get newPropertyDetail => 'สถานที่ส่งมอบ';

  @override
  String get newAddress => 'ที่อยู่';

  @override
  String get newUnit => 'ห้องเลขที่';

  @override
  String get newPostalCode => 'รหัสไปรษณีย์';

  @override
  String get newPropertyTypeRequired => 'ประเภทที่พัก (จำเป็น)';

  @override
  String get newChoosePropertyType => 'เลือกประเภทที่พัก';

  @override
  String get propertyTypePrivate => 'ที่อยู่อาศัยส่วนบุคคล ไม่มีที่ดิน';

  @override
  String get propertyTypePrivateDetail => 'คอนโดมิเนียมหรืออพาร์ตเมนต์เอกชน';

  @override
  String get propertyTypeHdb => 'HDB';

  @override
  String get propertyTypeHdbDetail => 'แฟลตเคหะของรัฐ';

  @override
  String get propertyTypeLanded => 'บ้านพร้อมที่ดิน';

  @override
  String get propertyTypeLandedDetail => 'ทาวน์เฮาส์ บ้านแฝด หรือบ้านเดี่ยว';

  @override
  String get propertyTypeCommercial => 'เชิงพาณิชย์';

  @override
  String get propertyTypeCommercialDetail =>
      'สำนักงาน ร้านค้า หรือสถานประกอบการอื่น';

  @override
  String get newFurnishing => 'การตกแต่ง (จำเป็น)';

  @override
  String get newFurnishingDetail =>
      'ห้องที่ตกแต่งครบจะเริ่มด้วยรายการทรัพย์สินมาตรฐาน ห้องอื่นจะเริ่มว่างเปล่า';

  @override
  String get newFullyFurnished => 'ตกแต่งครบ';

  @override
  String get newNotFullyFurnished => 'ตกแต่งไม่ครบ';

  @override
  String get newPeople => 'บุคคล';

  @override
  String get newPeopleDetail => 'ผู้ให้เช่าและผู้เช่าในรายงาน';

  @override
  String get newLandlordName => 'ชื่อผู้ให้เช่า';

  @override
  String get newLandlordEmail => 'อีเมลผู้ให้เช่า';

  @override
  String get newTenantName => 'ชื่อผู้เช่า';

  @override
  String get newTenantEmail => 'อีเมลผู้เช่า';

  @override
  String get newTenancy => 'สัญญาเช่า';

  @override
  String get newTenancyDetail => 'วันที่และจำนวนเงินที่ตกลงกัน';

  @override
  String get newStarts => 'วันเริ่มต้น (จำเป็น)';

  @override
  String get newEnds => 'วันสิ้นสุด (จำเป็น)';

  @override
  String newMonthlyRent(String currency) {
    return 'ค่าเช่ารายเดือน ($currency)';
  }

  @override
  String newDeposit(String currency) {
    return 'เงินประกัน ($currency)';
  }

  @override
  String get creating => 'กำลังสร้าง…';

  @override
  String get newCreate => 'สร้างเช็กอิน';

  @override
  String get assetAddTitle => 'เพิ่มอุปกรณ์ของที่พัก';

  @override
  String get assetName => 'ชื่อ';

  @override
  String get assetCategory => 'หมวดหมู่';

  @override
  String get assetAppliance => 'เครื่องใช้ไฟฟ้า';

  @override
  String get assetFixture => 'อุปกรณ์ติดตั้งถาวร';

  @override
  String get assetFurniture => 'เฟอร์นิเจอร์';

  @override
  String get assetSurface => 'พื้นผิว';

  @override
  String get assetSystem => 'ระบบ';

  @override
  String get assetRoomOptional => 'ห้อง (ไม่บังคับ)';

  @override
  String get assetIdentifierOptional =>
      'ยี่ห้อ รุ่น หรือหมายเลขเครื่อง (ไม่บังคับ)';

  @override
  String get add => 'เพิ่ม';

  @override
  String get minorRepairCap => 'วงเงินซ่อมเล็กน้อย';

  @override
  String get minorRepairCapBody =>
      'จำนวนเงินที่ผู้เช่าจ่ายสำหรับการซ่อมเล็กน้อยแต่ละครั้งตามสัญญาเช่า ระบบจะกรอกส่วนแบ่งให้ล่วงหน้าเมื่อมีคนเสนอว่าใครจ่าย โดยผู้เช่ายังต้องยอมรับทุกข้อเสนอ';

  @override
  String get minorRepairCapLabel => 'ผู้เช่าจ่ายไม่เกิน';

  @override
  String get currencyPrefix => 'S\$ ';

  @override
  String get minorRepairCapHelper => 'เว้นว่างไว้หากสัญญาไม่มีวงเงิน';

  @override
  String get minorRepairCapInvalid => 'ป้อนจำนวนเงิน เช่น 150';

  @override
  String get save => 'บันทึก';

  @override
  String get defectPeriod => 'ระยะเวลาแจ้งความชำรุดเมื่อย้ายเข้า';

  @override
  String get defectPeriodBody =>
      'ใช้ระยะเวลาตามสัญญาเช่า วันเริ่มสัญญาเช่าคือวันที่ 1 ตามเวลาสิงคโปร์ ระยะเวลานี้จะคงที่เมื่อผู้เช่าลงนามเช็กอินครั้งแรก';

  @override
  String get defectPeriodDays => 'จำนวนวัน';

  @override
  String get defectPeriodHelper => '0 คือปิดระยะเวลาแจ้งความชำรุดเมื่อย้ายเข้า';

  @override
  String get defectPeriodInvalid => 'ป้อนจำนวนเต็มตั้งแต่ 0 ถึง 365';

  @override
  String get tenancyEyebrow => 'ที่พักของคุณ';

  @override
  String get tenancySubtitle => 'รายงาน งานซ่อม และประวัติของบ้านหลังนี้';

  @override
  String get tenancyRecord => 'บันทึกที่พัก';

  @override
  String get tenancyRecordDetail =>
      'สภาพที่ตกลงกัน และสิ่งที่เกิดขึ้นหลังจากนั้น';

  @override
  String get tenancyManageAccess => 'จัดการสิทธิ์การเข้าถึง';

  @override
  String get tenancyPropertyAccess => 'สิทธิ์เข้าถึงที่พัก';

  @override
  String get tenancyOpenInspectionDetail => 'ห้อง รายการทรัพย์สิน และลายเซ็น';

  @override
  String get tenancyLatestCheckOut => 'รายงานเช็กเอาต์ล่าสุด';

  @override
  String get tenancyLatestCheckIn => 'รายงานเช็กอินล่าสุด';

  @override
  String get tenancyViewReport => 'ดูรายงานสภาพ';

  @override
  String get tenancyTimeline => 'ไทม์ไลน์ที่พัก';

  @override
  String get tenancyTimelineDetail =>
      'รายงานที่ลงนามแล้ว งานซ่อม และค่าใช้จ่ายที่ตกลงกันที่ที่อยู่นี้';

  @override
  String get propertySettings => 'การตั้งค่าที่พัก';

  @override
  String get tenancyCare => 'การดูแลที่พัก';

  @override
  String get tenancyCareDetail => 'แจ้งปัญหาและติดตามงานซ่อมแต่ละงาน';

  @override
  String get tenancyDanger => 'มีอันตรายเร่งด่วนหรือไม่';

  @override
  String get tenancyDangerNumbers => 'ตำรวจ 999 · ดับเพลิงหรือรถพยาบาล 995';

  @override
  String get reportProblem => 'แจ้งปัญหา';

  @override
  String get defectPeriodDisabled => 'ปิดอยู่ ยังแจ้งซ่อมได้';

  @override
  String defectPeriodSummary(int days, String date) {
    return '$days วัน · แจ้งภายใน $date (เวลาสิงคโปร์)';
  }

  @override
  String get edit => 'แก้ไข';

  @override
  String get maintenance => 'งานซ่อมบำรุง';

  @override
  String get tenancyMaintenanceEmpty => 'คำขอสำหรับที่พักนี้จะแสดงที่นี่';

  @override
  String requestCount(int count) {
    return '$count คำขอ';
  }

  @override
  String repairAttempts(int count) {
    return 'ซ่อม $count ครั้ง';
  }

  @override
  String get repairCosts => 'ค่าซ่อม';

  @override
  String get repairCostsDetail => 'เงื่อนไขที่กำหนดว่าใครจ่ายค่าซ่อม';

  @override
  String get assets => 'อุปกรณ์ของที่พัก';

  @override
  String get assetsDetail => 'เครื่องใช้ไฟฟ้าและอุปกรณ์ที่เชื่อมกับงานซ่อม';

  @override
  String get assetAdd => 'เพิ่มอุปกรณ์';

  @override
  String assetRepairs(int count) {
    return 'ซ่อม $count ครั้งใน 365 วัน';
  }

  @override
  String get assetRepeatFault => 'เสียซ้ำ';

  @override
  String get notSet => 'ยังไม่ได้ตั้ง';

  @override
  String minorRepairCapSummary(String amount) {
    return 'ผู้เช่าจ่ายไม่เกิน S\$$amount ต่อการซ่อมหนึ่งครั้ง';
  }

  @override
  String get set => 'ตั้งค่า';

  @override
  String get agentMayAgreeCosts => 'นายหน้าตกลงค่าใช้จ่ายได้';

  @override
  String get agentMayAgreeCostsOn =>
      'ให้นายหน้ายอมรับหรือปฏิเสธข้อเสนอค่าใช้จ่ายแทนคุณ';

  @override
  String get agentMayAgreeCostsLandlordOnly =>
      'เฉพาะผู้ให้เช่าเท่านั้นที่เปลี่ยนได้';

  @override
  String get tenancyNoRequests => 'ไม่มีคำขอที่เปิดอยู่';

  @override
  String get tenancyNoRequestsDetail =>
      'สัญญาเช่านี้ยังไม่มีการแจ้งปัญหาการซ่อมบำรุง';

  @override
  String get assetsEmpty => 'ยังไม่ได้เพิ่มอุปกรณ์ให้ที่พักนี้';

  @override
  String get propertyArchived => 'เก็บถาวรแล้ว';

  @override
  String get propertyInTrash => 'อยู่ในถังขยะ';

  @override
  String get propertyActive => 'ที่พักที่ใช้งานอยู่';

  @override
  String propertyCounts(int tenancies, int inspections, int photos) {
    return 'สัญญาเช่า $tenancies · การตรวจ $inspections · รูปภาพ $photos';
  }

  @override
  String get propertyTenancyAccess => 'สิทธิ์เข้าถึงสัญญาเช่า';

  @override
  String get propertyPersonalTenancy => 'สัญญาเช่าส่วนตัว';

  @override
  String propertyResponsibleAgent(String name) {
    return 'นายหน้าผู้รับผิดชอบ: $name';
  }

  @override
  String get propertyOpenCheckOutReport => 'เปิดรายงานเช็กเอาต์';

  @override
  String get propertyOpenCheckInReport => 'เปิดรายงานเช็กอิน';

  @override
  String get propertyDangerZone => 'การดำเนินการที่ย้อนกลับไม่ได้';

  @override
  String get propertyManageOnly =>
      'เฉพาะนายหน้าหลักของที่พักหรือผู้จัดการบริษัทนายหน้าเท่านั้นที่เก็บถาวรหรือลบได้ คุณต้องมีสิทธิ์จัดการทุกสัญญาเช่าที่ที่อยู่นี้';

  @override
  String get propertyTrashedNoDate =>
      'ที่พักนี้ถูกซ่อนจากงานที่ใช้งานอยู่ กู้คืนก่อนระยะเวลากู้คืนสิ้นสุด';

  @override
  String propertyTrashedUntil(String date) {
    return 'ที่พักนี้ถูกซ่อนจากงานที่ใช้งานอยู่ กู้คืนก่อน $date หลังจากนั้นบันทึกและสื่อที่เข้าเงื่อนไขจะถูกลบถาวร';
  }

  @override
  String get propertyRestore => 'กู้คืนที่พัก';

  @override
  String get propertyArchivedBody =>
      'ที่พักนี้อยู่นอกพอร์ตที่ใช้งานอยู่ บันทึกและรายงานยังเก็บไว้';

  @override
  String get propertyArchiveBody =>
      'การเก็บถาวรจะนำที่อยู่นี้ออกจากงานที่ใช้งานอยู่ และเก็บรายงานกับประวัติไว้ กู้คืนได้ภายหลัง';

  @override
  String get propertyRestoreActive => 'กู้คืนเป็นที่พักที่ใช้งานอยู่';

  @override
  String get propertyArchive => 'เก็บถาวรที่พัก';

  @override
  String get propertyDeleteBody =>
      'ลบที่พักที่สร้างผิดหรือมีแต่ฉบับร่าง ที่พักจะอยู่ในถังขยะ 30 วัน ก่อนที่บันทึกและสื่อที่เข้าเงื่อนไขจะถูกลบถาวร';

  @override
  String get propertyDelete => 'ลบที่พัก';

  @override
  String get propertyMoveToTrash => 'ย้ายไปถังขยะ';

  @override
  String questionTitle(String label) {
    return '$label ใช่ไหม';
  }

  @override
  String propertyTrashBody(int tenancies, int inspections, int photos) {
    return 'การดำเนินการนี้มีผลกับสัญญาเช่า $tenancies รายการ การตรวจ $inspections ครั้ง และรูปภาพ $photos รูป คุณมีเวลา 30 วันในการกู้คืนจาก ที่พัก → ถังขยะ';
  }

  @override
  String get propertyArchiveConfirmBody =>
      'ที่พักนี้จะถูกนำออกจากงานที่ใช้งานอยู่สำหรับทุกคนที่มีสิทธิ์ รายงานและหลักฐานยังดูได้ในที่พักที่เก็บถาวร';

  @override
  String get propertyRestoreConfirmBody =>
      'ที่พักและงานที่บันทึกไว้จะกลับสู่สถานะก่อนหน้า';

  @override
  String propertyTypeToConfirm(String label) {
    return 'พิมพ์ “$label” เพื่อยืนยัน';
  }

  @override
  String get propertyAddress => 'ที่อยู่ที่พัก';

  @override
  String get propertiesActive => 'ใช้งานอยู่';

  @override
  String get propertiesTrash => 'ถังขยะ';

  @override
  String get propertiesNoActive => 'ไม่มีที่พักที่ใช้งานอยู่';

  @override
  String get propertiesNoArchived => 'ไม่มีที่พักที่เก็บถาวร';

  @override
  String get propertiesTrashEmpty => 'ถังขยะว่างเปล่า';

  @override
  String propertyListCounts(int tenancies, int inspections) {
    return 'สัญญาเช่า $tenancies · การตรวจ $inspections';
  }

  @override
  String propertyRestoreBefore(String date) {
    return 'กู้คืนก่อน $date';
  }

  @override
  String get teamCreateTitle => 'สร้างทีม';

  @override
  String get teamWorkTogether => 'ทำงานร่วมกัน';

  @override
  String get teamIntro =>
      'สร้างหรือเข้าร่วมทีมเพื่อดูแลที่พักร่วมกับเพื่อนร่วมงาน นายหน้าเห็นที่พักที่ได้รับมอบหมาย เจ้าของและผู้จัดการทีมเห็นที่พักทั้งหมดของทีม เลือก “ส่วนตัว” สำหรับที่พักของคุณเอง';

  @override
  String teamInvitationTo(String team) {
    return 'คำเชิญเข้าร่วม $team';
  }

  @override
  String teamInvitationRole(String role, String date) {
    return '$role · หมดอายุ $date';
  }

  @override
  String get teamJoinDetail =>
      'การเข้าร่วมจะทำให้คุณเป็นสมาชิกของทีมนี้ นายหน้าทำงานกับสัญญาเช่าที่ได้รับมอบหมาย ผู้จัดการดูแลงานของทีม';

  @override
  String get teamJoin => 'เข้าร่วมทีม';

  @override
  String get teamDecline => 'ปฏิเสธคำเชิญ';

  @override
  String teamRoleMembers(String role, int count) {
    return '$role · สมาชิก $count คน';
  }

  @override
  String teamOpenWorkspace(String team) {
    return 'เปิดทีม $team';
  }

  @override
  String get teamCreate => 'สร้างทีม';

  @override
  String get teamMembers => 'สมาชิกทีม';

  @override
  String teamRoleSummary(String role) {
    return '$role · นายหน้าเห็นสัญญาเช่าที่ได้รับมอบหมาย เจ้าของและผู้จัดการดูแลพอร์ตของทีม';
  }

  @override
  String get teamInviteMember => 'เชิญสมาชิก';

  @override
  String get teamRename => 'เปลี่ยนชื่อทีม';

  @override
  String get teamMembersAndInvitations => 'สมาชิกและคำเชิญ';

  @override
  String get teamMemberActive => 'ใช้งานอยู่';

  @override
  String get teamInvitationPending => 'รอตอบรับคำเชิญ';

  @override
  String get teamMemberRemoved => 'นำออกแล้ว';

  @override
  String teamAssignedTenancies(int count) {
    return 'ได้รับมอบหมาย $count สัญญาเช่า';
  }

  @override
  String teamExpires(String date) {
    return 'หมดอายุ $date';
  }

  @override
  String get teamAssignedWork => 'งานที่ได้รับมอบหมาย';

  @override
  String get teamNoProperties =>
      'ทีมยังไม่มีที่พัก เลือกทีมนี้เมื่อเริ่มตรวจรับเข้า หรือย้ายสัญญาเช่าส่วนตัวที่มีอยู่จากหน้าสิทธิ์เข้าถึงที่พัก';

  @override
  String get teamRecentActivity => 'กิจกรรมล่าสุด';

  @override
  String get activityCreatedTeam => 'สร้างทีม';

  @override
  String get activityInvitedMember => 'เชิญสมาชิก';

  @override
  String get activityResentInvitation => 'ส่งคำเชิญอีกครั้ง';

  @override
  String get activityRevokedInvitation => 'ยกเลิกคำเชิญ';

  @override
  String get activityRemovedMember => 'นำสมาชิกออก';

  @override
  String get activityRenamedTeam => 'เปลี่ยนชื่อทีม';

  @override
  String get activityJoinedTeam => 'เข้าร่วมทีม';

  @override
  String get activityDeclinedInvitation => 'ปฏิเสธคำเชิญ';

  @override
  String get activityReassigned => 'มอบหมายที่พักของสมาชิกที่ออกไปใหม่';

  @override
  String get activityChangedAssignments => 'เปลี่ยนการมอบหมายที่พัก';

  @override
  String get activityAddedProperty => 'เพิ่มที่พักเข้าทีม';

  @override
  String get activityAddedCollaborator => 'เพิ่มผู้ร่วมงานในที่พัก';

  @override
  String get activityRemovedCollaborator => 'นำผู้ร่วมงานออกจากที่พัก';

  @override
  String get activityPropertyArchive => 'เก็บถาวรที่พัก';

  @override
  String get activityPropertyUnarchive => 'กู้คืนที่พักที่เก็บถาวร';

  @override
  String get activityPropertyTrash => 'ย้ายที่พักไปถังขยะ';

  @override
  String get activityPropertyRestore => 'กู้คืนที่พักจากถังขยะ';

  @override
  String activityChangedRole(String role) {
    return 'เปลี่ยนบทบาทเป็น$role';
  }

  @override
  String get teamName => 'ชื่อทีม';

  @override
  String get teamInviteColleague => 'เชิญเพื่อนร่วมงาน';

  @override
  String get teamEmailAddress => 'อีเมล';

  @override
  String get roleManager => 'ผู้จัดการ';

  @override
  String get teamManagerDetail =>
      'ผู้จัดการเห็นสัญญาเช่าของทีม มอบหมายงาน และจัดการสมาชิกได้';

  @override
  String get teamAgentDetail =>
      'นายหน้าทำงานกับสัญญาเช่าที่ได้รับมอบหมาย บันทึกอื่นของทีมจะเป็นส่วนตัว';

  @override
  String get teamSendInvitation => 'ส่งคำเชิญ';

  @override
  String get teamInvitationNotAccepted =>
      'ยังไม่มีการตอบรับคำเชิญนี้ จึงยังเข้าถึงงานของทีมไม่ได้';

  @override
  String get teamResendInvitation => 'ส่งคำเชิญอีกครั้ง';

  @override
  String get teamRevokeInvitation => 'ยกเลิกคำเชิญ';

  @override
  String teamRemoveConfirm(String name, String team) {
    return 'นำ $name ออกจาก $team ใช่ไหม สิทธิ์เข้าถึงบริษัทนายหน้าของบุคคลนี้จะหยุดลง งานที่บันทึกไว้และชื่อผู้จัดทำยังคงอยู่ ที่พักส่วนตัวไม่ได้รับผลกระทบ';
  }

  @override
  String teamReassignFirst(int count) {
    return 'มอบหมายสัญญาเช่า $count รายการใหม่ก่อนนำสมาชิกนี้ออก';
  }

  @override
  String get teamNewResponsibleAgent => 'นายหน้าผู้รับผิดชอบคนใหม่';

  @override
  String get teamChooseMember => 'เลือกสมาชิก';

  @override
  String get teamRolesExplained =>
      'เจ้าของจัดการทีม ผู้จัดการดูแลพอร์ต นายหน้าทำงานกับสัญญาเช่าที่ได้รับมอบหมาย';

  @override
  String get teamRemoveMember => 'นำสมาชิกออก';

  @override
  String get teamSaveRole => 'บันทึกบทบาท';

  @override
  String get roleOwner => 'เจ้าของ';

  @override
  String accessRemoveTitle(String name) {
    return 'นำ $name ออกใช่ไหม';
  }

  @override
  String get accessRemoveReportsBody =>
      'บุคคลนี้จะเข้าถึงรายงานก่อนหน้าของสัญญาเช่านี้ไม่ได้อีก งานที่บันทึกไว้แล้วยังคงอยู่ในที่พัก';

  @override
  String get accessRemoveBody =>
      'บุคคลนี้จะเข้าถึงสัญญาเช่านี้ รวมถึงการตรวจ บันทึกเพิ่มเติม และงานซ่อมไม่ได้อีก งานที่บันทึกไว้แล้วยังคงอยู่ในที่พัก';

  @override
  String get accessRemove => 'นำสิทธิ์ออก';

  @override
  String get accessPreviousReports => 'สิทธิ์เข้าถึงรายงานก่อนหน้า';

  @override
  String get accessReportsOnlyIntro =>
      'สิทธิ์ของคุณครอบคลุมเฉพาะรายงานก่อนหน้าที่คุณเคยทำ นายหน้าหลักเพิ่มคุณเป็นผู้ร่วมงานเพื่อทำงานกับสัญญาเช่านี้ได้';

  @override
  String get accessIntro =>
      'ผู้ร่วมงานถ่ายรูป แก้ไขรายการทรัพย์สิน และจัดการงานซ่อมของสัญญาเช่านี้ได้ แต่เข้าถึงสัญญาเช่าหรือที่พักอื่นไม่ได้';

  @override
  String get accessPersonalDetail =>
      'งานนี้เป็นของนายหน้าหลัก การย้ายเข้าทีมจะให้สิทธิ์แก่เจ้าของและผู้จัดการทีม';

  @override
  String get accessTeamDetail =>
      'เจ้าของและผู้จัดการทีมดูแลสัญญาเช่านี้ นายหน้าที่ได้รับมอบหมายและผู้ร่วมงานภายนอกทำงานกับสัญญาเช่านี้ได้';

  @override
  String get accessMoveToTeam => 'ย้ายเข้าทีม';

  @override
  String get accessAssignMembers => 'มอบหมายสมาชิกทีม';

  @override
  String get accessLeadOnly =>
      'เฉพาะนายหน้าหลักเท่านั้นที่ทำงานกับสัญญาเช่านี้ได้';

  @override
  String get accessLeadAgent => 'นายหน้าหลัก';

  @override
  String get accessCanWork => 'ทำงานกับสัญญาเช่านี้ได้';

  @override
  String get remove => 'นำออก';

  @override
  String get accessPreviousReportsOnly => 'เฉพาะรายงานก่อนหน้า';

  @override
  String get accessPreviousReportsDetail =>
      'นายหน้าเหล่านี้ยังเข้าถึงรายงานที่เคยทำได้ แต่ทำงานส่วนอื่นของสัญญาเช่านี้ไม่ได้';

  @override
  String accessPreviousReportCount(int count) {
    return 'รายงานก่อนหน้า $count ฉบับ';
  }

  @override
  String get accessAddCollaboratorTitle => 'เพิ่มผู้ร่วมงาน';

  @override
  String get accessAddCollaboratorDetail =>
      'บุคคลนี้จะเปิดที่พักได้หลังลงชื่อเข้าใช้ Kivilo ด้วยอีเมลนี้';

  @override
  String get saving => 'กำลังบันทึก…';

  @override
  String get accessAddCollaborator => 'เพิ่มผู้ร่วมงาน';

  @override
  String get accessLeadManages =>
      'เฉพาะนายหน้าหลักเท่านั้นที่เพิ่มหรือนำผู้ร่วมงานออกได้';

  @override
  String get accessTeamManages =>
      'นายหน้าผู้รับผิดชอบและผู้จัดการทีมเปลี่ยนสิทธิ์การเข้าถึงได้';

  @override
  String get accessHandoverDetail =>
      'การเปลี่ยนนายหน้าผู้รับผิดชอบเป็นการโอนการจัดการ โดยไม่เปลี่ยนชื่อผู้จัดทำหรือรายงานที่ลงนามแล้ว ผู้ร่วมงานภายนอกยังคงมีสิทธิ์เดิม';

  @override
  String get accessFindMember => 'ค้นหาสมาชิกทีม';

  @override
  String get accessTeamMember => 'สมาชิกทีม';

  @override
  String get accessSaveAssignment => 'บันทึกการมอบหมาย';

  @override
  String get accessMoveTitle => 'ย้ายสัญญาเช่าเข้าทีมใช่ไหม';

  @override
  String get accessMoveBody =>
      'สัญญาเช่านี้จะกลายเป็นงานของทีม เจ้าของและผู้จัดการจะได้รับสิทธิ์และมอบหมายใหม่ได้ ผู้ร่วมงานเดิม รายงานที่ลงนามแล้ว และชื่อผู้จัดทำจะยังคงอยู่ สัญญาเช่าส่วนตัวอื่นยังเป็นส่วนตัว';

  @override
  String get accessCreateTeamFirst => 'สร้างหรือเข้าร่วมทีมก่อนที่ บัญชี → ทีม';

  @override
  String get accessChooseTeam => 'เลือกทีม';

  @override
  String accessTeamTenancy(String team) {
    return 'สัญญาเช่าของทีม · $team';
  }

  @override
  String get accessPrivate => 'ส่วนตัว';

  @override
  String get accessShared => 'สัญญาเช่าที่แชร์';

  @override
  String accessSharedWith(String names) {
    return 'แชร์กับ $names';
  }

  @override
  String accessReportsSharedWith(String names) {
    return 'แชร์รายงานก่อนหน้ากับ $names';
  }

  @override
  String get changeDamage => 'เสียหาย';

  @override
  String get changeWear => 'สึกหรอ';

  @override
  String get changeMissing => 'สูญหาย';

  @override
  String get changeImproved => 'ดีขึ้น';

  @override
  String get changeUnchanged => 'ไม่เปลี่ยนแปลง';

  @override
  String get verdictUndecided => 'ยังไม่ตัดสิน';

  @override
  String get verdictTenantLiable => 'ผู้เช่ารับผิดชอบ';

  @override
  String get verdictFairWear => 'เสื่อมสภาพตามปกติ';

  @override
  String get verdictDisputed => 'มีข้อโต้แย้ง';

  @override
  String get roomAddTitle => 'เพิ่มห้อง';

  @override
  String get roomName => 'ชื่อห้อง';

  @override
  String get stillUploading => 'ยังอัปโหลดอยู่';

  @override
  String get stillUploadingBody =>
      'รูปภาพ วิดีโอ หรือการเปลี่ยนแปลงบางรายการยังอัปโหลดไม่เสร็จ เปิดแต่ละห้องแล้วแตะ ลองอัปโหลดอีกครั้ง ก่อนส่งให้ลงนาม';

  @override
  String get sendForSignatureTitle => 'ส่งให้ลงนามใช่ไหม';

  @override
  String sendForSignatureBody(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'ตรวจทานครบทั้ง $count ห้องแล้ว',
      one: 'ตรวจทานห้องแล้ว',
    );
    return '$_temp0 การส่งจะล็อกรายการทรัพย์สิน คำอธิบาย และเครื่องหมายบนรูปภาพ ตรวจทานรายงานกับทั้งสองฝ่ายก่อนลงนาม';
  }

  @override
  String get send => 'ส่ง';

  @override
  String signingLinkSent(String name) {
    return 'กำลังส่งลิงก์ลงนามไปยัง $name';
  }

  @override
  String get pdfNoViewer =>
      'ติดตั้งแอปอ่าน PDF เพื่อเปิดรายงานนี้ หรือใช้ แชร์ PDF เพื่อส่ง';

  @override
  String get pdfOpenFailed =>
      'เปิด PDF นี้ไม่ได้ โปรดลองอีกครั้ง หรือใช้ แชร์ PDF';

  @override
  String get findingPhotosUnfinished =>
      'ทำเครื่องหมายและอัปโหลดรูปข้อค้นพบให้เสร็จก่อนเผยแพร่ เปิด เพิ่มข้อค้นพบ หรือ ตรวจทานข้อค้นพบ อีกครั้งเพื่อทำต่อ';

  @override
  String get publishNoDamageTitle => 'เผยแพร่: ไม่พบความเสียหายใช่ไหม';

  @override
  String get publishAssessmentTitle => 'เผยแพร่การประเมินใช่ไหม';

  @override
  String get publishNoDamageBody =>
      'ไม่มีการบันทึกการเปลี่ยนแปลงระหว่างเช็กอินและเช็กเอาต์ การเผยแพร่เป็นการยืนยันว่าคุณตรวจแล้วไม่พบความเสียหาย และทั้งสองฝ่ายจะเห็นในรายงานที่แชร์ การแก้ไขภายหลังต้องเผยแพร่เวอร์ชันใหม่';

  @override
  String get publishAssessmentBody =>
      'ข้อค้นพบที่ตรวจทานแล้วจะแสดงเป็นการประเมินที่ระบุวันที่ แยกจากรายการทรัพย์สินที่ลงนามแล้ว การแก้ไขภายหลังต้องเผยแพร่เวอร์ชันใหม่';

  @override
  String get publishNoDamage => 'เผยแพร่ว่าไม่มีความเสียหาย';

  @override
  String get publish => 'เผยแพร่';

  @override
  String get inspection => 'การตรวจ';

  @override
  String inspectionOpenFailed(String error) {
    return 'เปิดการตรวจนี้ไม่ได้ $error';
  }

  @override
  String get inspectionOffline =>
      'สำเนาออฟไลน์ เปิดห้องที่บันทึกไว้เพื่อถ่ายต่อ การตรวจทานและการลงนามต้องเชื่อมต่ออินเทอร์เน็ต';

  @override
  String get inspectionCheckInEyebrow => 'รายงานเช็กอิน';

  @override
  String get inspectionCheckOutEyebrow => 'รายงานเช็กเอาต์';

  @override
  String step(int number, String name) {
    return 'ขั้นตอนที่ $number จาก 3: $name';
  }

  @override
  String stepComplete(int number, String name) {
    return 'ขั้นตอนที่ $number จาก 3: $name เสร็จแล้ว';
  }

  @override
  String stepCurrent(int number, String name) {
    return 'ขั้นตอนที่ $number จาก 3: $name ขั้นตอนปัจจุบัน';
  }

  @override
  String get stepRooms => 'ห้อง';

  @override
  String get stepReview => 'ตรวจทาน';

  @override
  String get stepSign => 'ลงนาม';

  @override
  String get inspectionSigned => 'ลงนามและบันทึกไว้อย่างปลอดภัยแล้ว';

  @override
  String get inspectionReadyToSign => 'พร้อมให้ทั้งสองฝ่ายลงนาม';

  @override
  String get inspectionRoomsReady => 'ห้องพร้อมแล้ว ตรวจทานแล้วส่ง';

  @override
  String get inspectionBuildRecord => 'สร้างบันทึกทีละห้อง';

  @override
  String get inspectionCheckEachRoom => 'ตรวจแต่ละห้องก่อนส่ง';

  @override
  String get inspectionSignedBody =>
      'ทั้งสองฝ่ายลงนามแล้ว รายงานที่ตกลงกันพร้อมให้ดูและแชร์';

  @override
  String get inspectionSentBody =>
      'รายงานถูกล็อกแล้ว เก็บลายเซ็นด้านล่าง ด้วยตนเองหรือทางอีเมล';

  @override
  String get inspectionRoomsReadyBody =>
      'การส่งจะล็อกรายการทรัพย์สิน คำอธิบาย และเครื่องหมายบนรูปภาพ เพื่อให้ทั้งสองฝ่ายลงนาม';

  @override
  String get inspectionRecordingBody =>
      'เริ่มจากรายการทรัพย์สินในห้อง เปิดแต่ละรายการเพื่อบันทึกสภาพ ถ่ายรูป และทำเครื่องหมายรายละเอียด';

  @override
  String get inspectionReviewBody =>
      'ตรวจรายการทรัพย์สินเทียบกับรูปภาพและวิดีโอ แล้วทำเครื่องหมายว่าตรวจทานแต่ละห้องแล้ว';

  @override
  String roomsReviewedSuffix(int total) {
    return '/$total ห้องที่ตรวจทานแล้ว';
  }

  @override
  String get sendForSignature => 'ส่งให้ลงนาม';

  @override
  String continueRoom(String room) {
    return 'ทำต่อ: $room';
  }

  @override
  String get inspectionPeople => 'บุคคลในรายงานนี้';

  @override
  String get tenantHandover => 'การส่งมอบให้ผู้เช่า';

  @override
  String get viewCheckInBaseline => 'ดูข้อมูลอ้างอิงจากเช็กอิน';

  @override
  String get reportSummary => 'สรุปรายงาน';

  @override
  String get roomsStartFirst => 'เริ่มจากห้องแรกของคุณ';

  @override
  String get roomsDetail => 'รายการทรัพย์สินและสื่อ ทีละห้อง';

  @override
  String get roomsEmpty => 'ยังไม่มีห้อง';

  @override
  String get roomsEmptyDetail => 'เพิ่มห้องเพื่อเริ่มรายการทรัพย์สิน';

  @override
  String get signatures => 'ลายเซ็น';

  @override
  String get signaturesDetail =>
      'รายการทรัพย์สินที่ตกลงกันถูกล็อกไว้สำหรับการลงนามแล้ว';

  @override
  String get shareReport => 'แชร์รายงาน';

  @override
  String get shareReportDetail =>
      'ลิงก์ส่วนตัว หรือ PDF ที่มีหัวกระดาษบริษัทนายหน้าของคุณ';

  @override
  String get shareReportSigned => 'ดูหรือส่งรายงานที่ลงนามแล้ว';

  @override
  String get viewPdf => 'ดู PDF';

  @override
  String get sharePdf => 'แชร์ PDF';

  @override
  String get shareLink => 'แชร์ลิงก์';

  @override
  String get shareLinkWarning => 'ทุกคนที่มีลิงก์อ่านรายงานนี้ได้';

  @override
  String get signedReportAndUpdates => 'รายงานที่ลงนามแล้วและบันทึกเพิ่มเติม';

  @override
  String get writeUpdate => 'เขียนบันทึกเพิ่มเติม';

  @override
  String get endOfTenancy => 'สิ้นสุดสัญญาเช่า';

  @override
  String get endOfTenancyDetail =>
      'ใช้เช็กอินที่ลงนามแล้วนี้เป็นข้อมูลอ้างอิงสำหรับเช็กเอาต์';

  @override
  String get startCheckOut => 'เริ่มเช็กเอาต์';

  @override
  String get maintenanceHistory => 'ประวัติงานซ่อม';

  @override
  String get maintenanceHistoryDetail =>
      'ข้อมูลประกอบการตรวจทาน คนเป็นผู้ตัดสินว่ามีผลต่อข้อค้นพบหรือไม่';

  @override
  String repairCount(int count) {
    return 'ซ่อม $count ครั้ง';
  }

  @override
  String mediaFileCount(int count) {
    return 'ไฟล์สื่อ $count ไฟล์';
  }

  @override
  String costAgreed(String agreement) {
    return 'ตกลงค่าใช้จ่ายแล้ว: $agreement';
  }

  @override
  String get costPending => 'ข้อเสนอค่าใช้จ่ายรอคำตอบ';

  @override
  String get costDisputed => 'ค่าใช้จ่ายมีข้อโต้แย้ง';

  @override
  String get costNotProposed => 'ยังไม่มีใครเสนอว่าใครจ่าย';

  @override
  String costsOpen(int count) {
    return 'งานซ่อม $count งานยังไม่ได้ตกลงค่าใช้จ่าย';
  }

  @override
  String get costsOpenBody =>
      'ตกลงว่าใครจ่ายแต่ละงานก่อนตัดสินเรื่องเงินประกัน หรือเชื่อมกับข้อค้นพบเพื่อตัดสินที่นั่น';

  @override
  String roomPreview(String room, int number) {
    return '$room ตัวอย่างที่ $number';
  }

  @override
  String get signed => 'ลงนามแล้ว';

  @override
  String get noEmailOnFile => 'ไม่มีอีเมลในระบบ';

  @override
  String signingLinkEmailed(String date) {
    return 'ส่งลิงก์ลงนามทางอีเมลแล้วเมื่อ $date';
  }

  @override
  String get signingLinkQueued => 'กำลังส่งลิงก์ลงนามทางอีเมล';

  @override
  String get signingLinkFailed => 'ส่งลิงก์ลงนามทางอีเมลไม่ได้';

  @override
  String get signingLinkNotEmailed => 'ยังไม่ได้ส่งลิงก์ลงนามทางอีเมล';

  @override
  String get emailSigningLink => 'ส่งลิงก์ลงนามทางอีเมล';

  @override
  String get resend => 'ส่งอีกครั้ง';

  @override
  String get checkOutAssessment => 'การประเมินเช็กเอาต์';

  @override
  String get checkOutAssessmentDetail =>
      'บันทึกการเปลี่ยนแปลงและความรับผิดชอบที่ระบุวันที่ แยกต่างหาก';

  @override
  String get checkOutAssessmentIntro =>
      'บันทึกการเปลี่ยนแปลงแต่ละรายการตั้งแต่เช็กอิน ข้อค้นพบจะเป็นส่วนตัวจนกว่าคุณจะเผยแพร่ และรายการทรัพย์สินที่ลงนามแล้วจะไม่เปลี่ยน';

  @override
  String publishedVersion(int version) {
    return 'เวอร์ชันที่เผยแพร่ $version';
  }

  @override
  String get findings => 'ข้อค้นพบ';

  @override
  String get findingsEmpty => 'ยังไม่มีการบันทึกการเปลี่ยนแปลง';

  @override
  String findingsCount(int count) {
    return 'บันทึกการเปลี่ยนแปลงแล้ว $count รายการ';
  }

  @override
  String get findingUnconfirmed => 'ยังไม่ยืนยัน';

  @override
  String findingEstimatedCost(String amount) {
    return 'ค่าใช้จ่ายโดยประมาณ · SGD $amount';
  }

  @override
  String get findingsConfirmFirst =>
      'เปิดและยืนยันข้อค้นพบที่ยังไม่ยืนยันทุกรายการก่อนเผยแพร่';

  @override
  String get publishNoDamageFound => 'เผยแพร่: ไม่พบความเสียหาย';

  @override
  String get publishAssessment => 'เผยแพร่การประเมิน';

  @override
  String get publishNewVersion => 'เผยแพร่เวอร์ชันใหม่';

  @override
  String get categoryMeter => 'มิเตอร์';

  @override
  String get conditionNew => 'ใหม่';

  @override
  String get conditionGood => 'ดี';

  @override
  String get conditionFair => 'พอใช้';

  @override
  String get conditionPoor => 'แย่';

  @override
  String get conditionDamaged => 'เสียหาย';

  @override
  String get photoActions => 'การทำงานกับรูปภาพ';

  @override
  String get videoActions => 'การทำงานกับวิดีโอ';

  @override
  String get preview => 'ดูตัวอย่าง';

  @override
  String get previewDetail => 'เปิดไฟล์ต้นฉบับ';

  @override
  String get editNote => 'แก้ไขหมายเหตุ';

  @override
  String get noteHint => 'อธิบายว่าภาพนี้แสดงอะไร';

  @override
  String get markPhoto => 'ทำเครื่องหมายบนรูป';

  @override
  String get markPhotoDetail => 'วงกลม ชี้ หรือวาดทับรายละเอียด';

  @override
  String get deleteMedia => 'ลบสื่อ';

  @override
  String get photo => 'รูปภาพ';

  @override
  String get deletePhotoTitle => 'ลบรูปภาพนี้ใช่ไหม';

  @override
  String get deleteVideoTitle => 'ลบวิดีโอนี้ใช่ไหม';

  @override
  String get deleteMediaBody =>
      'รายการนี้จะถูกลบออกจากห้องและจากทุกรายการทรัพย์สินที่แนบอยู่';

  @override
  String get delete => 'ลบ';

  @override
  String deleteNamed(String name) {
    return 'ลบ $name ใช่ไหม';
  }

  @override
  String get deleteItemBody => 'บรรทัดนี้จะถูกลบออกจากรายการทรัพย์สิน';

  @override
  String nothingToRecordTitle(String room) {
    return 'ไม่มีอะไรต้องบันทึกใน $room ใช่ไหม';
  }

  @override
  String get nothingToRecordBody =>
      'ห้องนี้จะถูกทำเครื่องหมายว่าตรวจทานแล้วโดยไม่มีรายการ รายงานจะระบุว่าไม่มีการบันทึกอะไรในห้องนี้';

  @override
  String get confirm => 'ยืนยัน';

  @override
  String get signInAgain => 'ลงชื่อเข้าใช้อีกครั้งเพื่อดำเนินการต่อ';

  @override
  String get roomStillUploadingBody =>
      'รูปภาพ วิดีโอ หรือการเปลี่ยนแปลงบางรายการในห้องนี้ยังอัปโหลดไม่เสร็จ เปิดรายการนั้นหรือ สื่อและวิดีโอเดินชมห้อง เพื่อทำเครื่องหมายให้เสร็จและลองอัปโหลดอีกครั้งก่อนดำเนินการต่อ';

  @override
  String get roomRename => 'เปลี่ยนชื่อห้อง';

  @override
  String get roomActions => 'การทำงานกับห้อง';

  @override
  String get roomRenameDetail => 'เปลี่ยนชื่อห้อง';

  @override
  String get roomDelete => 'ลบห้อง';

  @override
  String get roomDeleteDetail => 'ลบรูปภาพ วิดีโอ และรายการทรัพย์สินของห้อง';

  @override
  String get roomDeleteTitle => 'ลบห้องนี้ใช่ไหม';

  @override
  String get roomDeleteBody =>
      'รูปภาพ วิดีโอ และรายการทรัพย์สินของห้องนี้จะถูกลบ';

  @override
  String get room => 'ห้อง';

  @override
  String get roomInventory => 'รายการทรัพย์สินในห้อง';

  @override
  String roomOpenFailed(String error) {
    return 'เปิดห้องนี้ไม่ได้ $error';
  }

  @override
  String get atCheckIn => 'ตอนเช็กอิน';

  @override
  String get atCheckInSigned => 'สภาพห้องนี้ตอนที่ลงนาม';

  @override
  String atCheckInSignedOn(String date) {
    return 'สภาพห้องนี้ตอนที่ลงนามเมื่อ $date';
  }

  @override
  String get hide => 'ซ่อน';

  @override
  String get show => 'แสดง';

  @override
  String get inventory => 'รายการทรัพย์สิน';

  @override
  String itemsInRoom(int count) {
    return '$count รายการในห้องนี้';
  }

  @override
  String get inventoryEmpty => 'ยังไม่มีรายการทรัพย์สิน';

  @override
  String get inventoryEmptyDetail =>
      'เพิ่มรายการ แล้วเปิดเพื่อถ่ายรูปและทำเครื่องหมายรายละเอียด';

  @override
  String get media => 'สื่อ';

  @override
  String get mediaEmptyDetail => 'รูปภาพและวิดีโอของห้องนี้';

  @override
  String get mediaOne => 'รูปภาพหรือวิดีโอ 1 รายการ';

  @override
  String mediaMany(int count) {
    return 'รูปภาพและวิดีโอ $count รายการ';
  }

  @override
  String get newestFirst => 'ใหม่สุดก่อน';

  @override
  String get oldestFirst => 'เก่าสุดก่อน';

  @override
  String get roomMediaWalkthrough => 'สื่อและวิดีโอเดินชมห้อง';

  @override
  String get mediaEmpty => 'ยังไม่มีรูปภาพหรือวิดีโอ';

  @override
  String get mediaEmptyUploading =>
      'รูปภาพและวิดีโอจะแสดงที่นี่เมื่ออัปโหลดเสร็จ';

  @override
  String get finishRoom => 'ทำห้องนี้ให้เสร็จ';

  @override
  String get finishRoomEmpty =>
      'เพิ่มรายการ หรือยืนยันว่าไม่มีอะไรต้องบันทึกในห้องนี้';

  @override
  String get finishRoomBody =>
      'ตรวจทุกรายการเทียบกับรูปภาพและวิดีโอ เมื่อคุณตรวจทานแล้ว ห้องนี้จะพร้อมสำหรับรายงาน';

  @override
  String get reviewedRoom => 'ฉันตรวจทานห้องนี้แล้ว';

  @override
  String get nothingToRecord => 'ไม่มีอะไรต้องบันทึก';

  @override
  String get roomOffline =>
      'สำเนาออฟไลน์ ถ่ายต่อได้ การแก้ไขระหว่างตรวจทานต้องเชื่อมต่ออินเทอร์เน็ต';

  @override
  String get roomRecordEyebrow => 'บันทึกห้อง';

  @override
  String roomCounts(int items, int photos, int videos) {
    return '$items รายการ · รูปภาพ $photos · วิดีโอ $videos';
  }

  @override
  String get roomFixedBody =>
      'รายการทรัพย์สินนี้ถูกล็อกไว้สำหรับการลงนาม สื่อยังดูได้ด้านล่าง';

  @override
  String get roomPendingBody =>
      'เริ่มจากรายการทรัพย์สิน เปิดรายการเพื่อเพิ่มรูปและทำเครื่องหมายรายละเอียด';

  @override
  String get roomReviewBody =>
      'เปิดแต่ละรายการเพื่อตรวจรายละเอียดและเพิ่มรูป แล้วทำเครื่องหมายว่าตรวจทานห้องนี้แล้ว';

  @override
  String get roomReviewedBody =>
      'ตรวจทานห้องนี้แล้ว เปิดรายการเพื่ออัปเดตรายละเอียดหรือเพิ่มรูป';

  @override
  String get roomCapturingBody =>
      'เพิ่มแต่ละรายการในรายการทรัพย์สิน แล้วเปิดเพื่อถ่ายรูปและทำเครื่องหมายรายละเอียด';

  @override
  String get video => 'วิดีโอ';

  @override
  String photoNumber(int number) {
    return 'รูปภาพที่ $number';
  }

  @override
  String videoNumber(int number) {
    return 'วิดีโอที่ $number';
  }

  @override
  String fieldNone(String field) {
    return 'ไม่มี$field';
  }

  @override
  String fieldValue(String field, String value) {
    return '$field: $value';
  }

  @override
  String get atCheckInUpdatedPrefix => 'ตอนเช็กอิน (อัปเดตแล้ว):';

  @override
  String get atCheckInPrefix => 'ตอนเช็กอิน:';

  @override
  String get fieldName => 'ชื่อ';

  @override
  String get fieldSerial => 'หมายเลขเครื่อง';

  @override
  String get fieldReading => 'ค่าที่อ่านได้';

  @override
  String get fieldNotes => 'หมายเหตุ';

  @override
  String get openItem => 'เปิดรายการ';

  @override
  String get deleteItem => 'ลบรายการ';

  @override
  String quantityShort(int count) {
    return 'จำนวน $count';
  }

  @override
  String identifierLine(String value) {
    return 'รหัส  $value';
  }

  @override
  String readingLine(String value) {
    return 'ค่าที่อ่านได้  $value';
  }

  @override
  String get attachedMedia => 'สื่อที่แนบ';

  @override
  String markedPhotoNumber(int number) {
    return 'รูปที่ทำเครื่องหมายที่ $number';
  }

  @override
  String openAttachedTo(String label, String item) {
    return 'เปิด$labelที่แนบกับ $item';
  }

  @override
  String get backToMediaActions => 'กลับไปที่การทำงานกับสื่อ';

  @override
  String get note => 'หมายเหตุ';

  @override
  String get saveNote => 'บันทึกหมายเหตุ';

  @override
  String get itemNameRequired => 'ป้อนชื่อรายการและจำนวนอย่างน้อยหนึ่ง';

  @override
  String get editItem => 'แก้ไขรายการทรัพย์สิน';

  @override
  String get editItemDetail =>
      'อธิบายรายการนี้ ถ่ายรูปได้จากหน้ารายการทรัพย์สิน';

  @override
  String get condition => 'สภาพ';

  @override
  String get quantity => 'จำนวน';

  @override
  String get makeModelSerial => 'ยี่ห้อ รุ่น หรือหมายเลขเครื่อง';

  @override
  String get meterReading => 'ค่ามิเตอร์';

  @override
  String get notes => 'หมายเหตุ';

  @override
  String get hideRoomMedia => 'ซ่อนสื่อของห้องที่มีอยู่';

  @override
  String get linkRoomMedia => 'เชื่อมสื่อของห้องที่มีอยู่';

  @override
  String get finishUploadingBeforeLink =>
      'อัปโหลดรูปของห้องนี้ให้เสร็จก่อนเชื่อมสื่อที่มีอยู่';

  @override
  String get linkRoomMediaDetail =>
      'เลือกรูปภาพและวิดีโอของห้องที่สนับสนุนรายการนี้ หมายเหตุและเครื่องหมายบนรูปจะยังแนบอยู่';

  @override
  String get noRoomMedia => 'ยังไม่มีสื่อในห้องนี้';

  @override
  String get hasPhotoMarks => 'มีเครื่องหมายบนรูป';

  @override
  String get saveChanges => 'บันทึกการเปลี่ยนแปลง';

  @override
  String captureCheckFailed(String error) {
    return 'ตรวจสอบสื่อที่บันทึกไว้ไม่ได้ $error';
  }

  @override
  String get captureAccountChanged => 'บัญชีเปลี่ยนไป เปิดห้องนี้อีกครั้ง';

  @override
  String get captureRoomNotLoaded =>
      'ยังไม่ได้โหลดห้องนี้ในโทรศัพท์เครื่องนี้ เชื่อมต่ออินเทอร์เน็ตหนึ่งครั้งเพื่อเปิด';

  @override
  String captureSaveFailed(String error) {
    return 'บันทึกรูปภาพหรือวิดีโอนั้นไม่ได้ $error';
  }

  @override
  String captureAddFailed(String error) {
    return 'เพิ่มรูปภาพหรือวิดีโอนั้นไม่ได้ $error';
  }

  @override
  String uploadPausedError(String error) {
    return 'หยุดอัปโหลดชั่วคราว $error';
  }

  @override
  String get mediaActions => 'การทำงานกับสื่อ';

  @override
  String get playVideo => 'เล่นวิดีโอ';

  @override
  String get markPhotoDetailShort => 'วงกลมหรือชี้ไปที่รายละเอียด';

  @override
  String get capturePhotoNotFoundNote =>
      'ไม่พบรูปภาพนี้ โปรดลองเพิ่มหมายเหตุอีกครั้ง';

  @override
  String get capturePhotoOpenFailed =>
      'เปิดรูปภาพนี้ไม่ได้ โปรดลองอีกครั้งเมื่อเชื่อมต่ออินเทอร์เน็ต';

  @override
  String get savePhoto => 'บันทึกรูปภาพ';

  @override
  String get capturePhotoNotFoundMarks =>
      'ไม่พบรูปภาพนี้ โปรดลองทำเครื่องหมายอีกครั้ง';

  @override
  String get captureNotFoundDelete =>
      'ไม่พบรูปภาพหรือวิดีโอนี้ โปรดลองลบอีกครั้ง';

  @override
  String get captureWaitForSave => 'รอให้รูปภาพหรือวิดีโอบันทึกเสร็จก่อน';

  @override
  String get captureNotUploaded =>
      'รูปภาพ วิดีโอ หรือการเปลี่ยนแปลงบางรายการยังอัปโหลดไม่เสร็จ ลองอีกครั้งเมื่อมีสัญญาณ';

  @override
  String captureReviewFailed(String error) {
    return 'เปิดการตรวจทานไม่ได้ $error';
  }

  @override
  String get captureMarksFailed =>
      'อัปโหลดรูปภาพแล้ว แต่เครื่องหมายอัปโหลดไม่สำเร็จ ลองอีกครั้ง หรือแก้ไขเครื่องหมาย';

  @override
  String get finishMarking => 'ทำเครื่องหมายให้เสร็จ';

  @override
  String uploadSizeSuffix(String unit, String total, String totalUnit) {
    return ' $unit จาก $total $totalUnit';
  }

  @override
  String get roomMedia => 'สื่อของห้อง';

  @override
  String atCheckInDate(String date) {
    return 'ตอนเช็กอิน · $date';
  }

  @override
  String get retryUploads => 'ลองอัปโหลดอีกครั้ง';

  @override
  String atCheckInLine(String name, String condition, int count) {
    return 'ตอนเช็กอิน: $name · $condition · จำนวน $count';
  }

  @override
  String serialAtCheckIn(String value) {
    return 'หมายเลขเครื่อง / รุ่น ตอนเช็กอิน: $value';
  }

  @override
  String meterAtCheckIn(String value) {
    return 'ค่ามิเตอร์ตอนเช็กอิน: $value';
  }

  @override
  String checkInNotes(String value) {
    return 'หมายเหตุตอนเช็กอิน: $value';
  }

  @override
  String serialModel(String value) {
    return 'หมายเลขเครื่อง / รุ่น: $value';
  }

  @override
  String meterReadingValue(String value) {
    return 'ค่ามิเตอร์: $value';
  }

  @override
  String get editDetails => 'แก้ไขรายละเอียด';

  @override
  String get photosAndVideo => 'รูปภาพและวิดีโอ';

  @override
  String get captureRoomIntro =>
      'บันทึกวิดีโอเดินชมห้อง หรือจัดการสื่อของห้องที่มีอยู่';

  @override
  String get captureItemIntro =>
      'ถ่ายรูป ทำเครื่องหมายถ้ามี แล้วบันทึก รูปจะแนบกับรายการนี้โดยอัตโนมัติ';

  @override
  String get captureOffline =>
      'ออฟไลน์ รูปภาพและวิดีโอจะอยู่ในโทรศัพท์เครื่องนี้และอัปโหลดเมื่อมีสัญญาณ';

  @override
  String captureInterrupted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'รูปภาพหรือวิดีโอ $count รายการ',
      one: 'รูปภาพหรือวิดีโอ 1 รายการ',
    );
    return '$_temp0ถูกขัดจังหวะระหว่างบันทึก อย่าถอนการติดตั้ง Kivilo หรือล้างข้อมูลแอป เพื่อไม่ให้ข้อมูลสูญหาย';
  }

  @override
  String editsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'การเปลี่ยนแปลง $count รายการ',
      one: 'การเปลี่ยนแปลง 1 รายการ',
    );
    return '$_temp0รออัปโหลด แตะเพื่อลองอีกครั้ง';
  }

  @override
  String get photos => 'รูปภาพ';

  @override
  String get recordVideo => 'บันทึกวิดีโอ';

  @override
  String get takeAnotherPhoto => 'ถ่ายรูปอีก';

  @override
  String get takePhoto => 'ถ่ายรูป';

  @override
  String get chooseVideo => 'เลือกวิดีโอ';

  @override
  String get choosePhotos => 'เลือกรูปภาพ';

  @override
  String get itemMedia => 'สื่อของรายการ';

  @override
  String get captureSavedFirst => 'บันทึกในโทรศัพท์ก่อน แล้วจึงเพิ่มในรายงาน';

  @override
  String get captureReviewWaits =>
      'การตรวจทานจะเปิดเมื่อรูปภาพ วิดีโอ และการเปลี่ยนแปลงของห้องนี้อัปโหลดเสร็จ สื่อของคุณยังบันทึกอยู่ในโทรศัพท์ระหว่างรอสัญญาณ';

  @override
  String get done => 'เสร็จ';

  @override
  String get reviewRoom => 'ตรวจทานห้อง';

  @override
  String get photoOnPhone => 'รูปภาพในโทรศัพท์เครื่องนี้';

  @override
  String get videoOnPhone => 'วิดีโอในโทรศัพท์เครื่องนี้';

  @override
  String get inTheReport => 'อยู่ในรายงานแล้ว';

  @override
  String get uploadedUpdating => 'อัปโหลดแล้ว · กำลังอัปเดตรายงาน';

  @override
  String get readyToMark => 'พร้อมทำเครื่องหมาย';

  @override
  String get marksNeedAttention => 'เครื่องหมายต้องได้รับการแก้ไข';

  @override
  String get uploadPaused => 'หยุดอัปโหลดชั่วคราว';

  @override
  String get preparingUpload => 'กำลังเตรียมอัปโหลดอย่างปลอดภัย';

  @override
  String get uploading => 'กำลังอัปโหลด';

  @override
  String get addingToRoom => 'กำลังเพิ่มในห้อง';

  @override
  String get addingToItem => 'กำลังเพิ่มในรายการ';

  @override
  String get uploadingNotes => 'กำลังอัปโหลดหมายเหตุและเครื่องหมาย';

  @override
  String get savedWaiting => 'บันทึกไว้อย่างปลอดภัย · รออัปโหลด';

  @override
  String get photoNote => 'หมายเหตุรูปภาพ';

  @override
  String get photoNoteDetail => 'อธิบายว่าผู้ดูควรสังเกตอะไรในรูปนี้';

  @override
  String get photoNoteHint => 'ตัวอย่าง: รอยบิ่นข้างซิงก์';

  @override
  String get disputeMoveIn => 'โต้แย้งสภาพตอนย้ายเข้า';

  @override
  String get disputeMoveInLabel => 'คุณไม่เห็นด้วยกับอะไร';

  @override
  String get disputeMoveInHelper => 'เหตุผลของคุณจะอยู่ในประกาศที่ระบุวันที่';

  @override
  String get recordDispute => 'บันทึกข้อโต้แย้ง';

  @override
  String handPhoneTo(String name) {
    return 'ส่งโทรศัพท์ให้ $name';
  }

  @override
  String acknowledgeInPersonBody(
    String name,
    String role,
    int number,
    String title,
  ) {
    return '$name ($role) ได้อ่านบันทึกเพิ่มเติมที่ $number: $title แล้ว การแตะด้านล่างจะบันทึกว่าบุคคลนี้รับทราบด้วยตนเอง พร้อมเวลาและเนื้อหาที่แสดงอยู่ ไม่ใช่ลายเซ็นใหม่บนรายงาน';
  }

  @override
  String get acknowledgeUpdate => 'ฉันรับทราบบันทึกเพิ่มเติมนี้';

  @override
  String get disputeDeductions => 'โต้แย้งการหักเงิน';

  @override
  String partyDisputesDeductions(String name) {
    return '$name โต้แย้งการหักเงิน';
  }

  @override
  String get disputeDeductionsLabel => 'โต้แย้งเรื่องใด และเพราะอะไร';

  @override
  String get disputeDeductionsHelper => 'เหตุผลจะบันทึกไว้ข้างใบสรุป';

  @override
  String agreeInPersonBody(String name, String role) {
    return '$name ($role) ได้อ่านใบสรุปเงินประกันแล้ว การแตะด้านล่างจะบันทึกว่าบุคคลนี้ยอมรับการหักเงินด้วยตนเอง พร้อมเวลาและใบสรุปที่แสดงอยู่';
  }

  @override
  String get agreeDeductions => 'ยอมรับการหักเงิน';

  @override
  String money(String amount) {
    return 'S\$$amount';
  }

  @override
  String get depositStatement => 'ใบสรุปเงินประกัน';

  @override
  String get deposit => 'เงินประกัน';

  @override
  String deductionsLine(int count, int total) {
    return 'หักเงิน ($count จาก $total ข้อค้นพบ ผู้เช่ารับผิดชอบ)';
  }

  @override
  String get toReturnToTenant => 'คืนให้ผู้เช่า';

  @override
  String get deductionsExceed => 'ยอดหักเกินเงินประกัน';

  @override
  String get answerAgreed => 'ยอมรับ';

  @override
  String get answerDisputed => 'โต้แย้ง';

  @override
  String get answerNotYet => 'ยังไม่ตอบ';

  @override
  String get inPersonSuffix => ' ด้วยตนเอง';

  @override
  String get depositRecordsOnly =>
      'Kivilo บันทึกคำตอบของแต่ละฝ่าย โดยไม่ได้ถือหรือโอนเงินประกัน';

  @override
  String get recording => 'กำลังบันทึก…';

  @override
  String get iAgreeDeductions => 'ฉันยอมรับการหักเงิน';

  @override
  String get dispute => 'โต้แย้ง';

  @override
  String inPersonParty(String role, String name) {
    return 'ด้วยตนเอง: $role $name';
  }

  @override
  String get agrees => 'ยอมรับ';

  @override
  String get disputes => 'โต้แย้ง';

  @override
  String get report => 'รายงาน';

  @override
  String get propertyReport => 'รายงานที่พัก';

  @override
  String get signAsLandlord => 'ลงนามในฐานะผู้ให้เช่า';

  @override
  String get signAsTenant => 'ลงนามในฐานะผู้เช่า';

  @override
  String signedByBoth(String date) {
    return 'ทั้งสองฝ่ายลงนามแล้ว · $date';
  }

  @override
  String dateRange(String start, String end) {
    return '$start ถึง $end';
  }

  @override
  String get inspected => 'วันที่ตรวจ';

  @override
  String get notRecorded => 'ไม่ได้บันทึก';

  @override
  String byName(String name) {
    return 'โดย $name';
  }

  @override
  String get agreedAndSigned => 'ตกลงและลงนามแล้ว';

  @override
  String get notCountersigned => 'ยังลงนามไม่ครบทั้งสองฝ่าย';

  @override
  String get updatesSinceSigning => 'บันทึกเพิ่มเติมหลังลงนาม';

  @override
  String get updatesSinceSigningDetail =>
      'บันทึกไว้ข้างรายงานที่ลงนามแล้ว โดยไม่เปลี่ยนรายงาน บันทึกเพิ่มเติมมีผลเมื่อได้รับการรับทราบ ประกาศสภาพตอนย้ายเข้ามีผลเมื่อผู้ให้เช่ายอมรับ';

  @override
  String get reportFooter =>
      'ห้องและรายการในรายงานนี้เขียนโดยผู้ตรวจจากวิดีโอเดินชมที่บันทึกไว้ และได้รับความเห็นชอบจากบุคคลที่ระบุข้างต้น หากรูปภาพมีเครื่องหมาย ผู้ตรวจเป็นผู้วาดเพื่อชี้รายละเอียด เครื่องหมายบันทึกแยกต่างหากและไม่มีการแก้ไขตัวรูปภาพ';

  @override
  String get nothingRecordedInRoom => 'ไม่มีการบันทึกอะไรในห้องนี้';

  @override
  String readingValue(String value) {
    return 'ค่าที่อ่านได้: $value';
  }

  @override
  String roomPhoto(String room) {
    return 'รูปภาพ$room';
  }

  @override
  String areasMarked(int count) {
    return 'ทำเครื่องหมาย $count จุด';
  }

  @override
  String signatureOf(String name) {
    return 'ลายเซ็นของ $name';
  }

  @override
  String signedOn(String date) {
    return 'ลงนามเมื่อ $date';
  }

  @override
  String updatedOn(String date, int number) {
    return 'อัปเดตเมื่อ $date · บันทึกเพิ่มเติมที่ $number';
  }

  @override
  String get pendingAcknowledgement => 'รอการรับทราบ';

  @override
  String moveInConditionLine(String reported, String deadline) {
    return 'สภาพตอนผู้เช่าย้ายเข้า · แจ้งเมื่อ $reported · กำหนด $deadline';
  }

  @override
  String disputedByOn(String name, String date) {
    return '$name โต้แย้งเมื่อ $date';
  }

  @override
  String get disputedNoticeKept =>
      'ประกาศนี้จะอยู่ในรายงาน แต่ไม่นับรวมในสภาพที่ตกลงกันสำหรับเช็กเอาต์';

  @override
  String publishedByOn(String name, String date) {
    return 'เผยแพร่โดย $name เมื่อ $date';
  }

  @override
  String conditionReported(String name) {
    return 'สภาพที่แจ้ง: $name';
  }

  @override
  String get itemFallback => 'รายการ';

  @override
  String wasValue(String value) {
    return 'เดิม: $value';
  }

  @override
  String fromRepairRecord(String title) {
    return 'จากบันทึกงานซ่อม: $title';
  }

  @override
  String get agreePresentAtMoveIn => 'ฉันยอมรับว่าสภาพนี้มีอยู่ตอนย้ายเข้า';

  @override
  String assessmentVersionLine(int version, String date) {
    return 'เวอร์ชัน $version เผยแพร่เมื่อ $date แยกจากรายการทรัพย์สินที่ลงนามแล้วด้านบน';
  }

  @override
  String liabilitySummary(int count, int total, String claim, String deposit) {
    return '$count จาก $total ข้อค้นพบประเมินว่าผู้เช่ารับผิดชอบ รวม S\$$claim เทียบกับเงินประกัน S\$$deposit';
  }

  @override
  String get findingPhotos => 'รูปข้อค้นพบ';

  @override
  String openFindingPhoto(String name) {
    return 'เปิดรูปข้อค้นพบ: $name';
  }

  @override
  String maintenanceRecord(String title) {
    return 'บันทึกงานซ่อม: $title';
  }

  @override
  String get findingPhoto => 'รูปข้อค้นพบ';

  @override
  String itemCount(int count) {
    return '$count รายการ';
  }

  @override
  String get findingAlreadySaved =>
      'ข้อค้นพบนี้บันทึกไว้แล้ว บันทึกเพื่อใช้การเปลี่ยนแปลงเพิ่มเติม';

  @override
  String findingDraftSaveFailed(String error) {
    return 'บันทึกฉบับร่างข้อค้นพบในโทรศัพท์เครื่องนี้ไม่ได้ $error';
  }

  @override
  String get chooseItemFirst => 'เลือกรายการก่อน';

  @override
  String get describeChange => 'อธิบายว่าอะไรเปลี่ยนไปและเพราะอะไร';

  @override
  String get costInvalid => 'ป้อนค่าใช้จ่าย ทศนิยมไม่เกิน 2 ตำแหน่ง';

  @override
  String get photoDraftNotReady => 'รอให้ฉบับร่างรูปภาพพร้อมก่อน';

  @override
  String get findingSavedOriginalItem =>
      'ข้อค้นพบนี้บันทึกไว้แล้วกับรายการเดิม เลือกรายการนั้นเพื่อบันทึกข้อความล่าสุด หรือทิ้งฉบับร่างนี้แล้วเพิ่มข้อค้นพบใหม่';

  @override
  String get findingSavedDraftKept =>
      'ข้อค้นพบนี้บันทึกไว้แล้ว ฉบับร่างล่าสุดของคุณยังเก็บไว้ เปิดข้อค้นพบที่บันทึกไว้อีกครั้งเพื่อแก้ไขต่อ';

  @override
  String get photoOpenRetry =>
      'เชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้งเพื่อเปิดรูปนี้ ไฟล์อัปโหลดยังเก็บอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String get photoViewRetry =>
      'เชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้งเพื่อดูรูปนี้';

  @override
  String get photoCaption => 'คำบรรยายรูป';

  @override
  String get caption => 'คำบรรยาย';

  @override
  String get saveCaption => 'บันทึกคำบรรยาย';

  @override
  String get discardDraftTitle => 'ทิ้งฉบับร่างข้อค้นพบนี้ใช่ไหม';

  @override
  String get discardDraftBody =>
      'ข้อความฉบับร่างและรูปที่เพิ่มใหม่จะถูกลบ รูปข้อค้นพบที่บันทึกแล้วจะยังอยู่กับข้อค้นพบนั้น';

  @override
  String get keepDraft => 'เก็บฉบับร่าง';

  @override
  String get discardDraft => 'ทิ้งฉบับร่าง';

  @override
  String get findingPhotosDetail =>
      'เพิ่มหลักฐานสำหรับข้อค้นพบนี้ รูปต้นฉบับจะถูกเก็บไว้ และเครื่องหมายบันทึกแยกไว้ข้างแต่ละรูป';

  @override
  String get takePhotoShort => 'ถ่ายรูป';

  @override
  String get addFromGallery => 'เพิ่มจากคลังรูปภาพ';

  @override
  String get photoUploadPending => 'รูปรออัปโหลด';

  @override
  String get removingPhoto => 'กำลังนำรูปออก…';

  @override
  String get savedFinishMarking =>
      'บันทึกในโทรศัพท์แล้ว · ทำเครื่องหมายให้เสร็จ';

  @override
  String get savedUploadFailed =>
      'บันทึกในโทรศัพท์แล้ว · อัปโหลดไม่สำเร็จ ลองอีกครั้งเมื่อเชื่อมต่อ';

  @override
  String uploadingPercent(int percent) {
    return 'กำลังอัปโหลด $percent%…';
  }

  @override
  String get savingPhoto => 'กำลังบันทึกรูป…';

  @override
  String get uploaded => 'อัปโหลดแล้ว';

  @override
  String get resumeMarking => 'ทำเครื่องหมายต่อ';

  @override
  String get removePhoto => 'นำรูปออก';

  @override
  String get chooseAnItem => 'เลือกรายการ';

  @override
  String get addFinding => 'เพิ่มข้อค้นพบ';

  @override
  String get reviewFinding => 'ตรวจทานข้อค้นพบ';

  @override
  String get items => 'รายการ';

  @override
  String get searchItems => 'ค้นหารายการ ห้อง หรือหมายเลขเครื่อง';

  @override
  String get clear => 'ล้าง';

  @override
  String get atCheckOut => 'ตอนเช็กเอาต์';

  @override
  String get chooseItemMissing => 'สำหรับรายการที่ไม่อยู่แล้วตอนเช็กเอาต์';

  @override
  String get chooseItemDetail => 'เลือกรายการโดยดูจากรูปและสภาพที่บันทึกไว้';

  @override
  String get allRooms => 'ทุกห้อง';

  @override
  String get noItemsRecorded => 'ไม่มีรายการที่บันทึกไว้ในรายการทรัพย์สินนี้';

  @override
  String get noMatchingItems =>
      'ไม่พบรายการที่ตรงกัน ลองห้อง ชื่อ หรือหมายเลขเครื่องอื่น';

  @override
  String get selectedItem => 'รายการที่เลือก';

  @override
  String get changeItem => 'เปลี่ยนรายการ';

  @override
  String get hideItemDetails => 'ซ่อนรายละเอียดรายการ';

  @override
  String get showItemDetails => 'แสดงรายละเอียดรายการ';

  @override
  String get change => 'การเปลี่ยนแปลง';

  @override
  String get verdict => 'ผลการตัดสิน';

  @override
  String get rationale => 'เหตุผล';

  @override
  String get maintenanceMedia => 'สื่องานซ่อม';

  @override
  String get noLinkedMaintenance => 'ไม่มีบันทึกงานซ่อมที่เชื่อมไว้';

  @override
  String get estimatedCost => 'ค่าใช้จ่ายโดยประมาณ (SGD)';

  @override
  String get removeFinding => 'นำข้อค้นพบออก';

  @override
  String get saveReviewedFinding => 'บันทึกข้อค้นพบที่ตรวจทานแล้ว';

  @override
  String openSourcePhoto(String source) {
    return 'เปิดรูป$source';
  }

  @override
  String openSourcePhotoNote(String source, String note) {
    return 'เปิดรูป$source: $note';
  }

  @override
  String sourcePhoto(String source) {
    return 'รูป$source';
  }

  @override
  String serialId(String value) {
    return 'หมายเลขเครื่อง / รหัส: $value';
  }

  @override
  String quantityValue(int count) {
    return 'จำนวน: $count';
  }

  @override
  String meterValue(String value) {
    return 'มิเตอร์: $value';
  }

  @override
  String checkInValue(String value) {
    return 'เช็กอิน: $value';
  }

  @override
  String checkOutValue(String value) {
    return 'เช็กเอาต์: $value';
  }

  @override
  String get alsoListedAtCheckOut => 'มีอยู่ในรายการตอนเช็กเอาต์ด้วย';

  @override
  String get noLinkedPhotos => 'ไม่มีรูปที่เชื่อมกับรายการนี้';

  @override
  String get photoFinishingUpload => 'รูปกำลังอัปโหลดใกล้เสร็จ…';

  @override
  String get categoryPlumbing => 'ประปา';

  @override
  String get categoryLocksmith => 'ช่างกุญแจ';

  @override
  String get categoryElectrical => 'ไฟฟ้า';

  @override
  String get categoryAirCon => 'เครื่องปรับอากาศ';

  @override
  String get categoryStructural => 'โครงสร้าง';

  @override
  String get categoryPest => 'แมลงและสัตว์รบกวน';

  @override
  String errorDraftSaved(String error) {
    return '$error ฉบับร่างของคุณบันทึกอยู่ในโทรศัพท์เครื่องนี้';
  }

  @override
  String errorDraftNotSaved(String error) {
    return '$error โทรศัพท์เครื่องนี้บันทึกฉบับร่างของคุณไม่ได้ เปิดหน้าจอนี้ค้างไว้แล้วลองอีกครั้ง';
  }

  @override
  String get propertyItemOptional => 'อุปกรณ์ที่เกี่ยวข้อง (ไม่บังคับ)';

  @override
  String get noSpecificItem => 'ไม่ระบุรายการ';

  @override
  String get priorityRoutine => 'ทั่วไป';

  @override
  String get priorityUrgent => 'เร่งด่วน';

  @override
  String get priorityDanger => 'อันตราย';

  @override
  String get immediateDanger => 'หากมีคนตกอยู่ในอันตรายเร่งด่วน';

  @override
  String get immediateDangerDetail =>
      'โทรหาตำรวจ 999 หรือ SCDF ดับเพลิง/รถพยาบาล 995 ก่อนแจ้งที่นี่';

  @override
  String get presentAtMoveIn => 'เป็นแบบนี้ตั้งแต่ฉันย้ายเข้า';

  @override
  String get presentAtMoveInDetail =>
      'หลังแจ้งแล้ว ให้เพิ่มรูปและบันทึกสภาพตอนย้ายเข้า ผู้ให้เช่ายอมรับหรือโต้แย้งได้';

  @override
  String get shortTitle => 'หัวข้อสั้นๆ';

  @override
  String get whatHappened => 'เกิดอะไรขึ้น';

  @override
  String get whatHappenedHelper =>
      'ระบุว่าเริ่มเมื่อไร และคุณลองทำอะไรไปแล้วบ้าง';

  @override
  String get submitReport => 'ส่งรายงาน';

  @override
  String get recordMoveIn => 'บันทึกสภาพตอนย้ายเข้า';

  @override
  String get recordMoveInBody =>
      'บันทึกสิ่งที่มีอยู่แล้วตอนคุณย้ายเข้า ระบบจะบันทึกประกาศที่ระบุวันที่ พร้อมคำอธิบายปัญหาและรูปที่เลือก ประกาศจะนับรวมในสภาพที่ตกลงกันเมื่อผู้ให้เช่ายอมรับ';

  @override
  String get itemInCheckIn => 'รายการในเช็กอิน';

  @override
  String get notInCheckIn => 'ไม่มีในรายการเช็กอิน';

  @override
  String get itemName => 'ชื่อรายการ';

  @override
  String get itemCategory => 'หมวดหมู่รายการ';

  @override
  String get conditionAtMoveIn => 'สภาพตอนคุณย้ายเข้า';

  @override
  String get chooseCondition => 'เลือกสภาพ';

  @override
  String get photosToInclude => 'รูปที่จะแนบ';

  @override
  String beforePhoto(int number) {
    return 'รูปก่อนซ่อมที่ $number';
  }

  @override
  String uploadedOn(String date) {
    return 'อัปโหลดเมื่อ $date';
  }

  @override
  String get recordCondition => 'บันทึกสภาพ';

  @override
  String get recordCompletedRepair => 'บันทึกงานซ่อมที่เสร็จแล้ว';

  @override
  String get whatWasRepaired => 'ซ่อมอะไรไป';

  @override
  String get costOptional => 'ค่าใช้จ่าย (ไม่บังคับ)';

  @override
  String get costHelper => 'ใช้แบ่งค่าใช้จ่ายตามที่ตกลงกัน';

  @override
  String get costInvalidExample => 'ป้อนจำนวนเงิน เช่น 150 หรือ 150.50';

  @override
  String get addComment => 'เพิ่มความคิดเห็น';

  @override
  String get closeWithoutAction => 'ปิดโดยไม่ดำเนินการ';

  @override
  String get closeReasonHint => 'ต้องระบุเหตุผล ทั้งสองฝ่ายจะเห็น';

  @override
  String get whatIsStillWrong => 'ยังมีปัญหาอะไรอยู่';

  @override
  String get signInBeforeRecording => 'ลงชื่อเข้าใช้อีกครั้งก่อนบันทึกสภาพ';

  @override
  String get photosNotUploadedMoveIn =>
      'รูปบางรูปยังอัปโหลดไม่เสร็จ เก็บไว้ในโทรศัพท์เครื่องนี้แล้วลองอัปโหลดอีกครั้งก่อนบันทึกสภาพตอนย้ายเข้า';

  @override
  String get disputeMoveInHint =>
      'อธิบายสิ่งที่คุณไม่เห็นด้วย เหตุผลของคุณจะอยู่ในประกาศที่ระบุวันที่';

  @override
  String reportedOn(String date) {
    return 'แจ้งเมื่อ $date';
  }

  @override
  String reportedOnDeadline(String date, String deadline) {
    return 'แจ้งเมื่อ $date · กำหนดแจ้งความชำรุด $deadline';
  }

  @override
  String get moveInDetail =>
      'เพิ่มรูป แล้วบันทึกสภาพตอนย้ายเข้าเป็นประกาศที่ระบุวันที่ไว้ข้างเช็กอินที่ลงนามแล้ว ผู้ให้เช่ายอมรับหรือโต้แย้งได้ รายงานที่ลงนามแล้วจะไม่เปลี่ยน';

  @override
  String get addBeforePhotos => 'เพิ่มรูปก่อนซ่อม';

  @override
  String get addBeforePhotoFirst =>
      'เพิ่มรูปก่อนซ่อมที่อัปโหลดแล้วอย่างน้อยหนึ่งรูปเพื่อดำเนินการต่อ';

  @override
  String get moveInAccepted =>
      'ผู้ให้เช่ายอมรับแล้ว นับรวมในสภาพที่ตกลงกันสำหรับเช็กเอาต์';

  @override
  String get moveInDisputed =>
      'ผู้ให้เช่าโต้แย้ง เก็บไว้เป็นประกาศที่ระบุวันที่และไม่นับรวมในสภาพที่ตกลงกัน';

  @override
  String get moveInWaiting => 'รอผู้ให้เช่ายอมรับหรือโต้แย้งสภาพนี้';

  @override
  String get viewConditionNotice => 'ดูประกาศสภาพที่ระบุวันที่';

  @override
  String get dangerCallFirst =>
      'หากมีคนตกอยู่ในอันตราย ให้โทรหาตำรวจ 999 หรือ SCDF ดับเพลิงและรถพยาบาล 995 ก่อน';

  @override
  String get whatHappenedHeading => 'เกิดอะไรขึ้น';

  @override
  String reportedByOn(String name, String date) {
    return 'แจ้งโดย $name เมื่อ $date';
  }

  @override
  String get photosBeforeAfter => 'ก่อนและหลังซ่อม';

  @override
  String get noPhotosYetRepair =>
      'ยังไม่มีรูป ถ่ายรูปปัญหาไว้ตอนนี้ จะช่วยลดข้อโต้แย้งภายหลัง';

  @override
  String get history => 'ประวัติ';

  @override
  String get historyDetail => 'ทุกอย่างเกี่ยวกับคำขอนี้';

  @override
  String get comment => 'ความคิดเห็น';

  @override
  String get waitingAcknowledge => 'รอผู้ให้เช่าหรือนายหน้ารับเรื่อง';

  @override
  String get recordRepairWhenDone => 'บันทึกงานซ่อมเมื่อเสร็จแล้ว';

  @override
  String get waitingTenantRepair => 'รอผู้เช่าซ่อม';

  @override
  String get waitingLandlordRepair => 'รอผู้ให้เช่าซ่อม';

  @override
  String get checkRepair => 'ตรวจงานซ่อมแล้วยืนยัน';

  @override
  String get waitingConfirm => 'รออีกฝ่ายยืนยันงานซ่อม';

  @override
  String get confirmedFixed => 'ยืนยันว่าซ่อมแล้ว';

  @override
  String get closedWithoutRepair => 'ปิดโดยไม่ได้ซ่อม';

  @override
  String get repair => 'การซ่อม';

  @override
  String get acknowledgeReport => 'รับเรื่อง';

  @override
  String get didRepairWork => 'ซ่อมแล้วใช้ได้ไหม';

  @override
  String get fixed => 'ซ่อมได้แล้ว';

  @override
  String get notFixed => 'ยังไม่หาย';

  @override
  String get addAfterPhoto => 'เพิ่มรูปหลังซ่อม';

  @override
  String get addToReportAsUpdate => 'เพิ่มในรายงานเป็นบันทึกเพิ่มเติม';

  @override
  String repairedOn(String date) {
    return 'ซ่อมเมื่อ $date';
  }

  @override
  String repairedOnCost(String date, String cost) {
    return 'ซ่อมเมื่อ $date · S\$$cost';
  }

  @override
  String get beforeRepair => 'ก่อนซ่อม';

  @override
  String get afterRepair => 'หลังซ่อม';

  @override
  String get receipt => 'ใบเสร็จ';

  @override
  String get couldNotLoadPull => 'โหลดไม่ได้ ดึงลงเพื่อรีเฟรชลิงก์';

  @override
  String get statusChanged => 'เปลี่ยนสถานะแล้ว';

  @override
  String get repairRecorded => 'บันทึกงานซ่อมแล้ว';

  @override
  String get repairScheduled => 'นัดซ่อมแล้ว';

  @override
  String get reportedNotFixed => 'แจ้งว่ายังไม่หาย';

  @override
  String costProposal(String summary) {
    return 'ข้อเสนอค่าใช้จ่าย: $summary';
  }

  @override
  String get costProposalRejected => 'ข้อเสนอค่าใช้จ่ายถูกปฏิเสธ';

  @override
  String get costProposalWithdrawn => 'ถอนข้อเสนอค่าใช้จ่ายแล้ว';

  @override
  String get waitingForLandlord => 'รอผู้ให้เช่า';

  @override
  String get waitingForTenant => 'รอผู้เช่า';

  @override
  String get acceptSplitTitle => 'ยอมรับการแบ่งนี้ใช่ไหม';

  @override
  String get youAreAgreeingTo => 'สิ่งที่คุณยอมรับ';

  @override
  String get acceptSplitBody =>
      'นี่จะเป็นข้อตกลงสำหรับงานซ่อมนี้ การเปลี่ยนภายหลังต้องเสนอใหม่และทั้งสองฝ่ายยอมรับ';

  @override
  String get accept => 'ยอมรับ';

  @override
  String get notAgreedYet => 'ยังไม่ได้ตกลง';

  @override
  String get agreedByBoth => 'ทั้งสองฝ่ายตกลงแล้ว';

  @override
  String get agreedChangeProposed => 'ตกลงแล้ว มีข้อเสนอให้เปลี่ยน';

  @override
  String get whoPays => 'ใครจ่าย';

  @override
  String get agreed => 'ตกลงแล้ว';

  @override
  String proposedBy(String name) {
    return 'เสนอโดย $name';
  }

  @override
  String proposedAcceptedBy(String name, String other) {
    return 'เสนอโดย $name ยอมรับโดย $other';
  }

  @override
  String get answerNeeded => 'ต้องการคำตอบจากคุณ';

  @override
  String get waitingForAnswer => 'รอคำตอบ';

  @override
  String partyProposes(String party) {
    return '$partyเสนอ';
  }

  @override
  String partyProposesChange(String party) {
    return '$partyเสนอให้เปลี่ยน';
  }

  @override
  String get suggestDifferent => 'เสนอแบบอื่น';

  @override
  String get reject => 'ปฏิเสธ';

  @override
  String get withdrawProposal => 'ถอนข้อเสนอ';

  @override
  String get notAgreed => 'ไม่ได้ตกลง';

  @override
  String get changeNotAgreed => 'ข้อเสนอให้เปลี่ยนไม่ได้รับการยอมรับ';

  @override
  String rejectedWhatProposed(String name, String proposer) {
    return '$name ปฏิเสธข้อเสนอของ $proposer';
  }

  @override
  String get theOtherSide => 'อีกฝ่าย';

  @override
  String get agreeWhoPaysNow =>
      'ตกลงกันตอนนี้ว่าใครจัดการซ่อมและใครจ่าย จะได้ไม่เป็นข้อโต้แย้งตอนเช็กเอาต์';

  @override
  String get proposeChange => 'เสนอให้เปลี่ยน';

  @override
  String get makeNewProposal => 'เสนอใหม่';

  @override
  String get proposeWhoPays => 'เสนอว่าใครจ่าย';

  @override
  String get repairCost => 'ค่าซ่อม';

  @override
  String get suggestDifferentSplit => 'เสนอการแบ่งแบบอื่น';

  @override
  String get whoPaysQuestion => 'ใครจ่าย';

  @override
  String get split => 'แบ่งจ่าย';

  @override
  String get fromMinorRepairCap => 'จากวงเงินซ่อมเล็กน้อยของสัญญาเช่านี้';

  @override
  String get landlordPaysAbove => 'ส่วนที่เกินผู้ให้เช่าจ่าย';

  @override
  String get whoArranges => 'ใครเป็นผู้จัดการซ่อม';

  @override
  String get why => 'เพราะอะไร';

  @override
  String get basis => 'หลักเกณฑ์';

  @override
  String get whyThisSplit => 'ทำไมจึงแบ่งแบบนี้';

  @override
  String get explainSentence => 'อธิบายสั้นๆ หนึ่งประโยค';

  @override
  String get otherSideSees => 'อีกฝ่ายจะเห็นข้อความนี้พร้อมข้อเสนอของคุณ';

  @override
  String get clauseOptional => 'ข้อสัญญา (ไม่บังคับ)';

  @override
  String get clauseHint => 'เช่น ข้อ 5(c)';

  @override
  String get theyReadCounter => 'อีกฝ่ายจะเห็นข้อเสนอโต้กลับของคุณว่า';

  @override
  String get theyRead => 'อีกฝ่ายจะเห็นว่า';

  @override
  String get sendProposal => 'ส่งข้อเสนอ';

  @override
  String get rejectProposalTitle => 'ปฏิเสธข้อเสนอนี้';

  @override
  String get youAreRejecting => 'สิ่งที่คุณปฏิเสธ';

  @override
  String get whyNot => 'ทำไมไม่เห็นด้วย';

  @override
  String get whyNotHint => 'จำเป็น อีกฝ่ายจะเห็นข้อความนี้';

  @override
  String photoOpenFailed(String error) {
    return 'เปิดรูปนี้ไม่ได้ $error';
  }

  @override
  String marksSaveFailed(String error) {
    return 'บันทึกเครื่องหมายไม่ได้ $error';
  }

  @override
  String redrawMark(int number) {
    return 'วาดเครื่องหมายที่ $number ใหม่';
  }

  @override
  String get markCircleHelp =>
      'ใช้นิ้ววาดรอบจุดที่มีปัญหา Kivilo จะปรับให้เป็นวงกลมเรียบร้อย';

  @override
  String get markArrowHelp =>
      'วาดจากพื้นที่ว่างไปยังจุดที่มีปัญหา แตะเครื่องหมายที่มีอยู่เพื่อแก้ไข';

  @override
  String get markFreehandHelp =>
      'วาดทับรายละเอียดโดยตรง เส้นที่คุณวาดจะอยู่ตรงตำแหน่งที่วาด';

  @override
  String get markCircle => 'วงกลม';

  @override
  String get markArrow => 'ลูกศร';

  @override
  String get markFreehand => 'วาดอิสระ';

  @override
  String get undo => 'เลิกทำ';

  @override
  String get redo => 'ทำซ้ำ';

  @override
  String markNumber(int number) {
    return 'เครื่องหมายที่ $number';
  }

  @override
  String marksOfMax(int count) {
    return '$count จาก 12 เครื่องหมาย';
  }

  @override
  String addNoteToMark(int number) {
    return 'เพิ่มหมายเหตุให้เครื่องหมายที่ $number';
  }

  @override
  String editMark(int number) {
    return 'แก้ไขเครื่องหมายที่ $number';
  }

  @override
  String get markNoteNew => 'บอกว่าเครื่องหมายนี้ชี้อะไร';

  @override
  String get markNoteEdit => 'อัปเดตหมายเหตุ วาดตำแหน่งใหม่ หรือนำออก';

  @override
  String get markNoteHint => 'ตัวอย่าง: รอยร้าวเล็กๆ เหนือปลั๊กไฟ';

  @override
  String get saveMark => 'บันทึกเครื่องหมาย';

  @override
  String get redraw => 'วาดใหม่';

  @override
  String get photoSavedWillUpload =>
      'บันทึกรูปในโทรศัพท์เครื่องนี้แล้ว Kivilo จะอัปโหลดเมื่อทำได้';

  @override
  String get updateNeedsTitle => 'ตั้งหัวข้อให้บันทึกเพิ่มเติมก่อนเผยแพร่';

  @override
  String get updateNeedsChange =>
      'เพิ่มการเปลี่ยนแปลงอย่างน้อยหนึ่งรายการก่อนเผยแพร่';

  @override
  String get updatePhotosWaiting =>
      'รูปบางรูปยังอยู่ในโทรศัพท์เครื่องนี้ รอให้อัปโหลดเสร็จก่อนเผยแพร่';

  @override
  String get publishUpdateTitle => 'เผยแพร่บันทึกเพิ่มเติมนี้ใช่ไหม';

  @override
  String get publishUpdateBody =>
      'แก้ไขภายหลังไม่ได้ และผู้ให้เช่ากับผู้เช่าจะถูกขอให้รับทราบ';

  @override
  String get discardUpdateTitle => 'ทิ้งฉบับร่างนี้ใช่ไหม';

  @override
  String get discardUpdateBody =>
      'การเปลี่ยนแปลงและรูปที่อัปโหลดไว้จะถูกลบ บันทึกเพิ่มเติมที่เผยแพร่แล้วไม่ได้รับผลกระทบ';

  @override
  String get discard => 'ทิ้ง';

  @override
  String get updatesIntro =>
      'บันทึกการเปลี่ยนแปลงหลังลงนาม เช่น เปลี่ยนเครื่องใช้ไฟฟ้า เป็นบันทึกเพิ่มเติมที่ระบุวันที่ รายงานที่ลงนามแล้วยังเหมือนเดิม บันทึกเพิ่มเติมจะมีผลเมื่อทั้งผู้ให้เช่าและผู้เช่ารับทราบ';

  @override
  String get published => 'เผยแพร่แล้ว';

  @override
  String get publishedDetail =>
      'เปิดรายงานเพื่อแสดง หรือเพื่อรับการรับทราบด้วยตนเอง';

  @override
  String updateNumberTitle(int number, String title) {
    return 'บันทึกเพิ่มเติมที่ $number: $title';
  }

  @override
  String get startUpdate => 'เริ่มบันทึกเพิ่มเติม';

  @override
  String get resolvedRepairs => 'งานซ่อมที่แก้ไขแล้ว';

  @override
  String get resolvedRepairsDetail =>
      'แต่ละงานเริ่มการเปลี่ยนแปลงได้ พร้อมรูปก่อนและหลังซ่อม';

  @override
  String get draftUpdate => 'ฉบับร่างบันทึกเพิ่มเติม';

  @override
  String get draftUpdateDetail => 'คนอื่นจะไม่เห็นจนกว่าคุณจะเผยแพร่';

  @override
  String get title => 'หัวข้อ';

  @override
  String get reason => 'เหตุผล';

  @override
  String dateOfChange(String date) {
    return 'วันที่เปลี่ยนแปลง: $date';
  }

  @override
  String get saveDetails => 'บันทึกรายละเอียด';

  @override
  String get addChange => 'เพิ่มการเปลี่ยนแปลง';

  @override
  String get workingEllipsis => 'กำลังดำเนินการ…';

  @override
  String get publishUpdate => 'เผยแพร่บันทึกเพิ่มเติม';

  @override
  String get publishFreezes =>
      'การเผยแพร่จะล็อกบันทึกเพิ่มเติมและขอให้ผู้ให้เช่ากับผู้เช่ารับทราบ';

  @override
  String fromRepair(String title) {
    return 'จากงานซ่อม: $title';
  }

  @override
  String photosWaitingUpload(int count) {
    return 'รูป $count รูปบันทึกในโทรศัพท์เครื่องนี้ รออัปโหลด';
  }

  @override
  String get choosePhoto => 'เลือกรูป';

  @override
  String get chooseRoom => 'เลือกห้อง';

  @override
  String get chooseItemReplaced => 'เลือกรายการที่จะเปลี่ยนหรือนำออก';

  @override
  String get nameNewItem => 'ตั้งชื่อรายการใหม่';

  @override
  String get editChange => 'แก้ไขการเปลี่ยนแปลง';

  @override
  String get changeAdded => 'เพิ่ม';

  @override
  String get changeReplaced => 'เปลี่ยน';

  @override
  String get changeRemoved => 'นำออก';

  @override
  String get itemItChanges => 'รายการที่เปลี่ยน';

  @override
  String get whichItem => 'รายการไหน';

  @override
  String get newItem => 'รายการใหม่';

  @override
  String get newItemHint => 'เช่น เครื่องล้างจาน';

  @override
  String get makeModelAndSerial => 'ยี่ห้อ รุ่น และหมายเลขเครื่อง';

  @override
  String get addChangeShort => 'เพิ่มการเปลี่ยนแปลง';

  @override
  String get saveChange => 'บันทึกการเปลี่ยนแปลง';

  @override
  String photoPrepareFailed(String error) {
    return 'เตรียมรูปไม่ได้ $error';
  }

  @override
  String photoAddFailed(String error) {
    return 'เพิ่มรูปไม่ได้ $error';
  }

  @override
  String get photoSavedUploaded => 'บันทึกและอัปโหลดรูปแล้ว';

  @override
  String get photoSavedRetry =>
      'บันทึกรูปในโทรศัพท์เครื่องนี้แล้ว Kivilo จะลองอีกครั้งโดยอัตโนมัติ';

  @override
  String get beforePhotos => 'รูปก่อนซ่อม';

  @override
  String get afterPhotos => 'รูปหลังซ่อม';

  @override
  String get addPhotosCamera => 'เพิ่มรูปด้วยกล้องโทรศัพท์';

  @override
  String get addPhotosCameraDetail =>
      'ใช้กล้องของโทรศัพท์ หรือเลือกรูปที่ถ่ายไว้แล้ว';

  @override
  String get chooseExistingPhoto => 'เลือกรูปที่มีอยู่';

  @override
  String get drawSignatureFirst => 'เซ็นชื่อก่อน';

  @override
  String get uploadBeforeSigning =>
      'รูปภาพ วิดีโอ หรือการเปลี่ยนแปลงบางรายการยังอัปโหลดไม่เสร็จ กลับไปที่ห้องแล้วแตะ ลองอัปโหลดอีกครั้ง ก่อนให้ใครลงนาม';

  @override
  String roleSignature(String role) {
    return 'ลายเซ็น$role';
  }

  @override
  String get ownSignatureConfirms =>
      'ลายเซ็นของคุณยืนยันว่ารายงานที่คุณเพิ่งอ่านบันทึกสภาพที่พักตามที่ส่งมอบ';

  @override
  String get partySignatureConfirms =>
      'ตรวจทานรายการทรัพย์สินที่ตกลงกันกับบุคคลนี้ก่อนลงนาม ลายเซ็นของบุคคลนี้ยืนยันรายงานตามที่แสดง';

  @override
  String get useThisSignature => 'ใช้ลายเซ็นนี้';

  @override
  String get drawNewOne => 'เซ็นใหม่';

  @override
  String get clearSignature => 'ล้างลายเซ็น';

  @override
  String get saveForNextTime => 'บันทึกไว้ใช้ครั้งหน้า';

  @override
  String get saveForNextTimeDetail =>
      'เก็บไว้ในโทรศัพท์เครื่องนี้เท่านั้น และลบเมื่อคุณออกจากระบบ';

  @override
  String get confirmSignature => 'ยืนยันลายเซ็น';

  @override
  String get propertyHistory => 'ประวัติที่พัก';

  @override
  String get timelineEyebrow => 'ไทม์ไลน์ที่พัก';

  @override
  String get timelineDetail =>
      'รายงานที่ลงนามแล้ว งานซ่อม และค่าใช้จ่ายที่ตกลงกัน เรียงจากล่าสุด';

  @override
  String get timelineEmpty =>
      'ยังไม่มีอะไรสรุปที่นี่ รายงานที่ลงนามแล้วและงานซ่อมจะแสดงเมื่อเกิดขึ้น';

  @override
  String get amountInvalid => 'ป้อนจำนวนเงิน SGD ที่ถูกต้อง';

  @override
  String get renewTenancy => 'ต่อสัญญาเช่า';

  @override
  String sameParties(String tenant) {
    return 'ผู้ให้เช่าและผู้เช่าเดิม · $tenant';
  }

  @override
  String startsOn(String date) {
    return 'เริ่ม $date';
  }

  @override
  String endsOn(String date) {
    return 'สิ้นสุด $date';
  }

  @override
  String get renewalConfirm =>
      'ยืนยันเงื่อนไขเหล่านี้กับทั้งสองฝ่ายก่อน ระบบจะสร้างสัญญาเช่าใหม่และฉบับร่างเช็กอินสำหรับที่พักเดิม';

  @override
  String keepSharingRenewal(String names) {
    return 'แชร์การต่อสัญญานี้กับ $names ต่อไป';
  }

  @override
  String get renewalPrivate =>
      'ไม่ต้องเลือกหากต้องการให้สัญญาเช่าใหม่เป็นส่วนตัว';

  @override
  String get createRenewal => 'สร้างเช็กอินสำหรับการต่อสัญญา';

  @override
  String get brandingIntro =>
      'แสดงที่หัวของ PDF และรายงานที่แชร์ทุกฉบับที่คุณจัดทำ ผู้ให้เช่าและผู้เช่าจะเห็น เนื้อหาที่ลงนามแล้วของรายงานจะไม่เปลี่ยน';

  @override
  String get logo => 'โลโก้';

  @override
  String get logoDetail => 'PNG หรือ JPEG แสดงที่มุมซ้ายบน';

  @override
  String get choose => 'เลือก';

  @override
  String get replace => 'แทนที่';

  @override
  String get removeLogo => 'นำโลโก้ออก';

  @override
  String get yourName => 'ชื่อของคุณ';

  @override
  String get agencyName => 'ชื่อบริษัทนายหน้า';

  @override
  String get agencyLicenceOptional => 'ใบอนุญาตบริษัทนายหน้า (ไม่บังคับ)';

  @override
  String get ceaOptional => 'เลขทะเบียน CEA ของคุณ (ไม่บังคับ)';

  @override
  String get phoneOptional => 'โทรศัพท์ (ไม่บังคับ)';

  @override
  String get partnerPipewell => 'น้ำรั่ว ท่อตัน เครื่องทำน้ำอุ่น';

  @override
  String get open24Hours => 'เปิด 24 ชั่วโมง';

  @override
  String get partnerFernvale => 'ท่อแตก ชักโครก ก๊อกน้ำและวาล์วผสม';

  @override
  String get daily8to10 => 'ทุกวัน 8:00 ถึง 22:00';

  @override
  String get partnerHalcyon => 'เข้าห้องไม่ได้ เปลี่ยนกุญแจ กุญแจดิจิทัล';

  @override
  String get partnerKeyline => 'กุญแจประตูรั้ว ปั๊มกุญแจ ตู้เซฟ';

  @override
  String get monSat9to7 => 'จันทร์ถึงเสาร์ 9:00 ถึง 19:00';

  @override
  String get policeEmergency => 'ตำรวจฉุกเฉิน';

  @override
  String get fireAmbulance => 'ดับเพลิงหรือรถพยาบาล';

  @override
  String get kiviloPartners => 'พาร์ตเนอร์ของ Kivilo';

  @override
  String get kiviloPartnersDetail => 'ช่างประปาและช่างกุญแจที่เราทำงานด้วย';

  @override
  String get bookingSoon => 'จองผ่าน Kivilo ได้เร็วๆ นี้';

  @override
  String get guideTitle => 'การส่งมอบใน 3 ขั้นตอน';

  @override
  String get guideDetail => 'แตะขั้นตอนเพื่อดูคำแนะนำสั้นๆ';

  @override
  String get guideStep1 => 'เขียนสิ่งที่เห็น';

  @override
  String get guideStep1Short => 'เริ่มจากรายการทรัพย์สินในห้อง';

  @override
  String get guideStep1Body =>
      'เปิดห้องแล้วตรวจรายการเริ่มต้น เพิ่ม แก้ไข หรือนำบรรทัดออกให้ตรงกับที่เห็น และบันทึกสภาพของแต่ละรายการ ตอนเช็กเอาต์ ให้เทียบกับเช็กอินที่ตกลงกันซึ่งแสดงข้างรายการ';

  @override
  String get guideStep2 => 'ถ่ายรายละเอียด';

  @override
  String get guideStep2Short => 'เปิดรายการ ถ่ายรูปสภาพ';

  @override
  String get guideStep2Body =>
      'เปิดรายการทรัพย์สินเพื่อถ่ายรูปรอยสึกหรอ ความเสียหาย ค่ามิเตอร์ และป้ายหมายเลขเครื่อง แต่ละรูปจะเปิดให้ทำเครื่องหมายและแนบกับรายการนั้นเมื่อบันทึก ใช้ สื่อและวิดีโอเดินชมห้อง สำหรับรูปหรือวิดีโอทั้งห้อง สิ่งที่ถ่ายจะอยู่ในโทรศัพท์จนกว่าจะอัปโหลด ตรวจทุกรายการแล้วตรวจทานห้อง ถ้าห้องไม่มีรายการ ให้ยืนยันว่าไม่มีอะไรต้องบันทึก';

  @override
  String get guideStep3 => 'ตกลงและลงนาม';

  @override
  String get guideStep3Short => 'บันทึกร่วมของทั้งสองฝ่าย';

  @override
  String get guideStep3Body =>
      'รอให้ทุกอย่างอัปโหลดเสร็จ แล้วส่งให้ลงนาม การส่งจะล็อกรายการทรัพย์สิน ผู้ให้เช่าและผู้เช่าลงนามบนโทรศัพท์ของคุณหรือผ่านลิงก์ในอีเมลได้ เมื่อทั้งสองฝ่ายลงนาม PDF จะพร้อมใช้';

  @override
  String get handoverTitle => 'สัญญาเช่าของคุณใน Kivilo';

  @override
  String handoverLoadFailed(String error) {
    return 'โหลดข้อมูลการส่งมอบไม่ได้ $error';
  }

  @override
  String get retry => 'ลองอีกครั้ง';

  @override
  String get handoverAfterSigning =>
      'การส่งมอบให้ผู้เช่าจะใช้ได้หลังผู้เช่าลงนามเช็กอิน';

  @override
  String get handoverScan =>
      'สแกนด้วยโทรศัพท์และลงชื่อเข้าใช้ด้วยบัญชีของคุณเอง เพื่อดูสัญญาเช่าและแจ้งปัญหา';

  @override
  String get handoverQrLabel => 'คิวอาร์โค้ดลิงก์ลงชื่อเข้าใช้ของผู้เช่า';

  @override
  String get handoverNoDefectPeriod =>
      'สัญญาเช่านี้ไม่ได้เปิดระยะเวลาแจ้งความชำรุดเมื่อย้ายเข้า คุณยังแจ้งซ่อมได้';

  @override
  String handoverDefectDeadline(String date) {
    return 'แจ้งสิ่งที่มีอยู่แล้วตอนคุณย้ายเข้าภายใน $date (เวลาสิงคโปร์)';
  }

  @override
  String get handoverLinkCopied => 'คัดลอกลิงก์ลงชื่อเข้าใช้ของผู้เช่าแล้ว';

  @override
  String get handoverCopyLink => 'คัดลอกลิงก์ลงชื่อเข้าใช้';

  @override
  String get updateTag => 'บันทึกเพิ่มเติม';

  @override
  String openCheckInPhoto(int number) {
    return 'เปิดรูปเช็กอินที่ $number';
  }

  @override
  String get nothingAtCheckIn => 'ไม่มีการบันทึกอะไรในห้องนี้ตอนเช็กอิน';

  @override
  String get openFullCheckIn => 'เปิดเช็กอินฉบับเต็ม';

  @override
  String get renewalRemindersFailed =>
      'โหลดการเตือนต่อสัญญาไม่ได้ ดึงลงเพื่อลองอีกครั้ง';

  @override
  String get renewalDue => 'ถึงเวลาต่อสัญญา';

  @override
  String get dismissRenewal => 'ปิดการเตือนต่อสัญญา';

  @override
  String tenancyEnds(String tenant, String date) {
    return '$tenant · สัญญาเช่าสิ้นสุด $date';
  }

  @override
  String get startRenewal => 'เริ่มต่อสัญญา';

  @override
  String get notRenewing => 'ไม่ต่อสัญญา';

  @override
  String get remindWeek => 'เตือนอีกครั้งในหนึ่งสัปดาห์';

  @override
  String get videoLoadFailed =>
      'โหลดวิดีโอนี้ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';

  @override
  String get pause => 'หยุดชั่วคราว';

  @override
  String get play => 'เล่น';

  @override
  String get noNotifications => 'ยังไม่มีการแจ้งเตือน';

  @override
  String get accountChangedPage => 'บัญชีเปลี่ยนไป เปิดหน้านี้อีกครั้ง';

  @override
  String get noResponse =>
      'Kivilo ไม่ตอบสนอง ตรวจสอบสัญญาณแล้วลองอีกครั้ง ทุกอย่างที่คุณถ่ายไว้บันทึกอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String get uploadingMedia => 'กำลังอัปโหลดสื่อของ Kivilo';

  @override
  String get kiviloMedia => 'สื่อของ Kivilo';

  @override
  String get signInBeforeFindingPhotos =>
      'ลงชื่อเข้าใช้อีกครั้งก่อนเพิ่มรูปข้อค้นพบ';

  @override
  String get photoDraftDiscarded =>
      'ฉบับร่างรูปนี้ถูกทิ้งแล้ว ทิ้งฉบับร่างในเครื่องเพื่อเริ่มใหม่';

  @override
  String get findingSavedReopen =>
      'บันทึกข้อค้นพบนี้แล้ว เปิดอีกครั้งเพื่อเพิ่มรูป';

  @override
  String get finishRecoveringCamera =>
      'กู้คืนการเลือกจากกล้องครั้งก่อนให้เสร็จก่อนถ่ายรูปใหม่';

  @override
  String get chooseImageFormat =>
      'เลือกรูป JPEG, PNG หรือ WebP สิ่งที่คุณเลือกยังเก็บไว้ ลองอีกครั้งหรือทิ้งฉบับร่างนี้';

  @override
  String get waitPhotosSaved => 'รอให้รูปบันทึกในโทรศัพท์เครื่องนี้ก่อน';

  @override
  String get finishFindingPhotos =>
      'ทำเครื่องหมายและอัปโหลดรูปข้อค้นพบให้เสร็จก่อนบันทึก ฉบับร่างของคุณยังอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String get connectRetryDiscard =>
      'เชื่อมต่ออินเทอร์เน็ตแล้วลองทิ้งอีกครั้ง รูปและฉบับร่างของคุณยังอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String get fileMissing =>
      'ไม่พบไฟล์ของรูปภาพหรือวิดีโอนี้ในโทรศัพท์เครื่องนี้';

  @override
  String get inventoryLinkFailed =>
      'อัปโหลดรูปแล้ว แต่บันทึกการเชื่อมกับรายการทรัพย์สินไม่ได้ รูปและรายการยังอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String get photoFormatUnsupported =>
      'รูปนี้อยู่ในรูปแบบที่ Kivilo จัดเก็บไม่ได้ ถ่ายใหม่ หรือเลือก JPEG หรือ PNG';

  @override
  String get photoStillSaving =>
      'ยังมีรูปที่กำลังบันทึกในโทรศัพท์เครื่องนี้ เก็บฉบับร่างนี้ไว้แล้วลองอีกครั้ง';

  @override
  String get photoSelectionRecovery =>
      'ยังมีการเลือกรูปที่ต้องกู้คืน ลองอีกครั้งหรือทิ้งฉบับร่างนี้ก่อนบันทึก';

  @override
  String get ok => 'ตกลง';

  @override
  String get planFree => 'ฟรี';

  @override
  String get agencyErrPartyAsAgent =>
      'ผู้ให้เช่าหรือผู้เช่าเป็นนายหน้าในสัญญาเช่าของตนเองไม่ได้';

  @override
  String get agencyErrAlreadyInTeam =>
      'สัญญาเช่าที่อยู่ในทีมแล้วย้ายไปทีมอื่นไม่ได้';

  @override
  String get agencyErrInvitationPending =>
      'มีคำเชิญที่รอตอบรับอยู่แล้ว ใช้ ส่งคำเชิญอีกครั้ง หากจำเป็น';

  @override
  String get agencyErrChooseLead => 'เลือกนายหน้าหลักผู้รับผิดชอบ';

  @override
  String get agencyErrChooseTeam => 'เลือกทีมก่อนมอบหมายสมาชิกทีม';

  @override
  String get agencyErrChooseActive => 'เลือกสมาชิกที่ใช้งานอยู่ของทีมนี้';

  @override
  String get agencyErrChooseSuccessor =>
      'เลือกสมาชิกทีมที่ใช้งานอยู่เพื่อรับช่วงที่พักของบุคคลนี้';

  @override
  String get agencyErrLastOwner =>
      'ตั้งสมาชิกที่ใช้งานอยู่คนอื่นเป็นเจ้าของก่อนนำเจ้าของคนสุดท้ายออก';

  @override
  String get agencyErrOwnerDeletion =>
      'ตั้งสมาชิกคนอื่นเป็นเจ้าของของทุกทีมที่คุณเป็นเจ้าของก่อนขอลบบัญชี';

  @override
  String get agencyErrOwnerOnly =>
      'เฉพาะเจ้าของทีมเท่านั้นที่เปลี่ยนความเป็นเจ้าของได้';

  @override
  String get agencyErrLeadIsParty =>
      'นายหน้าหลักคนใหม่ต้องไม่เป็นผู้ให้เช่าหรือผู้เช่าในสัญญาเช่าเหล่านี้';

  @override
  String get agencyErrInvitationExpired =>
      'คำเชิญนี้หมดอายุแล้ว ขอให้ผู้จัดการทีมส่งอีกครั้ง';

  @override
  String get agencyErrAlreadyJoined => 'บุคคลนี้เข้าร่วมทีมแล้ว';

  @override
  String get agencyErrTeamWideAccess =>
      'บุคคลนี้มีสิทธิ์เข้าถึงทั้งทีมในฐานะเจ้าของหรือผู้จัดการ เปลี่ยนบทบาทในทีมเพื่อนำสิทธิ์นั้นออก';

  @override
  String get agencyErrAlreadyMember => 'บุคคลนี้เป็นสมาชิกทีมอยู่แล้ว';

  @override
  String get agencyErrMustAccept =>
      'สมาชิกทีมคนนี้ต้องตอบรับคำเชิญก่อนได้รับมอบหมายงาน';

  @override
  String get agencyErrTeamChanged =>
      'ทีมของสัญญาเช่านี้เปลี่ยนไป รีเฟรชแล้วลองอีกครั้ง';

  @override
  String get agencyErrUseRemove =>
      'ใช้ นำสมาชิกออก เพื่อนำสมาชิกทีมที่ใช้งานอยู่ออก';

  @override
  String get agencyErrWaitAccept => 'รอให้ตอบรับคำเชิญก่อนเปลี่ยนบทบาทนี้';

  @override
  String get showing => 'แสดง';

  @override
  String get allMyWork => 'งานทั้งหมดของฉัน';

  @override
  String get homesIOwn => 'ที่พักที่ฉันเป็นผู้ให้เช่า';

  @override
  String get whereYouAreTheLandlord => 'ที่พักที่คุณเป็นผู้ให้เช่า';

  @override
  String get homesIRent => 'ที่พักที่ฉันเช่าอยู่';

  @override
  String get whereYouAreTheTenant => 'ที่พักที่คุณเป็นผู้เช่า';

  @override
  String get theseTermsReferToAPreviousAgreement =>
      'เงื่อนไขเหล่านี้อ้างถึงสัญญาฉบับก่อน ทบทวนไฟล์ล่าสุดเพื่อปรับปรุงเงื่อนไข';

  @override
  String get hideSourceClause => 'ซ่อนข้อกำหนดต้นฉบับ';

  @override
  String get showSourceClause => 'ดูข้อกำหนดต้นฉบับ';

  @override
  String get retake => 'ถ่ายใหม่';

  @override
  String get whatShouldTheViewerNotice => 'ต้องการให้ผู้ดูสังเกตสิ่งใด';

  @override
  String get photoRemoved => 'นำภาพถ่ายออกแล้ว';

  @override
  String get photoDeleted => 'ลบภาพถ่ายแล้ว';

  @override
  String get flash => 'แฟลช';

  @override
  String get switchCamera => 'สลับกล้อง';

  @override
  String get retryCamera => 'ลองเปิดกล้องอีกครั้ง';

  @override
  String get takeTheReplacementPhoto => 'ถ่ายรูปทดแทน';

  @override
  String get tapAPhotoToMarkItOr => 'แตะรูปเพื่อทำเครื่องหมายหรือเพิ่มบันทึก';

  @override
  String get theLeadAgent => 'ตัวแทนหลัก';

  @override
  String get theResponsibleAgentOrATeamOwner =>
      'ตัวแทนที่รับผิดชอบ เจ้าของทีม หรือผู้จัดการทีม';

  @override
  String get roomPhotos => 'รูปห้อง';

  @override
  String get takeRoomWidePhotosOrManageExisting =>
      'ถ่ายภาพรวมของห้องหรือจัดการรูปที่มีอยู่';

  @override
  String get takeMorePhotos => 'ถ่ายรูปเพิ่ม';

  @override
  String get takePhotos => 'ถ่ายรูป';

  @override
  String get noPhotosOfThisItemYet => 'ยังไม่มีภาพถ่ายของรายการนี้';

  @override
  String get reviewOpensOnceThisRoomsPhotosAnd =>
      'ตรวจทานได้เมื่ออัปโหลดรูปและการเปลี่ยนแปลงของห้องนี้แล้ว ระหว่างรอสัญญาณ ไฟล์จะยังเก็บอยู่ในโทรศัพท์เครื่องนี้';

  @override
  String get couldNotOpenThisProperty => 'เปิดทรัพย์สินนี้ไม่ได้';

  @override
  String get recentlyDeleted => 'ลบล่าสุด';

  @override
  String get offlineShowingWhatWasLastLoaded =>
      'ออฟไลน์ กำลังแสดงข้อมูลที่โหลดไว้ล่าสุด';

  @override
  String get reportsAndDocuments => 'รายงานและเอกสาร';

  @override
  String get earlierTenancy => 'สัญญาเช่าก่อนหน้า';

  @override
  String get thisTenancysReportsDetailsAndPaperwork =>
      'รายงาน รายละเอียด และเอกสารของสัญญาเช่านี้';

  @override
  String get more => 'เพิ่มเติม';

  @override
  String get whatHappenedHereOverTheYearsReports =>
      'ประวัติที่ผ่านมา ทั้งรายงาน การแก้ไขเพิ่มเติม และการซ่อมแซม';

  @override
  String get changeLog => 'ประวัติการเปลี่ยนแปลง';

  @override
  String get whoChangedWhatInKiviloAndWhen =>
      'ดูว่าใครแก้ไขอะไรใน Kivilo เมื่อใด';

  @override
  String get manageWhoCanWorkOnThisTenancy =>
      'จัดการผู้ที่ทำงานในสัญญาเช่านี้ได้';

  @override
  String get restoreOrDeleteProperty => 'กู้คืนหรือลบที่พัก';

  @override
  String get archiveOrDeleteProperty => 'เก็บเข้าคลังหรือลบทรัพย์สิน';

  @override
  String get returnItToActiveWorkOrMove => 'นำกลับมาใช้งานหรือย้ายไปถังขยะ';

  @override
  String get returnItToActiveProperties => 'ย้ายกลับไปยังที่พักที่ใช้งานอยู่';

  @override
  String get removeItFromActiveWorkOrMove =>
      'นำออกจากงานที่ใช้งานอยู่หรือย้ายไปถังขยะ';

  @override
  String get kiviloEmailsThemAShortIdentityForm =>
      'Kivilo จะส่งแบบฟอร์มยืนยันตัวตนทางอีเมล ตรวจสอบกับรายชื่อผู้ถูกคว่ำบาตรและบุคคลที่มีสถานภาพทางการเมือง แล้วเก็บบันทึกไว้ CEA กำหนดให้ดำเนินการก่อนลงนามสัญญาเช่า';

  @override
  String get verify => 'ตรวจสอบ';

  @override
  String get checkOutLabel => 'การตรวจคืนที่พัก';

  @override
  String get checkInLabel => 'การตรวจรับเข้า';

  @override
  String get tenancyDetails => 'รายละเอียดการเช่า';

  @override
  String get landlordEmailNotProvided => 'ยังไม่มีอีเมลผู้ให้เช่า';

  @override
  String get tenantEmailNotProvided => 'ไม่ได้ระบุอีเมลผู้เช่า';

  @override
  String get peopleDatesRentAndDeposit =>
      'คู่สัญญา วันที่ ค่าเช่า และเงินประกัน';

  @override
  String get documents => 'เอกสาร';

  @override
  String get tenancyAgreementAndSupportingFiles => 'สัญญาเช่าและไฟล์ประกอบ';

  @override
  String get editPropertyAsset => 'แก้ไขทรัพย์สินประจำที่พัก';

  @override
  String get retireAsset => 'เลิกใช้งานทรัพย์สิน';

  @override
  String get retireThisAsset => 'เลิกใช้งานทรัพย์สินนี้หรือไม่';

  @override
  String get couldNotLoadRepairsAndAssets =>
      'โหลดงานซ่อมและทรัพย์สินประจำที่พักไม่ได้';

  @override
  String get request => 'คำขอ';

  @override
  String get requests => 'คำขอ';

  @override
  String get opening => 'กำลังเปิด…';

  @override
  String get reviewRepairTerms => 'ทบทวนเงื่อนไขการซ่อมแซม';

  @override
  String get noMaintenanceReported => 'ยังไม่มีการแจ้งซ่อม';

  @override
  String get theUpdateIsDownloadedAndWillTake =>
      'ดาวน์โหลดอัปเดตแล้ว จะมีผลเมื่อเปิด Kivilo ครั้งถัดไป คุณทำงานต่อได้ทันที';

  @override
  String get aKiviloUpdateIsAvailableDownloadIt =>
      'มีอัปเดต Kivilo คุณดาวน์โหลดตอนนี้หรือทำงานต่อแล้วค่อยอัปเดตก็ได้';

  @override
  String get labelContinue => 'ดำเนินการต่อ';

  @override
  String get notNow => 'ไว้ภายหลัง';

  @override
  String get theResponsibleAgentOrATeamOwnerLabel =>
      'ตัวแทนที่รับผิดชอบ เจ้าของทีม หรือผู้จัดการทีมของสัญญาเช่าทุกฉบับที่นี่';

  @override
  String get propertyActions => 'จัดการทรัพย์สิน';

  @override
  String get tenancy => 'การเช่า';

  @override
  String get tenancies => 'การเช่า';

  @override
  String get inspectionLabel => 'การตรวจ';

  @override
  String get inspections => 'การตรวจ';

  @override
  String get photoWord => 'รูป';

  @override
  String get photosLabel => 'รูป';

  @override
  String get propertyRecovery => 'กู้คืนทรัพย์สิน';

  @override
  String get takeSeveralPhotosThenMarkThemOr =>
      'ถ่ายหลายรูปแล้วใส่เครื่องหมายหรือเพิ่มบันทึกได้ ภาพต้นฉบับจะเก็บไว้เสมอ';

  @override
  String get gallery => 'คลังรูปภาพ';

  @override
  String get resume => 'ดำเนินการต่อ';

  @override
  String get mark => 'ทำเครื่องหมาย';

  @override
  String get deletePhoto => 'ลบรูปภาพ';

  @override
  String get deleteFinding => 'ลบข้อสังเกต';

  @override
  String get couldNotOpenThisRenewal => 'เปิดรายการต่อสัญญานี้ไม่ได้';

  @override
  String get startWithTheRoomsFromTheLast =>
      'เริ่มจากห้องในการตรวจรับเข้าครั้งก่อน';

  @override
  String get namesOnlyTheNewCheckInRecords =>
      'ใช้เฉพาะชื่อห้อง การตรวจรับเข้าอยู่ครั้งใหม่จะบันทึกสภาพแยกต่างหาก';

  @override
  String get whereYouWork => 'พื้นที่ที่คุณทำงาน';

  @override
  String get loadingLabel => 'กำลังโหลด…';

  @override
  String get notChosenYet => 'ยังไม่ได้เลือก';

  @override
  String get member => 'สมาชิก';

  @override
  String get members => 'สมาชิก';

  @override
  String get createOrJoinTeam => 'สร้างหรือเข้าร่วมทีม';

  @override
  String get addAnotherTeam => 'เพิ่มอีกทีม';

  @override
  String get couldNotLoadTeamsTapToTry => 'โหลดทีมไม่ได้ แตะเพื่อลองอีกครั้ง';

  @override
  String get invitation => 'คำเชิญ';

  @override
  String get invitations => 'คำเชิญ';

  @override
  String get createATeamOrAcceptAnInvitation => 'สร้างทีมหรือตอบรับคำเชิญ';

  @override
  String get personalReportBranding => 'ข้อมูลแบรนด์สำหรับรายงานส่วนตัว';

  @override
  String get usedForPropertiesOutsideYourTeams =>
      'ใช้กับที่พักที่อยู่นอกทีมของคุณ';

  @override
  String get yourActivePropertyAllowance =>
      'จำนวนที่พักที่ใช้งานอยู่ที่คุณมีสิทธิ์จัดการ';

  @override
  String get howAHandoverWorks => 'ขั้นตอนการส่งมอบที่พัก';

  @override
  String get captureWriteTheInventoryThenSign =>
      'ถ่ายภาพ เขียนรายการทรัพย์สิน แล้วลงนาม';

  @override
  String get termsOfService => 'ข้อกำหนดการให้บริการ';

  @override
  String get theTermsForUsingKivilo => 'ข้อกำหนดสำหรับการใช้ Kivilo';

  @override
  String get anAppleSubscriptionContinuesUntilYouCancel =>
      'การสมัครผ่าน Apple จะดำเนินต่อจนกว่าคุณจะยกเลิกในบัญชี Apple การลบบัญชี Kivilo จะไม่ยกเลิกการสมัครนี้';

  @override
  String get manageAppStoreSubscriptions => 'จัดการการสมัครผ่าน App Store';

  @override
  String get couldNotLoadProperties => 'โหลดทรัพย์สินไม่ได้';

  @override
  String get showAllMyWork => 'แสดงงานทั้งหมดของฉัน';

  @override
  String get yourPropertiesAndTheirCurrentStatus =>
      'ที่พักของคุณและสถานะปัจจุบัน';

  @override
  String get searchProperties => 'ค้นหาที่พัก';

  @override
  String get addressTenantOrStage => 'ที่อยู่ ผู้เช่า หรือขั้นตอน';

  @override
  String get property => 'ที่พัก';

  @override
  String get properties => 'ที่พัก';

  @override
  String get found => 'รายการที่พบ';

  @override
  String get nothingInRecentlyDeleted => 'ไม่มีรายการที่เพิ่งลบ';

  @override
  String get noArchivedProperties => 'ไม่มีทรัพย์สินที่เก็บเข้าคลัง';

  @override
  String get noMatchingProperties => 'ไม่พบทรัพย์สินที่ตรงกัน';

  @override
  String get tryAnotherAddressOrTenantOrChange =>
      'ลองค้นหาด้วยที่อยู่หรือชื่อผู้เช่าอื่น หรือเปลี่ยนตัวกรอง';

  @override
  String get plansBilling => 'แพ็กเกจและการเรียกเก็บเงิน';

  @override
  String get seat => 'ที่นั่ง';

  @override
  String get seats => 'ที่นั่ง';

  @override
  String get accessUntil => 'ใช้งานได้ถึง';

  @override
  String get currentPeriodEnds => 'รอบปัจจุบันสิ้นสุด';

  @override
  String get askYourTeamOwnerOrManagerAbout =>
      'สอบถามเจ้าของหรือผู้จัดการทีมเกี่ยวกับแพ็กเกจนี้';

  @override
  String get thisPlanWasPurchasedOnTheKivilo =>
      'ซื้อแผนนี้ผ่านเว็บไซต์ Kivilo คุณใช้แผนนี้ในแอปได้';

  @override
  String get proForYourPersonalWork => 'Pro สำหรับงานส่วนตัว';

  @override
  String get yourAppleAccountCanSubscribeForOne =>
      'นอกจากแผนส่วนตัวแล้ว บัญชี Apple ของคุณยังสมัครแผนสำหรับทีมได้หนึ่งทีม สูงสุด 20 คน';

  @override
  String get seatsLabel => 'ที่นั่ง';

  @override
  String get moreSeatsTakeEffectImmediatelyFewerSeats =>
      'การเพิ่มที่นั่งมีผลทันที การลดที่นั่งมีผลเมื่อต่ออายุ Apple จะแจ้งราคาและเวลาที่มีผลก่อนคุณตกลง';

  @override
  String get aSeatChangeReplacesThisSubscriptionImmediately =>
      'การเปลี่ยนจำนวนที่นั่งจะแทนที่การสมัครนี้ทันที Google Play จะนำเวลาที่เหลือมาคิดเป็นเครดิตและแสดงวันชำระเงินครั้งถัดไปให้คุณตรวจสอบก่อนยืนยัน';

  @override
  String get restorePurchases => 'กู้คืนรายการซื้อ';

  @override
  String get paymentIsChargedToYourAppleAccount =>
      'ระบบจะเรียกเก็บเงินจากบัญชี Apple เมื่อคุณยืนยัน หากไม่ต้องการชำระรอบถัดไป ให้ยกเลิกในเมนูการสมัครของ App Store อย่างน้อย 24 ชั่วโมงก่อนต่ออายุ การลบ Kivilo หรือบัญชี Kivilo จะไม่ยกเลิกการสมัครผ่าน Apple';

  @override
  String get termsOfUse => 'ข้อกำหนดการใช้งาน';

  @override
  String get couldNotLoadNotifications => 'โหลดการแจ้งเตือนไม่ได้';

  @override
  String get noNotificationsYet => 'ยังไม่มีการแจ้งเตือน';

  @override
  String get repairTerms => 'เงื่อนไขการซ่อมแซม';

  @override
  String get couldNotOpenThisAgreement => 'เปิดสัญญาฉบับนี้ไม่ได้';

  @override
  String get checkTheClauseAgainstTheAgreementBefore =>
      'ตรวจสอบข้อความในสัญญาก่อนยืนยันข้อกำหนดการซ่อม';

  @override
  String get openAgreement => 'เปิดสัญญา';

  @override
  String get clausesToReview => 'ข้อกำหนดที่ต้องตรวจสอบ';

  @override
  String get selectAClauseToFillInThe =>
      'เลือกข้อกำหนดเพื่อกรอกรายละเอียดด้านล่าง';

  @override
  String get noClauseWasFoundInTheReadable =>
      'ไม่พบข้อกำหนดในข้อความที่อ่านได้ โปรดเปิดสัญญาแล้วกรอกข้อความต้นฉบับด้านล่าง';

  @override
  String get sourcePage => 'หน้าต้นฉบับ';

  @override
  String get clauseText => 'ข้อความของข้อกำหนด';

  @override
  String get repairRule => 'กติกาการซ่อม';

  @override
  String get firstAmount => 'จำนวนเงินส่วนแรก';

  @override
  String get anotherRule => 'กติกาอื่น';

  @override
  String get tenantPaysTheFirst => 'ผู้เช่าจ่ายส่วนแรก';

  @override
  String get explainTheRepairRule => 'อธิบายกติกาการซ่อม';

  @override
  String get notesAndExceptionsOptional => 'หมายเหตุและข้อยกเว้น (ไม่บังคับ)';

  @override
  String get confirmRepairTerms => 'ยืนยันข้อตกลงการซ่อม';

  @override
  String get somethingElse => 'อื่น ๆ';

  @override
  String get itemOptional => 'รายการ (ไม่บังคับ)';

  @override
  String get whichItemOptional => 'รายการใด (ไม่บังคับ)';

  @override
  String get forExampleToiletBowl => 'เช่น โถสุขภัณฑ์';

  @override
  String get restored => 'กู้คืนแล้ว';

  @override
  String get everyChangeAndDeletionWithWhoMade =>
      'ดูการแก้ไขและการลบแต่ละครั้งพร้อมชื่อผู้ดำเนินการ กู้คืนห้อง รายการ รูปภาพ และข้อสังเกตที่ลบไปได้ภายใน 30 วัน';

  @override
  String get allChanges => 'การเปลี่ยนแปลงทั้งหมด';

  @override
  String get deletions => 'รายการที่ลบ';

  @override
  String get offlineShowingPreviouslyLoadedHistory =>
      'ออฟไลน์ กำลังแสดงประวัติที่โหลดไว้ก่อนหน้า';

  @override
  String get historyIsRecordedFrom23October2026 =>
      'เริ่มบันทึกประวัติเมื่อวันที่ 23 ตุลาคม 2026';

  @override
  String get nothingHasBeenDeleted => 'ยังไม่มีรายการที่ลบ';

  @override
  String get noChangesRecordedYet => 'ยังไม่มีประวัติการเปลี่ยนแปลง';

  @override
  String get restoredLabel => 'กู้คืนแล้ว';

  @override
  String get restoring => 'กำลังกู้คืน…';

  @override
  String get restore => 'กู้คืน';

  @override
  String get thisRemovesItFromTheRoomAnd =>
      'รูปจะถูกนำออกจากห้องและรายการที่แนบอยู่ คุณกู้คืนได้จากประวัติการเปลี่ยนแปลงของที่พักภายใน 30 วัน';

  @override
  String get line => 'รายการ';

  @override
  String get lines => 'รายการ';

  @override
  String get setCondition => 'ระบุสภาพ';

  @override
  String get thisRemovesTheLineFromTheInventory =>
      'ระบบจะนำรายการนี้ออกจากบัญชีทรัพย์สิน คุณกู้คืนได้จากประวัติการเปลี่ยนแปลงของที่พักภายใน 30 วัน';

  @override
  String get somePhotosOrChangesInThisRoom =>
      'รูปหรือการเปลี่ยนแปลงบางส่วนของห้องนี้ยังอัปโหลดไม่เสร็จ เปิดรายการหรือรูปห้องเพื่อทำเครื่องหมายให้เสร็จ แล้วลองอัปโหลดอีกครั้งก่อนดำเนินการต่อ';

  @override
  String get itsPhotosVideosAndInventoryWillBe =>
      'รูปภาพ วิดีโอ และรายการทรัพย์สินของห้องจะถูกลบ คุณกู้คืนห้องจากประวัติการเปลี่ยนแปลงของที่พักได้ภายใน 30 วัน';

  @override
  String get couldNotOpenThisRoom => 'เปิดห้องนี้ไม่ได้';

  @override
  String get select => 'เลือก';

  @override
  String get tapLinesToSelectThem => 'แตะเพื่อเลือกรายการ';

  @override
  String get noItemsRecordedLabel => 'ยังไม่มีรายการทรัพย์สิน';

  @override
  String get addAnItemToRecordItsCondition =>
      'เพิ่มรายการเพื่อบันทึกสภาพและภาพถ่าย';

  @override
  String get noPhotosOrVideosRecorded => 'ยังไม่มีรูปภาพหรือวิดีโอที่บันทึกไว้';

  @override
  String get checkEveryItemAgainstThePhotosYour =>
      'ตรวจสอบทุกรายการกับภาพถ่าย เมื่อตรวจเสร็จ ห้องนี้จะพร้อมสำหรับรายงาน';

  @override
  String get worthCheckingBeforeYouReview => 'สิ่งที่ควรตรวจสอบก่อนตรวจทาน';

  @override
  String get thisInventoryIsFixedForSigningYou =>
      'รายการทรัพย์สินถูกล็อกเพื่อรอลงนามแล้ว คุณยังดูรูปและวิดีโอได้';

  @override
  String get duplicate => 'ทำสำเนา';

  @override
  String get couldNotOpenThisRepair => 'เปิดงานซ่อมนี้ไม่ได้';

  @override
  String get usedWithYourNameOnReportsFor =>
      'รายงานของที่พักส่วนตัวจะแสดงข้อมูลนี้พร้อมชื่อของคุณ ส่วนที่พักของทีมใช้ข้อมูลแบรนด์ของทีม';

  @override
  String get officePhoneOptional => 'โทรศัพท์สำนักงาน (ไม่บังคับ)';

  @override
  String get editReportBranding => 'แก้ไขข้อมูลแบรนด์บนรายงาน';

  @override
  String get aTeamOwner => 'เจ้าของทีม';

  @override
  String get aTeamOwnerOrManager => 'เจ้าของทีมหรือผู้จัดการ';

  @override
  String get teamDetails => 'รายละเอียดทีม';

  @override
  String get theTeamIdentityShownOnItsReports =>
      'ข้อมูลประจำทีมที่แสดงในรายงาน';

  @override
  String get addAgencyLicenceAndLogo => 'เพิ่มเลขใบอนุญาตและโลโก้บริษัท';

  @override
  String get propertyAssignments => 'การมอบหมายทรัพย์สิน';

  @override
  String get couldNotLoadTheTimeline => 'โหลดลำดับเหตุการณ์ไม่ได้';

  @override
  String get chooseAProperty => 'เลือกทรัพย์สิน';

  @override
  String get couldNotLoadYourProperties => 'โหลดทรัพย์สินของคุณไม่ได้';

  @override
  String get search => 'ค้นหา';

  @override
  String get addressPostalCodeOrLastTenant =>
      'ที่อยู่ รหัสไปรษณีย์ หรือผู้เช่าคนก่อน';

  @override
  String get noPropertyMatches => 'ไม่พบทรัพย์สินที่ตรงกัน';

  @override
  String get paymentProof => 'หลักฐานการชำระเงิน';

  @override
  String get requestAnotherDocument => 'ขอเอกสารอื่น';

  @override
  String get askTheTenantForAnOptionalSupporting =>
      'ขอเอกสารประกอบเพิ่มเติมจากผู้เช่าได้ตามต้องการ';

  @override
  String get document => 'เอกสาร';

  @override
  String get requesting => 'กำลังส่งคำขอ…';

  @override
  String get requestLabel => 'ขอ';

  @override
  String get photoSavedOnThisPhoneItWill =>
      'บันทึกรูปภาพลงโทรศัพท์แล้ว ระบบจะอัปโหลดเมื่อกลับมาออนไลน์';

  @override
  String get couldNotLoadDocuments => 'โหลดเอกสารไม่ได้';

  @override
  String get hideOtherDocuments => 'ซ่อนเอกสารอื่น';

  @override
  String get otherDocuments => 'เอกสารอื่น';

  @override
  String get optionalSupportingFilesForThisTenancy =>
      'เอกสารประกอบเพิ่มเติมสำหรับสัญญาเช่านี้';

  @override
  String get noOtherDocumentsRequested => 'ยังไม่มีคำขอเอกสารอื่น';

  @override
  String get privateToTheTenantLandlordAndAgents =>
      'เฉพาะผู้เช่า ผู้ให้เช่า และตัวแทนที่มีสิทธิ์เข้าถึงสัญญาเช่านี้เท่านั้น';

  @override
  String get tenancyAgreement => 'สัญญาเช่า';

  @override
  String get keepTheSignedAgreementWithThisProperty =>
      'เก็บสัญญาที่ลงนามแล้วไว้กับข้อมูลทรัพย์สินนี้';

  @override
  String get yourAgreementAndReviewedRepairTerms =>
      'สัญญาเช่าและเงื่อนไขการซ่อมแซมที่ตรวจทานแล้ว';

  @override
  String get yourAgreementForThisTenancy => 'สัญญาสำหรับการเช่านี้';

  @override
  String get currentAgreement => 'สัญญาฉบับปัจจุบัน';

  @override
  String get hidePreviousAgreements => 'ซ่อนสัญญาฉบับก่อน';

  @override
  String get previousAgreements => 'สัญญาฉบับก่อน';

  @override
  String get uploadPdfInBrowser => 'อัปโหลด PDF ในเบราว์เซอร์';

  @override
  String get reviewMaintenanceClause => 'ทบทวนข้อกำหนดการบำรุงรักษา';

  @override
  String get retryUpload => 'ลองอัปโหลดอีกครั้ง';

  @override
  String get uploadTheRequestedDocumentBelow => 'อัปโหลดเอกสารที่ขอด้านล่าง';

  @override
  String get waitingForTheTenantToUpload => 'รอผู้เช่าอัปโหลด';

  @override
  String get setUpThePropertyTheTenancyAnd => 'ตั้งค่าที่พัก สัญญาเช่า และห้อง';

  @override
  String get aNewTenancyStaysInThePropertys =>
      'สัญญาเช่าใหม่จะอยู่กับทีมเดิม หากเป็นที่พักส่วนตัวก็จะยังเป็นส่วนตัว';

  @override
  String get newPropertyLabel => 'ทรัพย์สินใหม่';

  @override
  String get existingProperty => 'ทรัพย์สินที่มีอยู่';

  @override
  String get findTheAddressOptional => 'ค้นหาที่อยู่ (ไม่บังคับ)';

  @override
  String get postalCodeBuildingOrStreet => 'รหัสไปรษณีย์ อาคาร หรือถนน';

  @override
  String get buildingOrStreetAreaAndCity => 'อาคารหรือถนน ย่าน และเมือง';

  @override
  String get condominium => 'คอนโดมิเนียม';

  @override
  String get condominiumServicedResidenceOrApartment =>
      'คอนโดมิเนียม เซอร์วิสเรสซิเดนซ์ หรืออพาร์ตเมนต์';

  @override
  String get roomsStartWithEditableInventoryRowsSuited =>
      'แต่ละห้องเริ่มด้วยรายการทรัพย์สินที่แก้ไขได้ตามระดับการจัดเฟอร์นิเจอร์';

  @override
  String get partiallyFurnished => 'มีเฟอร์นิเจอร์บางส่วน';

  @override
  String get unfurnished => 'ไม่มีเฟอร์นิเจอร์';

  @override
  String get sameLandlordAsLastTime => 'ผู้ให้เช่าคนเดิม';

  @override
  String get chooseFromYourContacts => 'เลือกจากรายชื่อติดต่อ';

  @override
  String get verifyBothPartiesCea => 'ยืนยันตัวตนทั้งสองฝ่าย (CEA)';

  @override
  String get eachStartsWithStandardLinesYouCan =>
      'แต่ละห้องเริ่มด้วยรายการมาตรฐานที่แก้ไขได้';

  @override
  String get namesOnlyThisCheckInRecordsIts =>
      'ใช้เฉพาะชื่อห้อง การตรวจครั้งนี้จะบันทึกสภาพแยกต่างหาก';

  @override
  String get bedrooms => 'ห้องนอน';

  @override
  String get bathrooms => 'ห้องน้ำ';

  @override
  String get anotherRoomOptional => 'ห้องอื่น (ไม่บังคับ)';

  @override
  String get forExampleStudy => 'เช่น ห้องทำงาน';

  @override
  String get noRoomsYetYouCanAddThem => 'ยังไม่มีห้อง คุณเพิ่มภายหลังได้';

  @override
  String get roomLabel => 'ห้อง';

  @override
  String get rooms => 'ห้อง';

  @override
  String get checkingForPhotosOnThisPhone => 'กำลังตรวจสอบภาพถ่ายบนโทรศัพท์…';

  @override
  String get deleteChange => 'ลบการเปลี่ยนแปลง';

  @override
  String get suggestAChange => 'เสนอให้แก้ไข';

  @override
  String get chooseTheLandlord => 'เลือกผู้ให้เช่า';

  @override
  String get chooseTheTenant => 'เลือกผู้เช่า';

  @override
  String get couldNotLoadYourContacts => 'โหลดรายชื่อติดต่อไม่ได้';

  @override
  String get noContactsYet => 'ยังไม่มีรายชื่อติดต่อ';

  @override
  String get nameOrEmail => 'ชื่อหรืออีเมล';

  @override
  String get noContactMatches => 'ไม่พบรายชื่อติดต่อที่ตรงกัน';

  @override
  String get and => 'และ';

  @override
  String get singapore => 'สิงคโปร์';

  @override
  String get malaysia => 'มาเลเซีย';

  @override
  String get whereDoYouWork => 'คุณทำงานที่ไหน';

  @override
  String get newPropertiesUseThatCountrysAddressesAnd =>
      'ทรัพย์สินใหม่จะใช้รูปแบบที่อยู่และสกุลเงินของประเทศนี้ คุณแก้ไขการตั้งค่านี้ภายหลังได้ที่บัญชี';

  @override
  String get newPropertiesAreMadeInThisCountry =>
      'ทรัพย์สินใหม่จะอยู่ในประเทศนี้ ส่วนทรัพย์สินเดิมยังอยู่ในประเทศที่ตั้งไว้';

  @override
  String get couldNotLoadYourHomes => 'โหลดที่พักของคุณไม่ได้';

  @override
  String get reportsYouAgreedRepairsAndThePeople =>
      'รายงานที่คุณยืนยันแล้ว การซ่อมแซม และผู้เกี่ยวข้อง';

  @override
  String get noHomesWhereYouAreTheLandlord =>
      'ยังไม่มีที่พักที่คุณเป็นผู้ให้เช่า';

  @override
  String get noHomesWhereYouAreTheTenant => 'ยังไม่มีที่พักที่คุณเป็นผู้เช่า';

  @override
  String get andItsAgent => 'และตัวแทนที่รับผิดชอบ';

  @override
  String get saveTenancyChanges => 'บันทึกการเปลี่ยนแปลงสัญญาเช่าหรือไม่';

  @override
  String get theseDetailsIdentifyTheTenancyAndIts =>
      'ข้อมูลนี้ระบุสัญญาเช่าและคู่สัญญาที่ลงนาม โปรดตรวจสอบให้ละเอียดก่อนบันทึก';

  @override
  String get theAddressAndTypePrintedOnThe =>
      'ที่อยู่และประเภทที่พักที่แสดงในรายงาน';

  @override
  String get unitOptional => 'เลขที่ห้อง (ไม่บังคับ)';

  @override
  String get postcode => 'รหัสไปรษณีย์';

  @override
  String get propertyType => 'ประเภททรัพย์สิน';

  @override
  String get condominiumOrApartment => 'คอนโดมิเนียมหรืออพาร์ตเมนต์';

  @override
  String get addAnEmailSoEachPartyCan =>
      'เพิ่มอีเมลเพื่อให้ทั้งสองฝ่ายรับและลงนามรายงานได้';

  @override
  String get landlordEmailOptional => 'อีเมลผู้ให้เช่า (ไม่บังคับ)';

  @override
  String get notProvided => 'ไม่ได้ระบุ';

  @override
  String get tenantEmailOptional => 'อีเมลผู้เช่า (ไม่บังคับ)';

  @override
  String get openThisOnTheKiviloWebsite => 'เปิดรายการนี้บนเว็บไซต์ Kivilo';

  @override
  String get couldNotLoadYourTasks => 'โหลดงานของคุณไม่ได้';

  @override
  String get nothingHereNow => 'ยังไม่มีรายการในขณะนี้';

  @override
  String get thereIsMoreThanOneScreenOf =>
      'ยังมีงานอีกหลายรายการ ทำงานบางส่วนให้เสร็จ หรือเปิดหน้าที่พักเพื่อดูบันทึกทั้งหมด';

  @override
  String get continueTheCheckOut => 'ทำรายการตรวจย้ายออกต่อ';

  @override
  String get continueTheCheckIn => 'ทำรายการตรวจรับเข้าอยู่ต่อ';

  @override
  String get tasksForYourProperties => 'งานสำหรับที่พักของคุณ';

  @override
  String get tasksForYourRentedHomes => 'งานสำหรับที่พักที่คุณเช่า';

  @override
  String get yourTasksUpdatesAndUpcomingDeadlines =>
      'งาน ความเคลื่อนไหว และกำหนดเวลาที่ใกล้ถึงของคุณ';

  @override
  String get offlineShowingTasksAsTheyWereLast =>
      'ออฟไลน์ กำลังแสดงงานที่โหลดไว้ล่าสุด บางงานอาจเสร็จแล้ว';

  @override
  String get checkingForUpdates => 'กำลังตรวจหาอัปเดต…';

  @override
  String get nothingNeedsYourActionRightNow => 'ขณะนี้ยังไม่มีงานที่คุณต้องทำ';

  @override
  String get continueWhereYouLeftOff => 'ทำต่อจากที่ค้างไว้';

  @override
  String get clientChecksKycCdd => 'การตรวจสอบลูกค้า (KYC/CDD)';

  @override
  String get verifyClientsKycCdd => 'ยืนยันตัวตนลูกค้า (KYC/CDD)';

  @override
  String get yourFirstHandover => 'การส่งมอบที่พักครั้งแรกของคุณ';

  @override
  String get greatHandoversStartWithAClearRecord =>
      'บันทึกที่ชัดเจนช่วยให้ส่งมอบที่พักได้ราบรื่น';

  @override
  String get addThePropertyAndTenancyWellGuide =>
      'เพิ่มทรัพย์สินและสัญญาเช่า แล้วทำตามขั้นตอนตั้งแต่ถ่ายรูปแรกจนถึงลงนามรายงาน คุณรับคำเชิญเข้าทีมได้ที่บัญชี';

  @override
  String get youreAllCaughtUp => 'คุณจัดการงานครบแล้ว';

  @override
  String get nothingIsWaitingOnYouOrAnyone =>
      'ขณะนี้ไม่มีรายการที่รอคุณหรือผู้อื่นดำเนินการ';

  @override
  String get somePhotosOrChangesHaveNotUploaded =>
      'รูปหรือการเปลี่ยนแปลงบางส่วนยังอัปโหลดไม่เสร็จ เปิดห้องแล้วแตะลองอัปโหลดอีกครั้งก่อนส่งให้ลงนาม';

  @override
  String get remindersSentToThePartiesWithAn =>
      'ส่งการแจ้งเตือนให้คู่สัญญาที่มีอีเมลแล้ว';

  @override
  String get confirmNoChanges => 'ยืนยันว่าไม่มีการเปลี่ยนแปลงใช่ไหม';

  @override
  String get youAreConfirmingThatTheCheckOut =>
      'คุณกำลังยืนยันว่าผลการตรวจคืนตรงกับผลการตรวจรับเข้าที่ตกลงกันไว้ โดยไม่มีความเสียหาย ของสูญหาย หรือการเปลี่ยนแปลงอื่นที่ต้องบันทึก ทั้งสองฝ่ายจะเห็นข้อความยืนยันนี้ในรายงาน';

  @override
  String get confirmNoChangesLabel => 'ยืนยันว่าไม่มีการเปลี่ยนแปลง';

  @override
  String get couldNotOpenThisInspection => 'เปิดการตรวจนี้ไม่ได้';

  @override
  String get waitingForSignatures => 'กำลังรอการลงนาม';

  @override
  String get readyToSendForSignature => 'พร้อมส่งให้ลงนาม';

  @override
  String get checkTheInventoryAgainstYourPhotosThen =>
      'ตรวจรายการทรัพย์สินกับภาพถ่าย แล้วทำเครื่องหมายว่าตรวจแต่ละห้องแล้ว';

  @override
  String get openRoom => 'เปิดห้อง';

  @override
  String get changesAtCheckOut => 'การเปลี่ยนแปลงเมื่อย้ายออก';

  @override
  String get recordAnythingThatDiffersFromTheAgreed =>
      'บันทึกสิ่งที่ต่างจากสภาพเมื่อย้ายเข้าที่ทั้งสองฝ่ายตกลงกัน';

  @override
  String get changeLabel => 'การเปลี่ยนแปลง';

  @override
  String get changes => 'การเปลี่ยนแปลง';

  @override
  String get nothingRecordedYet => 'ยังไม่มีบันทึก';

  @override
  String get addDamageWearMissingItemsOrImprovements =>
      'บันทึกความเสียหาย การสึกหรอ ของที่ขาด หรือสิ่งที่ปรับปรุง หากไม่มีการเปลี่ยนแปลง ให้ยืนยันด้านล่าง';

  @override
  String get addAnotherChange => 'เพิ่มการเปลี่ยนแปลงอีกหนึ่งรายการ';

  @override
  String get partiesNotVerifiedYet => 'คู่สัญญายังยืนยันตัวตนไม่ครบ';

  @override
  String get ceaRequiresDueDiligenceOnTheLandlord =>
      'CEA กำหนดให้ตรวจสอบทั้งผู้ให้เช่าและผู้เช่าก่อนลงนามสัญญาเช่า';

  @override
  String get sendForSignatureAnyway => 'ส่งให้ลงนามต่อไป';

  @override
  String get sendReminders => 'ส่งการแจ้งเตือน';

  @override
  String estimatedRepairCost(String currency) {
    return 'ค่าใช้จ่ายโดยประมาณ ($currency)';
  }

  @override
  String previousTenantName(String name) {
    return 'ผู้เช่าคนล่าสุด: $name';
  }

  @override
  String get selectPropertyFirst => 'เลือกที่พัก หรือเปลี่ยนเป็นที่พักใหม่';

  @override
  String get malaysianPostcodeLength => 'รหัสไปรษณีย์มาเลเซียมี 5 หลัก';

  @override
  String get chooseFurnishingLevel => 'เลือกระดับการจัดเฟอร์นิเจอร์ของที่พัก';

  @override
  String get choosePlan => 'เลือกแผน';

  @override
  String storePlanUnavailable(String store) {
    return 'ยังสมัครแผนนี้ผ่าน $store ไม่ได้';
  }

  @override
  String get reportTenancyPeriod => 'ระยะเวลาเช่า';

  @override
  String get tenancyLength => 'ระยะสัญญาเช่า';

  @override
  String get chooseTenancyLength => 'เลือกระยะสัญญาเช่า';

  @override
  String get oneYear => '1 ปี';

  @override
  String get twoYears => '2 ปี';

  @override
  String get threeYears => '3 ปี';

  @override
  String get customDates => 'กำหนดวันที่เอง';

  @override
  String get chooseWhatToShow => 'เลือกสิ่งที่ต้องการดู';

  @override
  String get yourHomesGroup => 'บ้านของคุณ';

  @override
  String get myWork => 'งานของฉัน';
}
