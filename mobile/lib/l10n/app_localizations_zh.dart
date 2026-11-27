// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String settingsVersion(String version, String build) {
    return '版本 $version（$build）';
  }

  @override
  String settingsVersionPatch(String version, int patch) {
    return '$version · 补丁 $patch';
  }

  @override
  String get settingsDeletionDrawerTitle => '要申请删除账户吗？';

  @override
  String get settingsDeletionDrawerBody =>
      '我们会确认您的申请，并在 30 天内完成符合条件的删除。根据适用的租约记录保存规定，检查和报告记录可能需要保留。';

  @override
  String get cancel => '取消';

  @override
  String get settingsRequestDeletion => '申请删除';

  @override
  String settingsSignOutFailed(String error) {
    return '无法退出登录。$error';
  }

  @override
  String settingsLicence(String number) {
    return '执照 $number';
  }

  @override
  String settingsCea(String number) {
    return 'CEA $number';
  }

  @override
  String get settingsAddAgency => '添加您的中介公司';

  @override
  String couldNotLoad(String error) {
    return '无法加载：$error';
  }

  @override
  String get settingsBrandingEmpty => '您的名字和标志会显示在 PDF 报告顶部';

  @override
  String get settingsBrandingSet => '显示在您的 PDF 和共享报告上';

  @override
  String get settingsPlan => '方案';

  @override
  String get loading => '加载中';

  @override
  String settingsPlanUsage(int used, int limit) {
    return '已使用 $used/$limit 个进行中的房产';
  }

  @override
  String get settingsAccount => '账户';

  @override
  String get settingsYourAccount => '您的账户';

  @override
  String get settingsSignedIn => '已登录 Kivilo';

  @override
  String get settingsForAgents => '中介专用';

  @override
  String get settingsStartCheckIn => '开始入住检查';

  @override
  String get settingsStartCheckInDetail => '逐个房间记录房产状况';

  @override
  String get settingsWorkspace => '团队';

  @override
  String get settingsTeam => '团队';

  @override
  String get settingsTeamDetail => '成员、邀请和分配的工作';

  @override
  String get settingsProperties => '房产';

  @override
  String get settingsPropertiesDetail => '房产设置、已归档房产和回收站';

  @override
  String get settingsBranding => '报告品牌';

  @override
  String get settingsBrandingDetail => '在 PDF 和共享报告上显示您的中介公司。';

  @override
  String get settingsPlanDetail => '您可以同时处理多少个房产。';

  @override
  String get settingsPrivacySupport => '隐私与支持';

  @override
  String get settingsLanguage => '语言';

  @override
  String get settingsPhoneLanguage => '跟随手机语言';

  @override
  String get settingsPrivacyPolicy => '隐私政策';

  @override
  String get settingsPrivacyPolicyDetail => 'Kivilo 如何处理您的数据';

  @override
  String get settingsHelp => '帮助与支持';

  @override
  String get settingsHelpDetail => '获取检查或账户方面的帮助';

  @override
  String get settingsYourData => '您的数据';

  @override
  String get settingsYourDataDetail => '管理您的账户和删除申请。';

  @override
  String get settingsAccountDeletion => '删除账户';

  @override
  String get settingsDeletionAim => '我们会尽量在收到申请后 30 天内完成符合条件的删除。';

  @override
  String settingsDeletionDates(String requested, String due) {
    return '申请于 $requested · 截止 $due';
  }

  @override
  String settingsDeletionDatesCompleted(
    String requested,
    String due,
    String completed,
  ) {
    return '申请于 $requested · 截止 $due · 完成于 $completed';
  }

  @override
  String get sending => '发送中…';

  @override
  String get settingsRequestAccountDeletion => '申请删除账户';

  @override
  String settingsDeletionLoadFailed(String error) {
    return '无法加载您的删除申请。$error';
  }

  @override
  String get signOut => '退出登录';

  @override
  String get settingsSignOutDetail => '您保存的签名将从这部手机上移除';

  @override
  String get unknown => '未知';

  @override
  String get settingsDeletionCompleted => '申请已完成';

  @override
  String get settingsDeletionInProgress => '申请处理中';

  @override
  String get settingsDeletionReceived => '申请已收到';

  @override
  String get dateShortPattern => 'y年M月d日';

  @override
  String get dateMonthYearPattern => 'y年M月';

  @override
  String get checkIn => '入住检查';

  @override
  String get checkOut => '退租检查';

  @override
  String get roomNotStarted => '未开始';

  @override
  String get roomNeedsReview => '待审核';

  @override
  String get roomReviewed => '已审核';

  @override
  String get roomCapturing => '拍摄中';

  @override
  String videoCount(int count) {
    return '$count 段视频';
  }

  @override
  String photoCount(int count) {
    return '$count 张照片';
  }

  @override
  String get roomNothingCaptured => '尚未拍摄';

  @override
  String get listSeparator => '、';

  @override
  String roomSummaryWithItems(String summary, int count) {
    return '$summary · $count 件物品';
  }

  @override
  String get errorNoConnection => '没有网络连接。您拍摄的内容都已保存在这部手机上，有信号时请再试一次。';

  @override
  String get errorSignedOut => '您已退出登录，请重新登录。';

  @override
  String get errorNotFound => '找不到此内容，或您的账户无权打开。';

  @override
  String get errorReportFrozen => '这份报告已发送签署，无法再修改。';

  @override
  String get errorInvalidRequest => '请检查资料后再试一次。';

  @override
  String get errorReviewIncomplete => '每个房间都需要至少一件物品，并先完成审核。';

  @override
  String get errorAssessmentReviewIncomplete => '发布评估前，请打开并确认每一项发现。';

  @override
  String get errorNoDamageUnconfirmed => '发布前，请添加一项发现，或确认没有发现损坏。';

  @override
  String get errorInvalidState => '报告目前的阶段无法进行此操作。';

  @override
  String get errorCaptureConflict => '这张照片或这段视频与报告中已有的一项冲突。请刷新房间并检查。';

  @override
  String get errorCaptureMissing => '上传未完成。文件仍在这部手机上，请再试一次。';

  @override
  String get errorEvidenceMissing => '上传未完成。照片仍在这部手机上，请再试一次。';

  @override
  String get errorPlanLimit => '您方案中的进行中的房产名额已全部使用。退租检查签署完成或租约结束后，该房产便不再计入。';

  @override
  String get errorMaintenanceConflict => '有人已经更新了这项维修。请刷新并查看记录。';

  @override
  String get errorMoveInDefectStale => '此物品已被更换或移除。这份通知无法被同意，但您仍可提出异议。';

  @override
  String get errorAgencyConflict => '团队权限已更改。请刷新后再试一次。';

  @override
  String get errorPropertyHistory => '此房产有报告记录，无法删除。请将它归档以保留记录。';

  @override
  String get errorPropertyRestoreExpired => '恢复期已结束，此房产已无法恢复。';

  @override
  String get errorPropertyTrashed => '此房产在回收站中。请先在 账户 → 房产 → 回收站 中恢复它。';

  @override
  String get errorFindingSaveConflict =>
      '这项发现已经保存过。请重新打开它以保存最新的修改。您的草稿仍保存在这部手机上。';

  @override
  String errorServer(int status) {
    return 'Kivilo 暂时无法完成此操作，请再试一次。（错误 $status）';
  }

  @override
  String get errorUnexpected => '出了点问题，请再试一次。';

  @override
  String addendumAdded(String name) {
    return '新增：$name';
  }

  @override
  String addendumRemoved(String name) {
    return '移除：$name';
  }

  @override
  String addendumReplaced(String old, String name) {
    return '更换：$old 换成 $name';
  }

  @override
  String get addendumItem => '物品';

  @override
  String acknowledgementPending(String role, String name) {
    return '$role $name：待确认';
  }

  @override
  String acknowledgedInPerson(String role, String name, String date) {
    return '$role $name：已当面确认 $date';
  }

  @override
  String acknowledged(String role, String name, String date) {
    return '$role $name：已确认 $date';
  }

  @override
  String partyRole(String role) {
    String _temp0 = intl.Intl.selectLogic(role, {
      'Landlord': '房东',
      'Tenant': '租客',
      'LANDLORD': '房东',
      'TENANT': '租客',
      'other': '$role',
    });
    return '$_temp0';
  }

  @override
  String get landlord => '房东';

  @override
  String get tenant => '租客';

  @override
  String get basisMinorRepair => '小额维修条款';

  @override
  String get basisTenantCaused => '由租客造成';

  @override
  String get basisFairWear => '正常损耗';

  @override
  String get basisLandlordObligation => '房东的责任';

  @override
  String get basisOther => '其他';

  @override
  String proposalSharedPays(String cap) {
    return '首 $cap 由租客支付，其余由房东支付。';
  }

  @override
  String get proposalLandlordPays => '由房东支付。';

  @override
  String get proposalTenantPays => '由租客支付。';

  @override
  String get proposalLandlordArranges => '由房东安排维修。';

  @override
  String get proposalTenantArranges => '由租客安排维修。';

  @override
  String chooseLabel(String label) {
    return '选择$label';
  }

  @override
  String get close => '关闭';

  @override
  String get statusReported => '已报告';

  @override
  String get statusAcknowledged => '已受理';

  @override
  String get statusScheduled => '已安排';

  @override
  String get statusAwaitingConfirmation => '等待确认';

  @override
  String get statusResolved => '已解决';

  @override
  String get statusClosed => '已关闭';

  @override
  String get statusCompleted => '已完成';

  @override
  String get statusAwaitingSignatures => '等待签署';

  @override
  String get statusDraft => '草稿';

  @override
  String get signInConnectFailed => '无法连接。请检查网络后再试一次。';

  @override
  String get signInWelcomeBack => '欢迎回来';

  @override
  String get signInCheckEmail => '请查看您的电邮';

  @override
  String get signInTagline => '您的房产，有据可查';

  @override
  String get signInContinue => '登录以继续您的检查。';

  @override
  String signInEnterCode(String email) {
    return '请输入发送到 $email 的六位数验证码。';
  }

  @override
  String get signInIntro => '为中介、房东和租客提供房屋状况报告、维修及其记录。';

  @override
  String get signInCodeLabel => '验证码';

  @override
  String get signInEmailLabel => '电邮地址';

  @override
  String get signInPasswordHint => '您的密码';

  @override
  String get signInHidePassword => '隐藏密码';

  @override
  String get signInShowPassword => '显示密码';

  @override
  String get working => '处理中';

  @override
  String get signIn => '登录';

  @override
  String get signInEmailCode => '用电邮发送验证码';

  @override
  String get signInResend => '重新发送验证码';

  @override
  String get signInDifferentEmail => '使用其他电邮';

  @override
  String get signInUseCode => '改用电邮验证码';

  @override
  String get signInWithPassword => '用密码登录';

  @override
  String get signInFooter => '每个房间，每个细节，需要时随时可查。';

  @override
  String get updateReady => '更新已就绪';

  @override
  String get updateKivilo => '更新 Kivilo';

  @override
  String get updateRestartBody => '更新已下载。Kivilo 将关闭，准备好重新打开时会通知您。';

  @override
  String get updateDownloadBody => 'Kivilo 有新的更新。立即下载；Kivilo 将关闭，准备好重新打开时会通知您。';

  @override
  String get updateCloseAndUpdate => '关闭并更新';

  @override
  String get update => '更新';

  @override
  String get updateStoreFailed => '无法打开应用商店。请在商店中搜索 Kivilo。';

  @override
  String get updateOpenAppStore => '打开 App Store';

  @override
  String get updateOpenGooglePlay => '打开 Google Play';

  @override
  String get updateRequiredBody => '此版本已不再支持。这部手机上的照片和视频会保留，并在更新后继续上传。';

  @override
  String get updateDoneTitle => 'Kivilo 已更新';

  @override
  String get updateDoneBody => '点按以重新打开 Kivilo。';

  @override
  String get updateChannelName => '应用更新';

  @override
  String get updateChannelDescription => '已完成的 Kivilo 应用更新';

  @override
  String get updateNeedsNotifications => '请开启通知，这样 Kivilo 才能在可以重新打开时通知您。';

  @override
  String get pushNewNotification => 'Kivilo 新通知';

  @override
  String get open => '打开';

  @override
  String get homeTitle => '首页';

  @override
  String get notifications => '通知';

  @override
  String get homeUrgentServices => '紧急服务';

  @override
  String get homeInspections => '检查';

  @override
  String get homeWorkspaceFailed => '无法加载您的团队';

  @override
  String get tryAgain => '再试一次';

  @override
  String get homeShowAllProperties => '显示所有房产';

  @override
  String get homeGoodMorning => '早上好';

  @override
  String get homeGoodAfternoon => '下午好';

  @override
  String get homeGoodEvening => '晚上好';

  @override
  String homeCounts(int inProgress, int awaiting) {
    return '$inProgress 项进行中 · $awaiting 项等待签署';
  }

  @override
  String get homeViewInspections => '查看检查';

  @override
  String get newCheckIn => '新的入住检查';

  @override
  String homeGreeting(String greeting, String name) {
    return '$greeting，$name';
  }

  @override
  String get homePartySubtitle => '您的报告、维修和记录，都在这里。';

  @override
  String get homeAgentSubtitle => '每次交接，下一步都清清楚楚。';

  @override
  String get homeOffline => '离线。显示之前加载的内容。';

  @override
  String get homeYourProperties => '您的房产';

  @override
  String get homeYourPropertiesDetail => '维修、记录，以及住在那里的人。';

  @override
  String get homeEyebrowNextHandover => '您的下一次交接';

  @override
  String get homeEyebrowWaiting => '等待签署';

  @override
  String get homeEyebrowNextStep => '您的下一步';

  @override
  String get homeHeadlineEmpty => '顺利的交接，\n从清楚的记录开始。';

  @override
  String get homeHeadlineAwaiting => '让大家\n达成共识。';

  @override
  String get homeHeadlineFirstRoom => '从第一个房间开始。';

  @override
  String get homeHeadlineContinue => '一次一个房间。';

  @override
  String get homeBodyEmpty => '添加房产和租约。我们会带您从第一张照片走到签署完成的报告。';

  @override
  String get homeBodyAwaiting => '物品清单已锁定。查看还有谁需要签署，或重新发送签署电邮。';

  @override
  String get homeBodyFirstRoom => '添加一个房间，拍照，然后记下您看到的情况。';

  @override
  String get homeBodyContinue => '打开一个房间，选择清单中的物品，添加照片并检查状况，然后审核这个房间。';

  @override
  String get homeStartCheckIn => '开始入住检查';

  @override
  String get homeCheckSignatures => '查看签署情况';

  @override
  String get homeAddFirstRoom => '添加第一个房间';

  @override
  String get homeContinueInspection => '继续检查';

  @override
  String get homeOpenProperty => '打开房产';

  @override
  String get homeOpenCheckIn => '打开入住检查';

  @override
  String get homeOpenCheckOut => '打开退租检查';

  @override
  String get viewReport => '查看报告';

  @override
  String get homeYouAreLandlord => '您是房东';

  @override
  String get homeYouAreTenant => '您是租客';

  @override
  String get homeReportPending => '中介发送后，您的入住检查报告会显示在这里。';

  @override
  String get homeReviewAndSign => '查看并签署';

  @override
  String get checkOutReport => '退租检查报告';

  @override
  String get checkInReport => '入住检查报告';

  @override
  String get repairs => '维修';

  @override
  String get homeNoProperties => '还没有房产';

  @override
  String get homeNoPropertiesDetail => '创建一个入住检查来添加您的第一个房产。';

  @override
  String get agent => '中介';

  @override
  String get filterAll => '全部';

  @override
  String get filterInProgress => '进行中';

  @override
  String get filterAwaitingSignature => '等待签署';

  @override
  String get inspectionsLoadFailed => '无法加载检查';

  @override
  String get inspectionsSubtitle => '您的入住和退租检查报告，都在这里。';

  @override
  String get inspectionsResponsibleAgent => '负责中介';

  @override
  String get inspectionsAllAgents => '所有中介';

  @override
  String get inspectionsTeamNote => '显示您的账户可以访问的团队工作。';

  @override
  String get inspectionsOffline => '离线。显示上次加载的内容；您可以继续拍照。';

  @override
  String get inspectionsSearch => '搜索检查';

  @override
  String get inspectionsSearchHint => '房产、租客，或入住/退租检查';

  @override
  String get inspectionsClearSearch => '清除搜索';

  @override
  String inspectionsCount(int count) {
    return '$count 份报告';
  }

  @override
  String inspectionsFound(int count) {
    return '找到 $count 份报告';
  }

  @override
  String get inspectionsNoMatch => '没有符合的检查';

  @override
  String get inspectionsNoMatchDetail => '试试其他房产或租客，或更改筛选条件。';

  @override
  String get inspectionsShowAll => '显示所有检查';

  @override
  String inspectionsResponsible(String name) {
    return '负责人：$name';
  }

  @override
  String roomCount(int count) {
    return '$count 个房间';
  }

  @override
  String get inspectionsEmpty => '还没有检查';

  @override
  String get inspectionsEmptyOffline => '连接网络后才能创建新的入住检查。';

  @override
  String get inspectionsEmptyDetail => '为下一次交接开始入住检查。您的物品清单、照片和已签署的报告都会保存在这里。';

  @override
  String get workspaceChoose => '选择团队';

  @override
  String get workspaceAll => '所有房产';

  @override
  String get workspacePersonal => '个人';

  @override
  String workspaceInvitations(int count) {
    return '团队邀请（$count）';
  }

  @override
  String get workspaceAddTeam => '添加团队';

  @override
  String get teamAccessChanged => '团队权限已更改。请刷新后再试一次。';

  @override
  String get newWhoOwns => '这项工作属于谁？';

  @override
  String get newPersonalDetail => '在您添加协作者之前，仅您本人可见';

  @override
  String get newTeamDetail => '被分配的中介，以及团队的所有者和经理可以访问这项工作';

  @override
  String get newCreateTeamHint => '请在 账户 → 团队 中创建或加入团队。';

  @override
  String get newFurnishingRequired => '请选择房产是否全装修。';

  @override
  String get newEndAfterStart => '租约的结束日期必须晚于开始日期。';

  @override
  String fieldRequired(String label) {
    return '$label（必填）';
  }

  @override
  String fieldOptional(String label) {
    return '$label（选填）';
  }

  @override
  String fieldIsRequired(String label) {
    return '$label为必填项';
  }

  @override
  String get fieldInvalidEmail => '请输入有效的电邮地址';

  @override
  String fieldInvalidAmount(String currency) {
    return '请输入有效的$currency金额，最多两位小数';
  }

  @override
  String get newEssentials => '先填写基本资料';

  @override
  String get newEssentialsDetail => '设置房产和租约，之后可以添加房间。';

  @override
  String newWorkspace(String name) {
    return '团队：$name';
  }

  @override
  String get newPrivate => '在您分享之前，仅您本人可见。';

  @override
  String get newTeamResponsible => '您是负责中介。被分配的同事可以与您一起工作；所有者和经理可以查看所有团队房产。';

  @override
  String get newProperty => '房产';

  @override
  String get newPropertyDetail => '交接的地点';

  @override
  String get newAddress => '地址';

  @override
  String get newUnit => '单位号码';

  @override
  String get newPostalCode => '邮区编号';

  @override
  String get newPropertyTypeRequired => '房产类型（必填）';

  @override
  String get newChoosePropertyType => '选择房产类型';

  @override
  String get propertyTypePrivate => '私宅（非有地）';

  @override
  String get propertyTypePrivateDetail => '共管公寓或私人公寓';

  @override
  String get propertyTypeHdb => '组屋';

  @override
  String get propertyTypeHdbDetail => '建屋局组屋';

  @override
  String get propertyTypeLanded => '有地住宅';

  @override
  String get propertyTypeLandedDetail => '排屋、半独立式或独立式洋房';

  @override
  String get propertyTypeCommercial => '商业';

  @override
  String get propertyTypeCommercialDetail => '办公室、零售或其他商业场所';

  @override
  String get newFurnishing => '装修情况（必填）';

  @override
  String get newFurnishingDetail => '全装修的房间会预先列出标准物品，其他房间则从空白开始。';

  @override
  String get newFullyFurnished => '全装修';

  @override
  String get newNotFullyFurnished => '非全装修';

  @override
  String get newPeople => '相关人员';

  @override
  String get newPeopleDetail => '报告上的房东和租客';

  @override
  String get newLandlordName => '房东姓名';

  @override
  String get newLandlordEmail => '房东电邮';

  @override
  String get newTenantName => '租客姓名';

  @override
  String get newTenantEmail => '租客电邮';

  @override
  String get newTenancy => '租约';

  @override
  String get newTenancyDetail => '日期和约定金额';

  @override
  String get newStarts => '开始日期（必填）';

  @override
  String get newEnds => '结束日期（必填）';

  @override
  String newMonthlyRent(String currency) {
    return '月租（$currency）';
  }

  @override
  String newDeposit(String currency) {
    return '押金（$currency）';
  }

  @override
  String get creating => '创建中…';

  @override
  String get newCreate => '创建入住检查';

  @override
  String get assetAddTitle => '添加房产设备';

  @override
  String get assetName => '名称';

  @override
  String get assetCategory => '类别';

  @override
  String get assetAppliance => '电器';

  @override
  String get assetFixture => '固定装置';

  @override
  String get assetFurniture => '家具';

  @override
  String get assetSurface => '表面';

  @override
  String get assetSystem => '系统';

  @override
  String get assetRoomOptional => '房间（选填）';

  @override
  String get assetIdentifierOptional => '品牌、型号或序列号（选填）';

  @override
  String get add => '添加';

  @override
  String get minorRepairCap => '小额维修上限';

  @override
  String get minorRepairCapBody =>
      '根据租约，租客为每次小额维修支付的金额。有人提议由谁支付时，会自动预填分摊金额；每项提议仍需租客同意。';

  @override
  String get minorRepairCapLabel => '租客最多支付';

  @override
  String get currencyPrefix => 'S\$ ';

  @override
  String get minorRepairCapHelper => '如果租约没有上限，请留空';

  @override
  String get minorRepairCapInvalid => '请输入金额，例如 150';

  @override
  String get save => '保存';

  @override
  String get defectPeriod => '入住缺陷申报期';

  @override
  String get defectPeriodBody =>
      '请使用租约中规定的期限。租约开始日为第 1 天（新加坡时间）。租客首次签署入住检查后，这个期限便固定下来。';

  @override
  String get defectPeriodDays => '天数';

  @override
  String get defectPeriodHelper => '填 0 表示不设入住缺陷申报期';

  @override
  String get defectPeriodInvalid => '请输入 0 到 365 之间的整数';

  @override
  String get tenancyEyebrow => '您的房产';

  @override
  String get tenancySubtitle => '这个家的报告、维修和记录。';

  @override
  String get tenancyRecord => '房产记录';

  @override
  String get tenancyRecordDetail => '约定的状况，以及之后发生的事';

  @override
  String get tenancyManageAccess => '管理访问权限';

  @override
  String get tenancyPropertyAccess => '房产访问权限';

  @override
  String get tenancyOpenInspectionDetail => '房间、物品清单和签名';

  @override
  String get tenancyLatestCheckOut => '最新的退租检查报告';

  @override
  String get tenancyLatestCheckIn => '最新的入住检查报告';

  @override
  String get tenancyViewReport => '查看状况报告';

  @override
  String get tenancyTimeline => '房产时间线';

  @override
  String get tenancyTimelineDetail => '此地址已签署的报告、维修和约定的费用';

  @override
  String get propertySettings => '房产设置';

  @override
  String get tenancyCare => '房产维护';

  @override
  String get tenancyCareDetail => '报告问题，并跟进每一项维修';

  @override
  String get tenancyDanger => '有紧急危险？';

  @override
  String get tenancyDangerNumbers => '警察 999 · 消防或救护车 995';

  @override
  String get reportProblem => '报告问题';

  @override
  String get defectPeriodDisabled => '未启用。仍可报告维修。';

  @override
  String defectPeriodSummary(int days, String date) {
    return '$days 天 · 请在 $date（新加坡时间）前申报';
  }

  @override
  String get edit => '编辑';

  @override
  String get maintenance => '维修';

  @override
  String get tenancyMaintenanceEmpty => '此房产的维修请求会显示在这里';

  @override
  String requestCount(int count) {
    return '$count 项请求';
  }

  @override
  String repairAttempts(int count) {
    return '维修 $count 次';
  }

  @override
  String get repairCosts => '维修费用';

  @override
  String get repairCostsDetail => '决定维修由谁支付的条款';

  @override
  String get assets => '房产设备';

  @override
  String get assetsDetail => '与维修相关的电器和固定装置';

  @override
  String get assetAdd => '添加设备';

  @override
  String assetRepairs(int count) {
    return '365 天内维修 $count 次';
  }

  @override
  String get assetRepeatFault => '重复故障';

  @override
  String get notSet => '未设置';

  @override
  String minorRepairCapSummary(String amount) {
    return '每次维修租客最多支付 S\$$amount';
  }

  @override
  String get set => '设置';

  @override
  String get agentMayAgreeCosts => '中介可同意费用';

  @override
  String get agentMayAgreeCostsOn => '允许中介代您接受或拒绝费用提议';

  @override
  String get agentMayAgreeCostsLandlordOnly => '只有房东可以更改此项';

  @override
  String get tenancyNoRequests => '没有未处理的请求';

  @override
  String get tenancyNoRequestsDetail => '这个租约没有报告过维修问题。';

  @override
  String get assetsEmpty => '这个房产还没有添加任何设备。';

  @override
  String get propertyArchived => '已归档';

  @override
  String get propertyInTrash => '在回收站中';

  @override
  String get propertyActive => '进行中的房产';

  @override
  String propertyCounts(int tenancies, int inspections, int photos) {
    return '$tenancies 个租约 · $inspections 次检查 · $photos 张照片';
  }

  @override
  String get propertyTenancyAccess => '租约访问权限';

  @override
  String get propertyPersonalTenancy => '个人租约';

  @override
  String propertyResponsibleAgent(String name) {
    return '负责中介：$name';
  }

  @override
  String get propertyOpenCheckOutReport => '打开退租检查报告';

  @override
  String get propertyOpenCheckInReport => '打开入住检查报告';

  @override
  String get propertyDangerZone => '危险操作';

  @override
  String get propertyManageOnly =>
      '只有该房产的负责中介或中介公司经理才能归档或删除它。您需要拥有此地址每个租约的管理权限。';

  @override
  String get propertyTrashedNoDate => '此房产已从进行中的工作中隐藏。请在恢复期结束前恢复它。';

  @override
  String propertyTrashedUntil(String date) {
    return '此房产已从进行中的工作中隐藏。请在 $date 前恢复。之后，符合条件的记录和媒体将被永久删除。';
  }

  @override
  String get propertyRestore => '恢复房产';

  @override
  String get propertyArchivedBody => '此房产不在进行中的房产组合中。它的记录和报告会被保留。';

  @override
  String get propertyArchiveBody => '归档会将此地址从进行中的工作中移除，并保留它的报告和记录。您之后可以恢复它。';

  @override
  String get propertyRestoreActive => '恢复为进行中的房产';

  @override
  String get propertyArchive => '归档房产';

  @override
  String get propertyDeleteBody =>
      '删除误建或只有草稿的房产。它会先在回收站中保留 30 天，之后符合条件的记录和媒体将被永久删除。';

  @override
  String get propertyDelete => '删除房产';

  @override
  String get propertyMoveToTrash => '移到回收站';

  @override
  String questionTitle(String label) {
    return '$label？';
  }

  @override
  String propertyTrashBody(int tenancies, int inspections, int photos) {
    return '这会影响 $tenancies 个租约、$inspections 次检查和 $photos 张照片。您有 30 天时间在 房产 → 回收站 中恢复它们。';
  }

  @override
  String get propertyArchiveConfirmBody =>
      '这会为所有有权限的人将此房产从进行中的工作中移除。报告和证据仍可在已归档房产中查看。';

  @override
  String get propertyRestoreConfirmBody => '这会将房产及其已保存的工作恢复到之前的状态。';

  @override
  String propertyTypeToConfirm(String label) {
    return '请输入“$label”以确认。';
  }

  @override
  String get propertyAddress => '房产地址';

  @override
  String get propertiesActive => '进行中';

  @override
  String get propertiesTrash => '回收站';

  @override
  String get propertiesNoActive => '没有进行中的房产。';

  @override
  String get propertiesNoArchived => '没有已归档的房产。';

  @override
  String get propertiesTrashEmpty => '回收站是空的。';

  @override
  String propertyListCounts(int tenancies, int inspections) {
    return '$tenancies 个租约 · $inspections 次检查';
  }

  @override
  String propertyRestoreBefore(String date) {
    return '请在 $date 前恢复';
  }

  @override
  String get teamCreateTitle => '创建团队';

  @override
  String get teamWorkTogether => '一起合作';

  @override
  String get teamIntro =>
      '创建或加入团队，与同事一起管理房产。中介可以查看分配给自己的房产，所有者和经理可以查看团队的全部房产。管理自己的房产时，请选择“个人”。';

  @override
  String teamInvitationTo(String team) {
    return '$team 的邀请';
  }

  @override
  String teamInvitationRole(String role, String date) {
    return '$role · $date 到期';
  }

  @override
  String get teamJoinDetail => '加入后您将成为这个团队的一员。中介负责被分配的租约；经理管理团队工作。';

  @override
  String get teamJoin => '加入团队';

  @override
  String get teamDecline => '拒绝邀请';

  @override
  String teamRoleMembers(String role, int count) {
    return '$role · $count 名成员';
  }

  @override
  String teamOpenWorkspace(String team) {
    return '打开 $team';
  }

  @override
  String get teamCreate => '创建团队';

  @override
  String get teamMembers => '团队成员';

  @override
  String teamRoleSummary(String role) {
    return '$role · 中介可以查看被分配的租约。所有者和经理管理团队的所有房产。';
  }

  @override
  String get teamInviteMember => '邀请成员';

  @override
  String get teamRename => '重命名团队';

  @override
  String get teamMembersAndInvitations => '成员和邀请';

  @override
  String get teamMemberActive => '已加入';

  @override
  String get teamInvitationPending => '邀请待接受';

  @override
  String get teamMemberRemoved => '已移除';

  @override
  String teamAssignedTenancies(int count) {
    return '分配了 $count 个租约';
  }

  @override
  String teamExpires(String date) {
    return '$date 到期';
  }

  @override
  String get teamAssignedWork => '分配的工作';

  @override
  String get teamNoProperties =>
      '团队还没有房产。开始入住检查时请选择这个团队。您也可以在“房产访问权限”中将现有的个人租约移入团队。';

  @override
  String get teamRecentActivity => '最近动态';

  @override
  String get activityCreatedTeam => '创建了团队';

  @override
  String get activityInvitedMember => '邀请了成员';

  @override
  String get activityResentInvitation => '重新发送了邀请';

  @override
  String get activityRevokedInvitation => '撤回了邀请';

  @override
  String get activityRemovedMember => '移除了成员';

  @override
  String get activityRenamedTeam => '重命名了团队';

  @override
  String get activityJoinedTeam => '加入了团队';

  @override
  String get activityDeclinedInvitation => '拒绝了邀请';

  @override
  String get activityReassigned => '重新分配了离职成员的房产';

  @override
  String get activityChangedAssignments => '更改了房产分配';

  @override
  String get activityAddedProperty => '将房产加入团队';

  @override
  String get activityAddedCollaborator => '添加了房产协作者';

  @override
  String get activityRemovedCollaborator => '移除了房产协作者';

  @override
  String get activityPropertyArchive => '归档了房产';

  @override
  String get activityPropertyUnarchive => '恢复了已归档的房产';

  @override
  String get activityPropertyTrash => '将房产移到回收站';

  @override
  String get activityPropertyRestore => '从回收站恢复了房产';

  @override
  String activityChangedRole(String role) {
    return '将角色改为$role';
  }

  @override
  String get teamName => '团队名称';

  @override
  String get teamInviteColleague => '邀请同事';

  @override
  String get teamEmailAddress => '电邮地址';

  @override
  String get roleManager => '经理';

  @override
  String get teamManagerDetail => '经理可以查看团队租约、分配工作并管理成员。';

  @override
  String get teamAgentDetail => '中介负责分配给他们的租约。其他团队记录保持私密。';

  @override
  String get teamSendInvitation => '发送邀请';

  @override
  String get teamInvitationNotAccepted => '此邀请尚未被接受，因此无法访问团队工作。';

  @override
  String get teamResendInvitation => '重新发送邀请';

  @override
  String get teamRevokeInvitation => '撤回邀请';

  @override
  String teamRemoveConfirm(String name, String team) {
    return '要将 $name 从 $team 移除吗？对方的中介公司访问权限将停止。已保存的工作和署名会保留；个人房产不受影响。';
  }

  @override
  String teamReassignFirst(int count) {
    return '移除此成员前，请先重新分配 $count 个租约。';
  }

  @override
  String get teamNewResponsibleAgent => '新的负责中介';

  @override
  String get teamChooseMember => '选择成员';

  @override
  String get teamRolesExplained => '所有者管理团队，经理监督团队房产，中介负责被分配的租约。';

  @override
  String get teamRemoveMember => '移除成员';

  @override
  String get teamSaveRole => '保存角色';

  @override
  String get roleOwner => '所有者';

  @override
  String accessRemoveTitle(String name) {
    return '要移除 $name 吗？';
  }

  @override
  String get accessRemoveReportsBody => '对方将无法再访问这个租约以前的报告。对方已保存的工作会保留在房产上。';

  @override
  String get accessRemoveBody => '对方将无法再访问这个租约及其检查、更新记录和维修。对方已保存的工作会保留在房产上。';

  @override
  String get accessRemove => '移除访问权限';

  @override
  String get accessPreviousReports => '以前报告的访问权限';

  @override
  String get accessReportsOnlyIntro =>
      '您的权限仅限于您参与过的以前报告。负责中介可以把您添加为协作者，让您处理这个租约。';

  @override
  String get accessIntro => '协作者可以为这个租约拍照、编辑物品清单和管理维修，但无法访问其他租约或房产。';

  @override
  String get accessPersonalDetail => '这项工作属于负责中介。移入团队后，团队的所有者和经理就可以访问。';

  @override
  String get accessTeamDetail => '团队所有者和经理会监督这个租约。被分配的中介和外部协作者可以处理它。';

  @override
  String get accessMoveToTeam => '移入团队';

  @override
  String get accessAssignMembers => '分配团队成员';

  @override
  String get accessLeadOnly => '只有负责中介可以处理这个租约。';

  @override
  String get accessLeadAgent => '负责中介';

  @override
  String get accessCanWork => '可以处理这个租约';

  @override
  String get remove => '移除';

  @override
  String get accessPreviousReportsOnly => '仅限以前的报告';

  @override
  String get accessPreviousReportsDetail =>
      '这些中介仍可访问他们以前参与过的报告，但无法处理这个租约的其他内容。';

  @override
  String accessPreviousReportCount(int count) {
    return '$count 份以前的报告';
  }

  @override
  String get accessAddCollaboratorTitle => '添加协作者';

  @override
  String get accessAddCollaboratorDetail => '对方用这个电邮地址登录 Kivilo 后，就可以打开这个房产。';

  @override
  String get saving => '保存中…';

  @override
  String get accessAddCollaborator => '添加协作者';

  @override
  String get accessLeadManages => '只有负责中介可以添加或移除协作者。';

  @override
  String get accessTeamManages => '负责中介和团队经理可以更改访问权限。';

  @override
  String get accessHandoverDetail =>
      '更换负责中介会移交管理权，但不会更改署名或已签署的报告。外部协作者保留现有的访问权限。';

  @override
  String get accessFindMember => '查找团队成员';

  @override
  String get accessTeamMember => '团队成员';

  @override
  String get accessSaveAssignment => '保存分配';

  @override
  String get accessMoveTitle => '要把租约移入团队吗？';

  @override
  String get accessMoveBody =>
      '这个租约将成为团队工作。所有者和经理将获得访问权限并可以重新分配。现有的协作者、已签署的报告和署名都会保留。其他个人租约仍然是个人的。';

  @override
  String get accessCreateTeamFirst => '请先在 账户 → 团队 中创建或加入团队。';

  @override
  String get accessChooseTeam => '选择团队';

  @override
  String accessTeamTenancy(String team) {
    return '团队租约 · $team';
  }

  @override
  String get accessPrivate => '私密';

  @override
  String get accessShared => '共享租约';

  @override
  String accessSharedWith(String names) {
    return '已与 $names 共享';
  }

  @override
  String accessReportsSharedWith(String names) {
    return '以前的报告已与 $names 共享';
  }

  @override
  String get changeDamage => '损坏';

  @override
  String get changeWear => '磨损';

  @override
  String get changeMissing => '缺失';

  @override
  String get changeImproved => '改善';

  @override
  String get changeUnchanged => '无变化';

  @override
  String get verdictUndecided => '未决定';

  @override
  String get verdictTenantLiable => '租客负责';

  @override
  String get verdictFairWear => '正常损耗';

  @override
  String get verdictDisputed => '有争议';

  @override
  String get roomAddTitle => '添加房间';

  @override
  String get roomName => '房间名称';

  @override
  String get stillUploading => '仍在上传';

  @override
  String get stillUploadingBody => '部分照片、视频或修改尚未上传。发送签署前，请打开各房间并点按“重试上传”。';

  @override
  String get sendForSignatureTitle => '要发送签署吗？';

  @override
  String sendForSignatureBody(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '全部 $count 个房间都已审核。',
      one: '房间已审核。',
    );
    return '$_temp0发送后，物品清单、说明和照片标记将被锁定。请在双方签署前与他们一起查看报告。';
  }

  @override
  String get send => '发送';

  @override
  String signingLinkSent(String name) {
    return '签署链接正在发送给 $name';
  }

  @override
  String get pdfNoViewer => '请安装 PDF 阅读器来打开这份报告，或使用“分享 PDF”发送。';

  @override
  String get pdfOpenFailed => '无法打开这份 PDF。请再试一次，或使用“分享 PDF”。';

  @override
  String get findingPhotosUnfinished =>
      '发布前，请完成发现项照片的标记和上传。重新打开“添加发现项”或“审核发现项”即可继续。';

  @override
  String get publishNoDamageTitle => '要发布“没有发现损坏”吗？';

  @override
  String get publishAssessmentTitle => '要发布评估吗？';

  @override
  String get publishNoDamageBody =>
      '入住检查和退租检查之间没有记录任何变化。发布即表示您已检查并没有发现损坏，双方都会在共享报告中看到这一点。之后若要修改，需要发布新版本。';

  @override
  String get publishAssessmentBody =>
      '已审核的发现项将作为一份注明日期的评估显示，与已签署的物品清单分开。之后若要修改，需要发布新版本。';

  @override
  String get publishNoDamage => '发布无损坏';

  @override
  String get publish => '发布';

  @override
  String get inspection => '检查';

  @override
  String inspectionOpenFailed(String error) {
    return '无法打开这个检查。$error';
  }

  @override
  String get inspectionOffline => '离线副本。打开已保存的房间可继续拍摄。审核和签署需要网络连接。';

  @override
  String get inspectionCheckInEyebrow => '入住检查报告';

  @override
  String get inspectionCheckOutEyebrow => '退租检查报告';

  @override
  String step(int number, String name) {
    return '第 $number 步，共 3 步：$name';
  }

  @override
  String stepComplete(int number, String name) {
    return '第 $number 步，共 3 步：$name，已完成';
  }

  @override
  String stepCurrent(int number, String name) {
    return '第 $number 步，共 3 步：$name，当前步骤';
  }

  @override
  String get stepRooms => '房间';

  @override
  String get stepReview => '审核';

  @override
  String get stepSign => '签署';

  @override
  String get inspectionSigned => '已签署并妥善记录。';

  @override
  String get inspectionReadyToSign => '可供双方签署。';

  @override
  String get inspectionRoomsReady => '房间已就绪。审核后发送。';

  @override
  String get inspectionBuildRecord => '逐个房间建立记录。';

  @override
  String get inspectionCheckEachRoom => '发送前请检查每个房间。';

  @override
  String get inspectionSignedBody => '双方都已签署。约定的报告可以查看和分享了。';

  @override
  String get inspectionSentBody => '报告已锁定。请在下方当面或通过电邮收集签名。';

  @override
  String get inspectionRoomsReadyBody => '发送后，物品清单、说明和照片标记将被锁定，供双方签署。';

  @override
  String get inspectionRecordingBody => '从房间的物品清单开始。打开每件物品，记录状况、拍照并标记细节。';

  @override
  String get inspectionReviewBody => '对照照片和视频检查物品清单，然后将每个房间标记为已审核。';

  @override
  String roomsReviewedSuffix(int total) {
    return '/$total 个房间已审核';
  }

  @override
  String get sendForSignature => '发送签署';

  @override
  String continueRoom(String room) {
    return '继续：$room';
  }

  @override
  String get inspectionPeople => '报告上的人员';

  @override
  String get tenantHandover => '租客交接';

  @override
  String get viewCheckInBaseline => '查看入住检查基准';

  @override
  String get reportSummary => '报告摘要';

  @override
  String get roomsStartFirst => '从第一个房间开始';

  @override
  String get roomsDetail => '逐个房间的物品清单和媒体';

  @override
  String get roomsEmpty => '还没有房间';

  @override
  String get roomsEmptyDetail => '添加一个房间来开始物品清单。';

  @override
  String get signatures => '签名';

  @override
  String get signaturesDetail => '约定的物品清单现已锁定，等待签署。';

  @override
  String get shareReport => '分享报告';

  @override
  String get shareReportDetail => '私密链接，或印有您中介公司抬头的 PDF。';

  @override
  String get shareReportSigned => '查看或发送已签署的报告';

  @override
  String get viewPdf => '查看 PDF';

  @override
  String get sharePdf => '分享 PDF';

  @override
  String get shareLink => '分享链接';

  @override
  String get shareLinkWarning => '任何拥有链接的人都可以阅读这份报告。';

  @override
  String get signedReportAndUpdates => '已签署的报告和更新记录';

  @override
  String get writeUpdate => '撰写更新记录';

  @override
  String get endOfTenancy => '租约结束';

  @override
  String get endOfTenancyDetail => '以这份已签署的入住检查作为退租检查的基准。';

  @override
  String get startCheckOut => '开始退租检查';

  @override
  String get maintenanceHistory => '维修记录';

  @override
  String get maintenanceHistoryDetail => '供审核参考。是否影响某项发现，由人来判断。';

  @override
  String repairCount(int count) {
    return '$count 次维修';
  }

  @override
  String mediaFileCount(int count) {
    return '$count 个媒体文件';
  }

  @override
  String costAgreed(String agreement) {
    return '费用已约定：$agreement';
  }

  @override
  String get costPending => '费用提议等待回复';

  @override
  String get costDisputed => '费用有争议';

  @override
  String get costNotProposed => '还没有人提议由谁支付';

  @override
  String costsOpen(int count) {
    return '$count 项维修没有约定费用';
  }

  @override
  String get costsOpenBody => '在决定押金之前，请先确定每一项由谁支付，或将其关联到一项发现，在那里作出决定。';

  @override
  String roomPreview(String room, int number) {
    return '$room 预览 $number';
  }

  @override
  String get signed => '已签署';

  @override
  String get noEmailOnFile => '没有电邮记录';

  @override
  String signingLinkEmailed(String date) {
    return '签署链接已于 $date 通过电邮发送';
  }

  @override
  String get signingLinkQueued => '正在用电邮发送签署链接';

  @override
  String get signingLinkFailed => '无法用电邮发送签署链接';

  @override
  String get signingLinkNotEmailed => '尚未用电邮发送签署链接';

  @override
  String get emailSigningLink => '用电邮发送签署链接';

  @override
  String get resend => '重新发送';

  @override
  String get checkOutAssessment => '退租评估';

  @override
  String get checkOutAssessmentDetail => '一份独立、注明日期的变化与责任记录。';

  @override
  String get checkOutAssessmentIntro =>
      '记录入住检查以来的每一项变化。发现项在您发布前保持私密，已签署的物品清单不会改变。';

  @override
  String publishedVersion(int version) {
    return '已发布版本 $version';
  }

  @override
  String get findings => '发现项';

  @override
  String get findingsEmpty => '尚未记录任何变化';

  @override
  String findingsCount(int count) {
    return '已记录 $count 项变化';
  }

  @override
  String get findingUnconfirmed => '未确认';

  @override
  String findingEstimatedCost(String amount) {
    return '预计费用 · SGD $amount';
  }

  @override
  String get findingsConfirmFirst => '发布前，请打开并确认每一项未确认的发现。';

  @override
  String get publishNoDamageFound => '发布：没有发现损坏';

  @override
  String get publishAssessment => '发布评估';

  @override
  String get publishNewVersion => '发布新版本';

  @override
  String get categoryMeter => '仪表';

  @override
  String get conditionNew => '全新';

  @override
  String get conditionGood => '良好';

  @override
  String get conditionFair => '一般';

  @override
  String get conditionPoor => '较差';

  @override
  String get conditionDamaged => '损坏';

  @override
  String get photoActions => '照片操作';

  @override
  String get videoActions => '视频操作';

  @override
  String get preview => '预览';

  @override
  String get previewDetail => '打开原始文件';

  @override
  String get editNote => '编辑说明';

  @override
  String get noteHint => '说明这张图显示了什么';

  @override
  String get markPhoto => '标记照片';

  @override
  String get markPhotoDetail => '圈出、指向或画出细节';

  @override
  String get deleteMedia => '删除媒体';

  @override
  String get photo => '照片';

  @override
  String get deletePhotoTitle => '要删除这张照片吗？';

  @override
  String get deleteVideoTitle => '要删除这段视频吗？';

  @override
  String get deleteMediaBody => '这会将它从房间以及所关联的物品中移除。';

  @override
  String get delete => '删除';

  @override
  String deleteNamed(String name) {
    return '要删除 $name 吗？';
  }

  @override
  String get deleteItemBody => '这会将这一行从物品清单中移除。';

  @override
  String nothingToRecordTitle(String room) {
    return '$room 没有需要记录的内容？';
  }

  @override
  String get nothingToRecordBody => '这会将房间标记为已审核且没有物品。报告将注明这个房间没有记录任何内容。';

  @override
  String get confirm => '确认';

  @override
  String get signInAgain => '请重新登录以继续。';

  @override
  String get roomStillUploadingBody =>
      '这个房间有部分照片、视频或修改尚未上传。请打开该物品或“房间媒体与巡视录像”，完成照片标记并重试上传后再继续。';

  @override
  String get roomRename => '重命名房间';

  @override
  String get roomActions => '房间操作';

  @override
  String get roomRenameDetail => '更改房间名称';

  @override
  String get roomDelete => '删除房间';

  @override
  String get roomDeleteDetail => '移除其照片、视频和物品清单';

  @override
  String get roomDeleteTitle => '要删除这个房间吗？';

  @override
  String get roomDeleteBody => '它的照片、视频和物品清单将被移除。';

  @override
  String get room => '房间';

  @override
  String get roomInventory => '房间物品清单';

  @override
  String roomOpenFailed(String error) {
    return '无法打开这个房间。$error';
  }

  @override
  String get atCheckIn => '入住时';

  @override
  String get atCheckInSigned => '这个房间签署时的样子';

  @override
  String atCheckInSignedOn(String date) {
    return '这个房间于 $date 签署时的样子';
  }

  @override
  String get hide => '隐藏';

  @override
  String get show => '显示';

  @override
  String get inventory => '物品清单';

  @override
  String itemsInRoom(int count) {
    return '这个房间有 $count 件物品';
  }

  @override
  String get inventoryEmpty => '还没有物品';

  @override
  String get inventoryEmptyDetail => '添加一件物品，然后打开它来拍照和标记细节。';

  @override
  String get media => '媒体';

  @override
  String get mediaEmptyDetail => '这个房间的照片和视频';

  @override
  String get mediaOne => '1 张照片或 1 段视频';

  @override
  String mediaMany(int count) {
    return '$count 张照片和视频';
  }

  @override
  String get newestFirst => '最新的在前';

  @override
  String get oldestFirst => '最早的在前';

  @override
  String get roomMediaWalkthrough => '房间媒体与巡视录像';

  @override
  String get mediaEmpty => '还没有照片或视频';

  @override
  String get mediaEmptyUploading => '照片和视频上传后会显示在这里。';

  @override
  String get finishRoom => '完成这个房间';

  @override
  String get finishRoomEmpty => '添加一件物品，或确认这个房间没有需要记录的内容。';

  @override
  String get finishRoomBody => '对照照片和视频检查每件物品。您审核后，这个房间就可以放进报告了。';

  @override
  String get reviewedRoom => '我已审核这个房间';

  @override
  String get nothingToRecord => '没有需要记录的内容';

  @override
  String get roomOffline => '离线副本。可以继续拍摄；审核修改需要网络连接。';

  @override
  String get roomRecordEyebrow => '房间记录';

  @override
  String roomCounts(int items, int photos, int videos) {
    return '$items 件物品 · $photos 张照片 · $videos 段视频';
  }

  @override
  String get roomFixedBody => '物品清单已锁定，等待签署。媒体仍可在下方查看。';

  @override
  String get roomPendingBody => '从物品清单开始。打开一件物品来添加照片和标记细节。';

  @override
  String get roomReviewBody => '打开每件物品检查细节并添加照片，然后将这个房间标记为已审核。';

  @override
  String get roomReviewedBody => '这个房间已审核。打开物品可更新细节或添加照片。';

  @override
  String get roomCapturingBody => '把每件物品加入清单，然后打开它来拍照和标记细节。';

  @override
  String get video => '视频';

  @override
  String photoNumber(int number) {
    return '照片 $number';
  }

  @override
  String videoNumber(int number) {
    return '视频 $number';
  }

  @override
  String fieldNone(String field) {
    return '无$field';
  }

  @override
  String fieldValue(String field, String value) {
    return '$field：$value';
  }

  @override
  String get atCheckInUpdatedPrefix => '入住时（已更新）：';

  @override
  String get atCheckInPrefix => '入住时：';

  @override
  String get fieldName => '名称';

  @override
  String get fieldSerial => '序列号';

  @override
  String get fieldReading => '读数';

  @override
  String get fieldNotes => '备注';

  @override
  String get openItem => '打开物品';

  @override
  String get deleteItem => '删除物品';

  @override
  String quantityShort(int count) {
    return '数量 $count';
  }

  @override
  String identifierLine(String value) {
    return '识别码  $value';
  }

  @override
  String readingLine(String value) {
    return '读数  $value';
  }

  @override
  String get attachedMedia => '附加的媒体';

  @override
  String markedPhotoNumber(int number) {
    return '已标记照片 $number';
  }

  @override
  String openAttachedTo(String label, String item) {
    return '打开附加到 $item 的$label';
  }

  @override
  String get backToMediaActions => '返回媒体操作';

  @override
  String get note => '说明';

  @override
  String get saveNote => '保存说明';

  @override
  String get itemNameRequired => '请输入物品名称，数量至少为 1。';

  @override
  String get editItem => '编辑物品';

  @override
  String get editItemDetail => '描述这件物品。在它的物品页面拍照。';

  @override
  String get condition => '状况';

  @override
  String get quantity => '数量';

  @override
  String get makeModelSerial => '品牌、型号或序列号';

  @override
  String get meterReading => '仪表读数';

  @override
  String get notes => '备注';

  @override
  String get hideRoomMedia => '隐藏现有的房间媒体';

  @override
  String get linkRoomMedia => '关联现有的房间媒体';

  @override
  String get finishUploadingBeforeLink => '请先完成这个房间的照片上传，再关联现有媒体。';

  @override
  String get linkRoomMediaDetail => '选择能佐证这一行物品的房间照片和视频。它们的说明和照片标记会一并保留。';

  @override
  String get noRoomMedia => '这个房间还没有媒体。';

  @override
  String get hasPhotoMarks => '有照片标记';

  @override
  String get saveChanges => '保存修改';

  @override
  String captureCheckFailed(String error) {
    return '无法检查已保存的媒体。$error';
  }

  @override
  String get captureAccountChanged => '账户已更改。请重新打开这个房间。';

  @override
  String get captureRoomNotLoaded => '这部手机还没有加载这个房间。请连接网络一次以打开它。';

  @override
  String captureSaveFailed(String error) {
    return '无法保存这张照片或这段视频。$error';
  }

  @override
  String captureAddFailed(String error) {
    return '无法添加这张照片或这段视频。$error';
  }

  @override
  String uploadPausedError(String error) {
    return '上传已暂停。$error';
  }

  @override
  String get mediaActions => '媒体操作';

  @override
  String get playVideo => '播放视频';

  @override
  String get markPhotoDetailShort => '圈出或指向细节';

  @override
  String get capturePhotoNotFoundNote => '找不到这张照片。请再试一次添加说明。';

  @override
  String get capturePhotoOpenFailed => '无法打开这张照片。请在连接网络后重试。';

  @override
  String get savePhoto => '保存照片';

  @override
  String get capturePhotoNotFoundMarks => '找不到这张照片。请再试一次标记。';

  @override
  String get captureNotFoundDelete => '找不到这张照片或这段视频。请再试一次删除。';

  @override
  String get captureWaitForSave => '请等待照片或视频保存完成。';

  @override
  String get captureNotUploaded => '部分照片、视频或修改尚未上传。有信号时请再试一次。';

  @override
  String captureReviewFailed(String error) {
    return '无法打开审核。$error';
  }

  @override
  String get captureMarksFailed => '照片已上传，但标记没有上传。请再试一次，或编辑标记。';

  @override
  String get finishMarking => '完成标记';

  @override
  String uploadSizeSuffix(String unit, String total, String totalUnit) {
    return ' $unit / $total $totalUnit';
  }

  @override
  String get roomMedia => '房间媒体';

  @override
  String atCheckInDate(String date) {
    return '入住时 · $date';
  }

  @override
  String get retryUploads => '重试上传';

  @override
  String atCheckInLine(String name, String condition, int count) {
    return '入住时：$name · $condition · 数量 $count';
  }

  @override
  String serialAtCheckIn(String value) {
    return '入住时的序列号/型号：$value';
  }

  @override
  String meterAtCheckIn(String value) {
    return '入住时的仪表读数：$value';
  }

  @override
  String checkInNotes(String value) {
    return '入住检查备注：$value';
  }

  @override
  String serialModel(String value) {
    return '序列号/型号：$value';
  }

  @override
  String meterReadingValue(String value) {
    return '仪表读数：$value';
  }

  @override
  String get editDetails => '编辑详情';

  @override
  String get photosAndVideo => '照片与视频';

  @override
  String get captureRoomIntro => '录制房间巡视视频，或管理现有的房间媒体。';

  @override
  String get captureItemIntro => '拍一张照片，添加标记，然后保存。照片会自动附加到这件物品。';

  @override
  String get captureOffline => '离线。照片和视频会保留在这部手机上，有信号时再上传。';

  @override
  String captureInterrupted(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '有 $count 张照片或视频',
      one: '有一张照片或一段视频',
    );
    return '$_temp0在保存时被中断。请不要卸载 Kivilo 或清除它的数据，以免丢失任何内容。';
  }

  @override
  String editsWaiting(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '有 $count 项修改',
      one: '有一项修改',
    );
    return '$_temp0等待上传。点按以再试一次。';
  }

  @override
  String get photos => '照片';

  @override
  String get recordVideo => '录制视频';

  @override
  String get takeAnotherPhoto => '再拍一张';

  @override
  String get takePhoto => '拍一张照片';

  @override
  String get chooseVideo => '选择视频';

  @override
  String get choosePhotos => '选择照片';

  @override
  String get itemMedia => '物品媒体';

  @override
  String get captureSavedFirst => '先保存在您的手机上，再加入报告';

  @override
  String get captureReviewWaits =>
      '这个房间的照片、视频和修改上传完成后，才能开始审核。等待信号时，您的媒体会一直保存在这部手机上。';

  @override
  String get done => '完成';

  @override
  String get reviewRoom => '审核房间';

  @override
  String get photoOnPhone => '手机上的照片';

  @override
  String get videoOnPhone => '手机上的视频';

  @override
  String get inTheReport => '已在报告中';

  @override
  String get uploadedUpdating => '已上传 · 正在更新报告';

  @override
  String get readyToMark => '可以标记';

  @override
  String get marksNeedAttention => '标记需要处理';

  @override
  String get uploadPaused => '上传已暂停';

  @override
  String get preparingUpload => '正在准备安全上传';

  @override
  String get uploading => '上传中';

  @override
  String get addingToRoom => '正在添加到房间';

  @override
  String get addingToItem => '正在添加到物品';

  @override
  String get uploadingNotes => '正在上传说明和标记';

  @override
  String get savedWaiting => '已安全保存 · 等待上传';

  @override
  String get photoNote => '照片说明';

  @override
  String get photoNoteDetail => '说明看照片的人应该注意什么。';

  @override
  String get photoNoteHint => '例如：水槽旁的缺口';

  @override
  String get disputeMoveIn => '对入住状况提出异议';

  @override
  String get disputeMoveInLabel => '您不同意哪一点？';

  @override
  String get disputeMoveInHelper => '您的理由会保留在这份注明日期的通知上。';

  @override
  String get recordDispute => '记录异议';

  @override
  String handPhoneTo(String name) {
    return '把手机交给 $name';
  }

  @override
  String acknowledgeInPersonBody(
    String name,
    String role,
    int number,
    String title,
  ) {
    return '$name（$role）已阅读更新记录 $number：$title。点按下方即表示记录对方已当面确认，并保存当时的时间和显示的确切内容。这不是对报告的新签名。';
  }

  @override
  String get acknowledgeUpdate => '我确认这项更新记录';

  @override
  String get disputeDeductions => '对扣款提出异议';

  @override
  String partyDisputesDeductions(String name) {
    return '$name 对扣款提出异议';
  }

  @override
  String get disputeDeductionsLabel => '对什么有异议？为什么？';

  @override
  String get disputeDeductionsHelper => '理由会记录在结算单旁边。';

  @override
  String agreeInPersonBody(String name, String role) {
    return '$name（$role）已阅读押金结算单。点按下方即表示记录对方已当面同意扣款，并保存当时的时间和显示的确切结算单。';
  }

  @override
  String get agreeDeductions => '同意扣款';

  @override
  String money(String amount) {
    return 'S\$$amount';
  }

  @override
  String get depositStatement => '押金结算单';

  @override
  String get deposit => '押金';

  @override
  String deductionsLine(int count, int total) {
    return '扣款（$total 项发现中有 $count 项由租客负责）';
  }

  @override
  String get toReturnToTenant => '应退还给租客';

  @override
  String get deductionsExceed => '扣款超出押金';

  @override
  String get answerAgreed => '已同意';

  @override
  String get answerDisputed => '有异议';

  @override
  String get answerNotYet => '尚未回复';

  @override
  String get inPersonSuffix => '（当面）';

  @override
  String get depositRecordsOnly => 'Kivilo 只记录每一方的回复，不会持有或转移押金。';

  @override
  String get recording => '记录中…';

  @override
  String get iAgreeDeductions => '我同意扣款';

  @override
  String get dispute => '提出异议';

  @override
  String inPersonParty(String role, String name) {
    return '当面：$role $name';
  }

  @override
  String get agrees => '同意';

  @override
  String get disputes => '有异议';

  @override
  String get report => '报告';

  @override
  String get propertyReport => '房产报告';

  @override
  String get signAsLandlord => '以房东身份签署';

  @override
  String get signAsTenant => '以租客身份签署';

  @override
  String signedByBoth(String date) {
    return '双方已签署 · $date';
  }

  @override
  String dateRange(String start, String end) {
    return '$start 至 $end';
  }

  @override
  String get inspected => '检查日期';

  @override
  String get notRecorded => '未记录';

  @override
  String byName(String name) {
    return '（$name）';
  }

  @override
  String get agreedAndSigned => '已约定并签署';

  @override
  String get notCountersigned => '尚未由双方签署。';

  @override
  String get updatesSinceSigning => '签署后的更新记录';

  @override
  String get updatesSinceSigningDetail =>
      '记录在已签署的报告旁边，不会改变报告。更新记录经确认后才生效。入住状况通知在房东接受后才生效。';

  @override
  String get reportFooter =>
      '本报告中的房间和物品，由检查人员根据录制的巡视视频撰写，并经上述人员同意。照片上若有标记，是检查人员为指出细节而画的；标记另行记录，照片本身没有被修改。';

  @override
  String get nothingRecordedInRoom => '这个房间没有记录任何内容。';

  @override
  String readingValue(String value) {
    return '读数：$value';
  }

  @override
  String roomPhoto(String room) {
    return '$room 的照片';
  }

  @override
  String areasMarked(int count) {
    return '标记了 $count 处';
  }

  @override
  String signatureOf(String name) {
    return '$name 的签名';
  }

  @override
  String signedOn(String date) {
    return '于 $date 签署';
  }

  @override
  String updatedOn(String date, int number) {
    return '$date 更新 · 更新记录 $number';
  }

  @override
  String get pendingAcknowledgement => '等待确认';

  @override
  String moveInConditionLine(String reported, String deadline) {
    return '租客入住状况 · $reported 报告 · 截止 $deadline';
  }

  @override
  String disputedByOn(String name, String date) {
    return '$name 于 $date 提出异议';
  }

  @override
  String get disputedNoticeKept => '这份通知会保留在报告上，但不计入退租检查所依据的约定状况。';

  @override
  String publishedByOn(String name, String date) {
    return '由 $name 于 $date 发布';
  }

  @override
  String conditionReported(String name) {
    return '报告的状况：$name';
  }

  @override
  String get itemFallback => '物品';

  @override
  String wasValue(String value) {
    return '原为：$value';
  }

  @override
  String fromRepairRecord(String title) {
    return '来自维修记录：$title';
  }

  @override
  String get agreePresentAtMoveIn => '我同意入住时已存在此情况';

  @override
  String assessmentVersionLine(int version, String date) {
    return '版本 $version，于 $date 发布。与上方已签署的物品清单分开。';
  }

  @override
  String liabilitySummary(int count, int total, String claim, String deposit) {
    return '$total 项发现中有 $count 项评定为租客负责，合计 S\$$claim，押金为 S\$$deposit。';
  }

  @override
  String get findingPhotos => '发现项照片';

  @override
  String openFindingPhoto(String name) {
    return '打开发现项照片：$name';
  }

  @override
  String maintenanceRecord(String title) {
    return '维修记录：$title';
  }

  @override
  String get findingPhoto => '发现项照片';

  @override
  String itemCount(int count) {
    return '$count 件物品';
  }

  @override
  String get findingAlreadySaved => '这项发现已经保存过。保存即可应用之后的修改。';

  @override
  String findingDraftSaveFailed(String error) {
    return '无法在这部手机上保存发现项草稿。$error';
  }

  @override
  String get chooseItemFirst => '请先选择一件物品。';

  @override
  String get describeChange => '请说明有什么变化以及原因。';

  @override
  String get costInvalid => '请输入费用，最多两位小数。';

  @override
  String get photoDraftNotReady => '请等待照片草稿准备好。';

  @override
  String get findingSavedOriginalItem =>
      '这项发现已针对原来的物品保存过。请选择该物品来保存最新内容，或舍弃这份草稿并添加另一项发现。';

  @override
  String get findingSavedDraftKept => '这项发现已经保存过。您最新的草稿已保留。请重新打开已保存的发现项来继续修改。';

  @override
  String get photoOpenRetry => '请连接网络后重试以打开这张照片。它的上传内容仍保留在这部手机上。';

  @override
  String get photoViewRetry => '请连接网络后重试以查看这张照片。';

  @override
  String get photoCaption => '照片说明';

  @override
  String get caption => '说明';

  @override
  String get saveCaption => '保存说明';

  @override
  String get discardDraftTitle => '要舍弃这份发现项草稿吗？';

  @override
  String get discardDraftBody => '草稿文字和新添加的照片将被移除。已保存的发现项照片会保留在其发现项中。';

  @override
  String get keepDraft => '保留草稿';

  @override
  String get discardDraft => '舍弃草稿';

  @override
  String get findingPhotosDetail => '为这项发现添加证据。原图会保留；标记另行保存在每张照片旁边。';

  @override
  String get takePhotoShort => '拍照';

  @override
  String get addFromGallery => '从相册添加';

  @override
  String get photoUploadPending => '照片等待上传';

  @override
  String get removingPhoto => '正在移除照片…';

  @override
  String get savedFinishMarking => '已保存在手机上 · 请完成标记';

  @override
  String get savedUploadFailed => '已保存在手机上 · 上传失败，连接网络后请重试。';

  @override
  String uploadingPercent(int percent) {
    return '上传中 $percent%…';
  }

  @override
  String get savingPhoto => '正在保存照片…';

  @override
  String get uploaded => '已上传';

  @override
  String get resumeMarking => '继续标记';

  @override
  String get removePhoto => '移除照片';

  @override
  String get chooseAnItem => '选择物品';

  @override
  String get addFinding => '添加发现项';

  @override
  String get reviewFinding => '审核发现项';

  @override
  String get items => '物品';

  @override
  String get searchItems => '搜索物品、房间或序列号';

  @override
  String get clear => '清除';

  @override
  String get atCheckOut => '退租时';

  @override
  String get chooseItemMissing => '适用于退租时已不在的物品。';

  @override
  String get chooseItemDetail => '根据照片和记录的状况选择物品。';

  @override
  String get allRooms => '所有房间';

  @override
  String get noItemsRecorded => '这份物品清单没有记录任何物品。';

  @override
  String get noMatchingItems => '没有符合的物品。试试其他房间、名称或序列号。';

  @override
  String get selectedItem => '已选物品';

  @override
  String get changeItem => '更换物品';

  @override
  String get hideItemDetails => '隐藏物品详情';

  @override
  String get showItemDetails => '显示物品详情';

  @override
  String get change => '变化';

  @override
  String get verdict => '判定';

  @override
  String get rationale => '理由';

  @override
  String get maintenanceMedia => '维修媒体';

  @override
  String get noLinkedMaintenance => '没有关联的维修记录';

  @override
  String get estimatedCost => '预计费用（新元）';

  @override
  String get removeFinding => '移除发现项';

  @override
  String get saveReviewedFinding => '保存已审核的发现项';

  @override
  String openSourcePhoto(String source) {
    return '打开$source的照片';
  }

  @override
  String openSourcePhotoNote(String source, String note) {
    return '打开$source的照片：$note';
  }

  @override
  String sourcePhoto(String source) {
    return '$source的照片';
  }

  @override
  String serialId(String value) {
    return '序列号/识别码：$value';
  }

  @override
  String quantityValue(int count) {
    return '数量：$count';
  }

  @override
  String meterValue(String value) {
    return '仪表：$value';
  }

  @override
  String checkInValue(String value) {
    return '入住时：$value';
  }

  @override
  String checkOutValue(String value) {
    return '退租时：$value';
  }

  @override
  String get alsoListedAtCheckOut => '退租清单中也有列出';

  @override
  String get noLinkedPhotos => '这件物品没有关联的照片记录。';

  @override
  String get photoFinishingUpload => '照片即将上传完成…';

  @override
  String get categoryPlumbing => '水管';

  @override
  String get categoryLocksmith => '锁匠';

  @override
  String get categoryElectrical => '电路';

  @override
  String get categoryAirCon => '冷气';

  @override
  String get categoryStructural => '结构';

  @override
  String get categoryPest => '虫害';

  @override
  String errorDraftSaved(String error) {
    return '$error 您的草稿已保存在这部手机上。';
  }

  @override
  String errorDraftNotSaved(String error) {
    return '$error 这部手机无法保存您的草稿。请不要关闭这个画面，再试一次。';
  }

  @override
  String get propertyItemOptional => '相关设备（选填）';

  @override
  String get noSpecificItem => '没有特定物品';

  @override
  String get priorityRoutine => '一般';

  @override
  String get priorityUrgent => '紧急';

  @override
  String get priorityDanger => '危险';

  @override
  String get immediateDanger => '如果有人身处紧急危险';

  @override
  String get immediateDangerDetail => '请先拨打警察 999 或民防部队消防/救护车 995，再在这里报告。';

  @override
  String get presentAtMoveIn => '我入住时就是这样';

  @override
  String get presentAtMoveInDetail => '报告后，请添加照片并记录入住状况。房东可以接受或提出异议。';

  @override
  String get shortTitle => '简短标题';

  @override
  String get whatHappened => '发生了什么？';

  @override
  String get whatHappenedHelper => '请写明问题从何时开始，以及您已经尝试过什么。';

  @override
  String get submitReport => '提交报告';

  @override
  String get recordMoveIn => '记录入住状况';

  @override
  String get recordMoveInBody =>
      '记录您入住时就已存在的情况。这会保存一份注明日期的通知，包含问题描述和所选照片。房东接受后，它才计入约定的状况。';

  @override
  String get itemInCheckIn => '入住检查中的物品';

  @override
  String get notInCheckIn => '入住检查中没有列出';

  @override
  String get itemName => '物品名称';

  @override
  String get itemCategory => '物品类别';

  @override
  String get conditionAtMoveIn => '入住时的状况';

  @override
  String get chooseCondition => '选择状况';

  @override
  String get photosToInclude => '要包含的照片';

  @override
  String beforePhoto(int number) {
    return '维修前照片 $number';
  }

  @override
  String uploadedOn(String date) {
    return '于 $date 上传';
  }

  @override
  String get recordCondition => '记录状况';

  @override
  String get recordCompletedRepair => '记录已完成的维修';

  @override
  String get whatWasRepaired => '修了什么？';

  @override
  String get costOptional => '费用（选填）';

  @override
  String get costHelper => '用于按约定分摊费用';

  @override
  String get costInvalidExample => '请输入金额，例如 150 或 150.50';

  @override
  String get addComment => '添加留言';

  @override
  String get closeWithoutAction => '不处理并关闭';

  @override
  String get closeReasonHint => '必须填写理由，双方都会看到。';

  @override
  String get whatIsStillWrong => '还有什么问题？';

  @override
  String get signInBeforeRecording => '记录状况前请重新登录。';

  @override
  String get photosNotUploadedMoveIn => '部分照片尚未上传。请将它们保留在这部手机上，并在记录入住状况前重试上传。';

  @override
  String get disputeMoveInHint => '请说明您不同意的地方。您的理由会保留在这份注明日期的通知上。';

  @override
  String reportedOn(String date) {
    return '于 $date 报告';
  }

  @override
  String reportedOnDeadline(String date, String deadline) {
    return '于 $date 报告 · 缺陷申报截止 $deadline';
  }

  @override
  String get moveInDetail =>
      '添加照片，然后将入住状况记录为一份注明日期的通知，放在已签署的入住检查旁边。房东可以接受或提出异议。已签署的报告保持不变。';

  @override
  String get addBeforePhotos => '添加维修前照片';

  @override
  String get addBeforePhotoFirst => '请至少添加一张已上传的维修前照片才能继续。';

  @override
  String get moveInAccepted => '房东已接受。已计入退租检查所依据的约定状况。';

  @override
  String get moveInDisputed => '房东有异议。保留为注明日期的通知，不计入约定状况。';

  @override
  String get moveInWaiting => '等待房东接受或对状况提出异议。';

  @override
  String get viewConditionNotice => '查看注明日期的状况通知';

  @override
  String get dangerCallFirst => '如果有人身处危险，请先拨打警察 999 或民防部队消防和救护车 995。';

  @override
  String get whatHappenedHeading => '发生了什么';

  @override
  String reportedByOn(String name, String date) {
    return '由 $name 于 $date 报告';
  }

  @override
  String get photosBeforeAfter => '维修前后';

  @override
  String get noPhotosYetRepair => '还没有照片。现在拍下问题，日后就少了争议。';

  @override
  String get history => '记录';

  @override
  String get historyDetail => '这项请求的所有动态';

  @override
  String get comment => '留言';

  @override
  String get waitingAcknowledge => '等待房东或中介受理';

  @override
  String get recordRepairWhenDone => '维修完成后请记录';

  @override
  String get waitingTenantRepair => '等待租客维修';

  @override
  String get waitingLandlordRepair => '等待房东维修';

  @override
  String get checkRepair => '检查维修并确认';

  @override
  String get waitingConfirm => '等待另一方确认维修';

  @override
  String get confirmedFixed => '已确认修好';

  @override
  String get closedWithoutRepair => '未维修即关闭';

  @override
  String get repair => '维修';

  @override
  String get acknowledgeReport => '受理报告';

  @override
  String get didRepairWork => '维修有效吗？';

  @override
  String get fixed => '已修好';

  @override
  String get notFixed => '未修好';

  @override
  String get addAfterPhoto => '添加维修后照片';

  @override
  String get addToReportAsUpdate => '作为更新记录加入报告';

  @override
  String repairedOn(String date) {
    return '于 $date 维修';
  }

  @override
  String repairedOnCost(String date, String cost) {
    return '于 $date 维修 · S\$$cost';
  }

  @override
  String get beforeRepair => '维修前';

  @override
  String get afterRepair => '维修后';

  @override
  String get receipt => '收据';

  @override
  String get couldNotLoadPull => '无法加载。请下拉刷新链接。';

  @override
  String get statusChanged => '状态已更改';

  @override
  String get repairRecorded => '已记录维修';

  @override
  String get repairScheduled => '已安排维修';

  @override
  String get reportedNotFixed => '报告未修好';

  @override
  String costProposal(String summary) {
    return '费用提议：$summary';
  }

  @override
  String get costProposalRejected => '费用提议被拒绝';

  @override
  String get costProposalWithdrawn => '费用提议已撤回';

  @override
  String get waitingForLandlord => '等待房东';

  @override
  String get waitingForTenant => '等待租客';

  @override
  String get acceptSplitTitle => '要接受这个分摊方式吗？';

  @override
  String get youAreAgreeingTo => '您同意的是';

  @override
  String get acceptSplitBody => '这将成为这项维修的约定。之后若要更改，需要提出新的提议并经双方接受。';

  @override
  String get accept => '接受';

  @override
  String get notAgreedYet => '尚未约定';

  @override
  String get agreedByBoth => '双方已约定';

  @override
  String get agreedChangeProposed => '已约定，有人提议更改';

  @override
  String get whoPays => '由谁支付';

  @override
  String get agreed => '已约定';

  @override
  String proposedBy(String name) {
    return '由 $name 提议';
  }

  @override
  String proposedAcceptedBy(String name, String other) {
    return '由 $name 提议，$other 接受';
  }

  @override
  String get answerNeeded => '需要您回复';

  @override
  String get waitingForAnswer => '等待回复';

  @override
  String partyProposes(String party) {
    return '$party提议';
  }

  @override
  String partyProposesChange(String party) {
    return '$party提议更改';
  }

  @override
  String get suggestDifferent => '提出其他方案';

  @override
  String get reject => '拒绝';

  @override
  String get withdrawProposal => '撤回提议';

  @override
  String get notAgreed => '未约定';

  @override
  String get changeNotAgreed => '提议的更改未获同意';

  @override
  String rejectedWhatProposed(String name, String proposer) {
    return '$name 拒绝了 $proposer 的提议';
  }

  @override
  String get theOtherSide => '另一方';

  @override
  String get agreeWhoPaysNow => '现在就约定由谁安排这项维修、由谁支付，免得退租时起争议。';

  @override
  String get proposeChange => '提议更改';

  @override
  String get makeNewProposal => '提出新的提议';

  @override
  String get proposeWhoPays => '提议由谁支付';

  @override
  String get repairCost => '维修费用';

  @override
  String get suggestDifferentSplit => '提出其他分摊方式';

  @override
  String get whoPaysQuestion => '由谁支付？';

  @override
  String get split => '分摊';

  @override
  String get fromMinorRepairCap => '取自这个租约的小额维修上限';

  @override
  String get landlordPaysAbove => '超出部分由房东支付';

  @override
  String get whoArranges => '由谁安排维修？';

  @override
  String get why => '原因？';

  @override
  String get basis => '依据';

  @override
  String get whyThisSplit => '为什么这样分摊？';

  @override
  String get explainSentence => '用一句话说明';

  @override
  String get otherSideSees => '另一方会连同您的提议一起看到这段说明';

  @override
  String get clauseOptional => '合约条款（选填）';

  @override
  String get clauseHint => '例如：第 5(c) 条';

  @override
  String get theyReadCounter => '对方看到的反提议是';

  @override
  String get theyRead => '对方看到的是';

  @override
  String get sendProposal => '发送提议';

  @override
  String get rejectProposalTitle => '拒绝这个提议';

  @override
  String get youAreRejecting => '您拒绝的是';

  @override
  String get whyNot => '为什么不同意？';

  @override
  String get whyNotHint => '必填。另一方会看到。';

  @override
  String photoOpenFailed(String error) {
    return '无法打开这张照片。$error';
  }

  @override
  String marksSaveFailed(String error) {
    return '无法保存标记。$error';
  }

  @override
  String redrawMark(int number) {
    return '重新绘制标记 $number。';
  }

  @override
  String get markCircleHelp => '用手指在问题周围画一圈，Kivilo 会把它整理成圆圈。';

  @override
  String get markArrowHelp => '从空白处向问题处画。点按现有标记即可编辑。';

  @override
  String get markFreehandHelp => '直接在细节上画。您手绘的线条会保留在您画的位置。';

  @override
  String get markCircle => '圆圈';

  @override
  String get markArrow => '箭头';

  @override
  String get markFreehand => '手绘';

  @override
  String get undo => '撤销';

  @override
  String get redo => '重做';

  @override
  String markNumber(int number) {
    return '标记 $number';
  }

  @override
  String marksOfMax(int count) {
    return '$count/12 个标记';
  }

  @override
  String addNoteToMark(int number) {
    return '为标记 $number 添加说明';
  }

  @override
  String editMark(int number) {
    return '编辑标记 $number';
  }

  @override
  String get markNoteNew => '说明这个标记指的是什么。';

  @override
  String get markNoteEdit => '更新说明、重新绘制位置，或将其移除。';

  @override
  String get markNoteHint => '例如：插座上方的细裂缝';

  @override
  String get saveMark => '保存标记';

  @override
  String get redraw => '重新绘制';

  @override
  String get photoSavedWillUpload => '照片已保存在这部手机上。Kivilo 会在可以时上传。';

  @override
  String get updateNeedsTitle => '发布前请为更新记录加上标题。';

  @override
  String get updateNeedsChange => '发布前请至少添加一项变更。';

  @override
  String get updatePhotosWaiting => '部分照片仍在这部手机上。请等待上传完成后再发布。';

  @override
  String get publishUpdateTitle => '要发布这项更新记录吗？';

  @override
  String get publishUpdateBody => '发布后无法再修改，房东和租客会被要求确认。';

  @override
  String get discardUpdateTitle => '要舍弃这份草稿吗？';

  @override
  String get discardUpdateBody => '其中的变更和已上传的照片将被删除。已发布的更新记录不受影响。';

  @override
  String get discard => '舍弃';

  @override
  String get updatesIntro =>
      '将签署后的变化（例如更换了电器）记录为一份注明日期的更新记录。已签署的报告保持不变；房东和租客都确认后，更新记录才生效。';

  @override
  String get published => '已发布';

  @override
  String get publishedDetail => '打开报告即可展示，或当面收取确认。';

  @override
  String updateNumberTitle(int number, String title) {
    return '更新记录 $number：$title';
  }

  @override
  String get startUpdate => '开始更新记录';

  @override
  String get resolvedRepairs => '已解决的维修';

  @override
  String get resolvedRepairsDetail => '每一项都可以连同维修前后的照片开始一项变更。';

  @override
  String get draftUpdate => '更新记录草稿';

  @override
  String get draftUpdateDetail => '在您发布前，其他人看不到。';

  @override
  String get title => '标题';

  @override
  String get reason => '原因';

  @override
  String dateOfChange(String date) {
    return '变更日期：$date';
  }

  @override
  String get saveDetails => '保存详情';

  @override
  String get addChange => '添加变更';

  @override
  String get workingEllipsis => '处理中…';

  @override
  String get publishUpdate => '发布更新记录';

  @override
  String get publishFreezes => '发布后更新记录将被锁定，并请房东和租客确认。';

  @override
  String fromRepair(String title) {
    return '来自维修：$title';
  }

  @override
  String photosWaitingUpload(int count) {
    return '$count 张照片已保存在这部手机上，等待上传';
  }

  @override
  String get choosePhoto => '选择照片';

  @override
  String get chooseRoom => '请选择房间。';

  @override
  String get chooseItemReplaced => '请选择要更换或移除的物品。';

  @override
  String get nameNewItem => '请填写新物品的名称。';

  @override
  String get editChange => '编辑变更';

  @override
  String get changeAdded => '新增';

  @override
  String get changeReplaced => '更换';

  @override
  String get changeRemoved => '移除';

  @override
  String get itemItChanges => '变更的物品';

  @override
  String get whichItem => '哪件物品？';

  @override
  String get newItem => '新物品';

  @override
  String get newItemHint => '例如：洗碗机';

  @override
  String get makeModelAndSerial => '品牌、型号和序列号';

  @override
  String get addChangeShort => '添加变更';

  @override
  String get saveChange => '保存变更';

  @override
  String photoPrepareFailed(String error) {
    return '无法准备照片。$error';
  }

  @override
  String photoAddFailed(String error) {
    return '无法添加照片。$error';
  }

  @override
  String get photoSavedUploaded => '照片已保存并上传。';

  @override
  String get photoSavedRetry => '照片已保存在这部手机上。Kivilo 会自动重试。';

  @override
  String get beforePhotos => '维修前照片';

  @override
  String get afterPhotos => '维修后照片';

  @override
  String get addPhotosCamera => '用手机相机添加照片';

  @override
  String get addPhotosCameraDetail => '使用手机自带的相机，或选择您已经拍好的照片。';

  @override
  String get chooseExistingPhoto => '选择现有照片';

  @override
  String get drawSignatureFirst => '请先签名。';

  @override
  String get uploadBeforeSigning => '部分照片、视频或修改尚未上传。请返回各房间点按“重试上传”，再让任何一方签署。';

  @override
  String roleSignature(String role) {
    return '$role签名';
  }

  @override
  String get ownSignatureConfirms => '您的签名确认，您刚阅读的报告记录了房产交接时的状况。';

  @override
  String get partySignatureConfirms => '请在对方签署前与他一起查看约定的物品清单。对方的签名即确认报告内容如所显示。';

  @override
  String get useThisSignature => '使用这个签名';

  @override
  String get drawNewOne => '重新签名';

  @override
  String get clearSignature => '清除签名';

  @override
  String get saveForNextTime => '保存以便下次使用';

  @override
  String get saveForNextTimeDetail => '只保存在这部手机上，退出登录时会被移除。';

  @override
  String get confirmSignature => '确认签名';

  @override
  String get propertyHistory => '房产记录';

  @override
  String get timelineEyebrow => '房产时间线';

  @override
  String get timelineDetail => '已签署的报告、维修和约定的费用，最新的在前。';

  @override
  String get timelineEmpty => '这里还没有任何定案的内容。已签署的报告和维修会在发生时显示。';

  @override
  String get amountInvalid => '请输入有效的新元金额';

  @override
  String get renewTenancy => '续租';

  @override
  String sameParties(String tenant) {
    return '同一房东和租客 · $tenant';
  }

  @override
  String startsOn(String date) {
    return '开始 $date';
  }

  @override
  String endsOn(String date) {
    return '结束 $date';
  }

  @override
  String get renewalConfirm => '请先与双方确认这些条款。这会为同一房产创建新的租约和一份入住检查草稿。';

  @override
  String keepSharingRenewal(String names) {
    return '继续与 $names 共享这次续租';
  }

  @override
  String get renewalPrivate => '不勾选则新租约保持私密。';

  @override
  String get createRenewal => '创建续租入住检查';

  @override
  String get brandingIntro => '显示在您准备的每份 PDF 和共享报告的顶部。房东和租客都会看到；报告已签署的内容不会改变。';

  @override
  String get logo => '标志';

  @override
  String get logoDetail => 'PNG 或 JPEG，显示在左上角';

  @override
  String get choose => '选择';

  @override
  String get replace => '替换';

  @override
  String get removeLogo => '移除标志';

  @override
  String get yourName => '您的名字';

  @override
  String get agencyName => '中介公司名称';

  @override
  String get agencyLicenceOptional => '中介公司执照（选填）';

  @override
  String get ceaOptional => '您的 CEA 注册号（选填）';

  @override
  String get phoneOptional => '电话（选填）';

  @override
  String get partnerPipewell => '漏水、排水管堵塞、热水器';

  @override
  String get open24Hours => '24 小时营业';

  @override
  String get partnerFernvale => '爆管、马桶、水龙头和混水阀';

  @override
  String get daily8to10 => '每天早上 8 点至晚上 10 点';

  @override
  String get partnerHalcyon => '开锁、换锁、电子锁';

  @override
  String get partnerKeyline => '大门锁、配钥匙、保险箱';

  @override
  String get monSat9to7 => '星期一至六，早上 9 点至晚上 7 点';

  @override
  String get policeEmergency => '警察紧急热线';

  @override
  String get fireAmbulance => '消防或救护车';

  @override
  String get kiviloPartners => 'Kivilo 合作伙伴';

  @override
  String get kiviloPartnersDetail => '与我们合作的水管工和锁匠';

  @override
  String get bookingSoon => '即将开放通过 Kivilo 预约。';

  @override
  String get guideTitle => '交接三步走';

  @override
  String get guideDetail => '点按任一步骤查看简单说明。';

  @override
  String get guideStep1 => '记下您看到的';

  @override
  String get guideStep1Short => '从房间物品清单开始。';

  @override
  String get guideStep1Body =>
      '打开一个房间，检查预设的物品。添加、编辑或移除各行，使清单与实际相符，并记录每件物品的状况。退租检查时，可对照清单旁边约定的入住检查。';

  @override
  String get guideStep2 => '拍下细节';

  @override
  String get guideStep2Short => '打开物品，拍下它的状况。';

  @override
  String get guideStep2Body =>
      '打开一件物品，拍下磨损、损坏、仪表读数和序列号标签。每张照片都可以标记，保存后会附加到该物品。整个房间的照片或视频，请使用“房间媒体与巡视录像”。拍摄的内容会保留在您的手机上，直到上传完成。检查每件物品后审核房间；如果房间没有物品，请确认没有需要记录的内容。';

  @override
  String get guideStep3 => '约定并签署';

  @override
  String get guideStep3Short => '双方共享的一份记录。';

  @override
  String get guideStep3Body =>
      '等所有拍摄内容上传完成，再发送签署。发送后物品清单会被锁定。房东和租客可以在您的手机上签署，或通过电邮收到的链接签署。双方签署后，PDF 即可使用。';

  @override
  String get handoverTitle => '您在 Kivilo 的租约';

  @override
  String handoverLoadFailed(String error) {
    return '无法加载交接资料。$error';
  }

  @override
  String get retry => '重试';

  @override
  String get handoverAfterSigning => '租客签署入住检查后，才能进行租客交接。';

  @override
  String get handoverScan => '用手机扫描，并以自己的身份登录，即可查看您的租约并报告问题。';

  @override
  String get handoverQrLabel => '租客登录链接的二维码';

  @override
  String get handoverNoDefectPeriod => '这个租约没有启用入住缺陷申报期。您仍可报告维修。';

  @override
  String handoverDefectDeadline(String date) {
    return '请在 $date（新加坡时间）前申报入住时就已存在的任何问题。';
  }

  @override
  String get handoverLinkCopied => '已复制租客登录链接';

  @override
  String get handoverCopyLink => '复制登录链接';

  @override
  String get updateTag => '更新';

  @override
  String openCheckInPhoto(int number) {
    return '打开入住检查照片 $number';
  }

  @override
  String get nothingAtCheckIn => '入住检查时这个房间没有记录任何内容。';

  @override
  String get openFullCheckIn => '打开完整的入住检查';

  @override
  String get renewalRemindersFailed => '无法加载续租提醒。请下拉再试一次。';

  @override
  String get renewalDue => '需要续租';

  @override
  String get dismissRenewal => '关闭续租提醒';

  @override
  String tenancyEnds(String tenant, String date) {
    return '$tenant · 租约于 $date 结束';
  }

  @override
  String get startRenewal => '开始续租';

  @override
  String get notRenewing => '不续租';

  @override
  String get remindWeek => '一周后提醒我';

  @override
  String get videoLoadFailed => '无法加载这段视频。请检查网络连接后再试一次。';

  @override
  String get pause => '暂停';

  @override
  String get play => '播放';

  @override
  String get noNotifications => '还没有通知。';

  @override
  String get accountChangedPage => '账户已更改。请重新打开这个页面。';

  @override
  String get noResponse => 'Kivilo 没有回应。请检查信号后再试一次。您拍摄的内容都已保存在这部手机上。';

  @override
  String get uploadingMedia => '正在上传 Kivilo 媒体';

  @override
  String get kiviloMedia => 'Kivilo 媒体';

  @override
  String get signInBeforeFindingPhotos => '添加发现项照片前请重新登录。';

  @override
  String get photoDraftDiscarded => '这份照片草稿已被舍弃。请舍弃本机草稿后重新开始。';

  @override
  String get findingSavedReopen => '这项发现已保存。请重新打开它来添加更多照片。';

  @override
  String get finishRecoveringCamera => '请先完成恢复上一次的相机选择，再拍另一张照片。';

  @override
  String get chooseImageFormat => '请选择 JPEG、PNG 或 WebP 照片。您的选择已保留；请重试或舍弃这份草稿。';

  @override
  String get waitPhotosSaved => '请等待照片保存在这部手机上。';

  @override
  String get finishFindingPhotos => '保存前请完成发现项照片的标记和上传。您的草稿仍保存在这部手机上。';

  @override
  String get connectRetryDiscard => '请连接网络后重试舍弃。您的照片和草稿仍保存在这部手机上。';

  @override
  String get fileMissing => '这张照片或这段视频的文件已不在这部手机上。';

  @override
  String get inventoryLinkFailed => '照片已上传，但无法保存它与物品清单的关联。照片和物品仍保存在这部手机上。';

  @override
  String get photoFormatUnsupported =>
      '这张照片的格式 Kivilo 无法保存。请重新拍摄，或选择 JPEG 或 PNG 照片。';

  @override
  String get photoStillSaving => '仍有照片正在这部手机上保存。请保留这份草稿并重试。';

  @override
  String get photoSelectionRecovery => '仍有照片选择需要恢复。保存前请重试或舍弃这份草稿。';

  @override
  String get ok => '确定';

  @override
  String get planFree => '免费';

  @override
  String get agencyErrPartyAsAgent => '房东或租客不能被指派为自己租约的中介。';

  @override
  String get agencyErrAlreadyInTeam => '已分配给团队的租约不能移到另一个团队。';

  @override
  String get agencyErrInvitationPending => '已有一份待接受的邀请。如有需要，请使用“重新发送邀请”。';

  @override
  String get agencyErrChooseLead => '请选择负责中介。';

  @override
  String get agencyErrChooseTeam => '分配团队成员前请先选择团队。';

  @override
  String get agencyErrChooseActive => '请选择这个团队的已加入的成员。';

  @override
  String get agencyErrChooseSuccessor => '请选择一名已加入的团队成员接手此人的房产。';

  @override
  String get agencyErrLastOwner => '移除最后一名所有者前，请先将另一名已加入的成员设为所有者。';

  @override
  String get agencyErrOwnerDeletion => '申请删除账户前，请先为您拥有的每个团队另设一名所有者。';

  @override
  String get agencyErrOwnerOnly => '只有团队所有者可以更改所有权。';

  @override
  String get agencyErrLeadIsParty => '新的负责中介不能是这些租约中任何一个的房东或租客。';

  @override
  String get agencyErrInvitationExpired => '此邀请已过期。请让团队经理重新发送。';

  @override
  String get agencyErrAlreadyJoined => '此人已经加入团队。';

  @override
  String get agencyErrTeamWideAccess => '此人作为所有者或经理拥有整个团队的访问权限。请更改其团队角色来移除该权限。';

  @override
  String get agencyErrAlreadyMember => '此人已经是团队成员。';

  @override
  String get agencyErrMustAccept => '这名团队成员需要先接受邀请，才能被分配工作。';

  @override
  String get agencyErrTeamChanged => '这个租约的团队已更改。请刷新后再试一次。';

  @override
  String get agencyErrUseRemove => '请使用“移除成员”来移除已加入的团队成员。';

  @override
  String get agencyErrWaitAccept => '请等邀请被接受后再更改这个角色。';

  @override
  String get showing => '显示';

  @override
  String get allMyWork => '我的全部工作';

  @override
  String get homesIOwn => '我出租的住宅';

  @override
  String get whereYouAreTheLandlord => '你是房东的房产';

  @override
  String get homesIRent => '我租住的住宅';

  @override
  String get whereYouAreTheTenant => '你是租客的房产';

  @override
  String get theseTermsReferToAPreviousAgreement => '这些条款来自先前的协议。请复核最新文件以更新条款。';

  @override
  String get hideSourceClause => '隐藏条款原文';

  @override
  String get showSourceClause => '查看原文条款';

  @override
  String get retake => '重拍';

  @override
  String get whatShouldTheViewerNotice => '希望查看者留意什么？';

  @override
  String get photoRemoved => '照片已移除';

  @override
  String get photoDeleted => '照片已删除';

  @override
  String get flash => '闪光灯';

  @override
  String get switchCamera => '切换相机';

  @override
  String get retryCamera => '重新启动相机';

  @override
  String get takeTheReplacementPhoto => '拍摄替换照片';

  @override
  String get tapAPhotoToMarkItOr => '点按照片以添加标记或备注';

  @override
  String get theLeadAgent => '主要中介';

  @override
  String get theResponsibleAgentOrATeamOwner => '负责中介或团队所有者或经理';

  @override
  String get roomPhotos => '房间照片';

  @override
  String get takeRoomWidePhotosOrManageExisting => '拍摄房间全景或管理已有照片。';

  @override
  String get takeMorePhotos => '继续拍照';

  @override
  String get takePhotos => '拍照';

  @override
  String get noPhotosOfThisItemYet => '此物品暂无照片。';

  @override
  String get reviewOpensOnceThisRoomsPhotosAnd =>
      '此房间的照片和更改上传后，即可复核。等待网络信号期间，媒体文件会保存在此手机上。';

  @override
  String get couldNotOpenThisProperty => '未能打开此房产';

  @override
  String get recentlyDeleted => '最近删除';

  @override
  String get offlineShowingWhatWasLastLoaded => '当前离线，显示上次载入的内容。';

  @override
  String get reportsAndDocuments => '报告和文件';

  @override
  String get earlierTenancy => '以往租约';

  @override
  String get thisTenancysReportsDetailsAndPaperwork => '本租约的报告、详情及文件';

  @override
  String get more => '更多';

  @override
  String get whatHappenedHereOverTheYearsReports => '历年记录，包括报告、更新和维修';

  @override
  String get changeLog => '变动记录';

  @override
  String get whoChangedWhatInKiviloAndWhen => '查看谁在何时作了哪些更改';

  @override
  String get manageWhoCanWorkOnThisTenancy => '管理谁可以处理此租约';

  @override
  String get restoreOrDeleteProperty => '恢复或删除房产';

  @override
  String get archiveOrDeleteProperty => '归档或删除房产';

  @override
  String get returnItToActiveWorkOrMove => '恢复使用或移至回收站';

  @override
  String get returnItToActiveProperties => '将其移回使用中的房产';

  @override
  String get removeItFromActiveWorkOrMove => '从当前工作中移除，或移到回收站';

  @override
  String get kiviloEmailsThemAShortIdentityForm =>
      'Kivilo 会通过电邮发送身份资料表，对照制裁和政治公众人物名单进行筛查，并保存记录。CEA 要求在签署租约前完成此项审查。';

  @override
  String get verify => '验证';

  @override
  String get checkOutLabel => '退租检查';

  @override
  String get checkInLabel => '入住检查';

  @override
  String get tenancyDetails => '租约详情';

  @override
  String get landlordEmailNotProvided => '尚未提供房东电邮';

  @override
  String get tenantEmailNotProvided => '未提供租客电邮';

  @override
  String get peopleDatesRentAndDeposit => '双方资料、日期、租金和押金';

  @override
  String get documents => '文件';

  @override
  String get tenancyAgreementAndSupportingFiles => '租赁协议和佐证文件';

  @override
  String get editPropertyAsset => '编辑房产资产';

  @override
  String get retireAsset => '停用资产';

  @override
  String get retireThisAsset => '要停用这项资产吗？';

  @override
  String get couldNotLoadRepairsAndAssets => '未能载入维修和资产';

  @override
  String get request => '个请求';

  @override
  String get requests => '个请求';

  @override
  String get opening => '正在打开…';

  @override
  String get reviewRepairTerms => '复核维修条款';

  @override
  String get noMaintenanceReported => '尚无报修记录';

  @override
  String get theUpdateIsDownloadedAndWillTake =>
      '更新已下载，将于下次启动 Kivilo 时生效。你现在可以继续工作。';

  @override
  String get aKiviloUpdateIsAvailableDownloadIt =>
      '有 Kivilo 更新可用。您可以立即下载，也可以先继续工作，稍后再更新。';

  @override
  String get labelContinue => '继续';

  @override
  String get notNow => '暂时不用';

  @override
  String get theResponsibleAgentOrATeamOwnerLabel => '每份租约的负责中介或团队所有者或经理';

  @override
  String get propertyActions => '房产操作';

  @override
  String get tenancy => '份租约';

  @override
  String get tenancies => '份租约';

  @override
  String get inspectionLabel => '次检查';

  @override
  String get inspections => '次检查';

  @override
  String get photoWord => '照片';

  @override
  String get photosLabel => '张照片';

  @override
  String get propertyRecovery => '恢复房产';

  @override
  String get takeSeveralPhotosThenMarkThemOr => '可连续拍摄多张照片，再添加标记或备注。原始照片始终保留。';

  @override
  String get gallery => '相册';

  @override
  String get resume => '继续';

  @override
  String get mark => '标注';

  @override
  String get deletePhoto => '删除照片';

  @override
  String get deleteFinding => '删除检查发现';

  @override
  String get couldNotOpenThisRenewal => '未能打开此续租记录';

  @override
  String get startWithTheRoomsFromTheLast => '沿用上次入住检查的房间';

  @override
  String get namesOnlyTheNewCheckInRecords => '只沿用房间名称。此次入住检查会另行记录房况。';

  @override
  String get whereYouWork => '你的工作地点';

  @override
  String get loadingLabel => '正在载入…';

  @override
  String get notChosenYet => '尚未选择';

  @override
  String get member => '名成员';

  @override
  String get members => '名成员';

  @override
  String get createOrJoinTeam => '创建或加入团队';

  @override
  String get addAnotherTeam => '添加另一个团队';

  @override
  String get couldNotLoadTeamsTapToTry => '未能载入团队。点按重试。';

  @override
  String get invitation => '份邀请';

  @override
  String get invitations => '份邀请';

  @override
  String get createATeamOrAcceptAnInvitation => '创建团队或接受邀请';

  @override
  String get personalReportBranding => '个人报告品牌资料';

  @override
  String get usedForPropertiesOutsideYourTeams => '适用于团队以外的房产。';

  @override
  String get yourActivePropertyAllowance => '你可管理的使用中房产数。';

  @override
  String get howAHandoverWorks => '交接步骤';

  @override
  String get captureWriteTheInventoryThenSign => '拍照、填写清单并签署';

  @override
  String get termsOfService => '服务条款';

  @override
  String get theTermsForUsingKivilo => '使用 Kivilo 的条款';

  @override
  String get anAppleSubscriptionContinuesUntilYouCancel =>
      'Apple 订阅会持续，直到您在 Apple 账户中取消。删除 Kivilo 账户不会取消该订阅。';

  @override
  String get manageAppStoreSubscriptions => '管理 App Store 订阅';

  @override
  String get couldNotLoadProperties => '未能载入房产';

  @override
  String get showAllMyWork => '显示我的全部工作';

  @override
  String get yourPropertiesAndTheirCurrentStatus => '你的房产及其当前状态。';

  @override
  String get searchProperties => '搜索房产';

  @override
  String get addressTenantOrStage => '地址、租客或阶段';

  @override
  String get property => '处房产';

  @override
  String get properties => '处房产';

  @override
  String get found => '项结果';

  @override
  String get nothingInRecentlyDeleted => '最近删除中没有项目';

  @override
  String get noArchivedProperties => '没有已归档的房产';

  @override
  String get noMatchingProperties => '没有相符的房产';

  @override
  String get tryAnotherAddressOrTenantOrChange => '请尝试其他地址或租客姓名，或更改筛选条件。';

  @override
  String get plansBilling => '方案与付款';

  @override
  String get seat => '个席位';

  @override
  String get seats => '个席位';

  @override
  String get accessUntil => '可使用至';

  @override
  String get currentPeriodEnds => '本期结束日期';

  @override
  String get askYourTeamOwnerOrManagerAbout => '请向团队拥有者或管理员查询此方案。';

  @override
  String get thisPlanWasPurchasedOnTheKivilo => '此方案通过 Kivilo 网站购买，也可在应用中使用。';

  @override
  String get proForYourPersonalWork => '个人工作用 Pro';

  @override
  String get yourAppleAccountCanSubscribeForOne =>
      '除个人方案外，您的 Apple 账户还可以为一个团队订阅方案，最多可供 20 人使用。';

  @override
  String get seatsLabel => '席位';

  @override
  String get moreSeatsTakeEffectImmediatelyFewerSeats =>
      '增加席位会立即生效，减少席位则在续订时生效。Apple 会在您同意前确认价格和生效时间。';

  @override
  String get aSeatChangeReplacesThisSubscriptionImmediately =>
      '更改席位会立即替换此订阅。Google Play 会折算剩余期限，并在您同意前显示下次付款日期。';

  @override
  String get restorePurchases => '恢复购买项目';

  @override
  String get paymentIsChargedToYourAppleAccount =>
      '确认后款项将从您的 Apple 账户扣除。若要避免下次扣款，请至少在续订前 24 小时于 App Store 的订阅设置中取消。删除 Kivilo 或 Kivilo 账户不会取消 Apple 订阅。';

  @override
  String get termsOfUse => '使用条款';

  @override
  String get couldNotLoadNotifications => '未能载入通知';

  @override
  String get noNotificationsYet => '暂无通知';

  @override
  String get repairTerms => '维修条款';

  @override
  String get couldNotOpenThisAgreement => '未能打开此租约文件';

  @override
  String get checkTheClauseAgainstTheAgreementBefore => '确认维修条款前，请与租约原文核对。';

  @override
  String get openAgreement => '打开租约文件';

  @override
  String get clausesToReview => '待核对的条款';

  @override
  String get selectAClauseToFillInThe => '选择条款以填写下方详情';

  @override
  String get noClauseWasFoundInTheReadable => '可读取的文字中未找到条款。请打开租约，在下方输入条款原文。';

  @override
  String get sourcePage => '原文页码';

  @override
  String get clauseText => '条款原文';

  @override
  String get repairRule => '维修规则';

  @override
  String get firstAmount => '先行承担的金额';

  @override
  String get anotherRule => '其他规则';

  @override
  String get tenantPaysTheFirst => '租客先承担';

  @override
  String get explainTheRepairRule => '说明维修规则';

  @override
  String get notesAndExceptionsOptional => '备注和例外（选填）';

  @override
  String get confirmRepairTerms => '确认维修条款';

  @override
  String get somethingElse => '其他';

  @override
  String get itemOptional => '物品（选填）';

  @override
  String get whichItemOptional => '哪项物品？（选填）';

  @override
  String get forExampleToiletBowl => '例如：马桶';

  @override
  String get restored => '已恢复。';

  @override
  String get everyChangeAndDeletionWithWhoMade =>
      '查看每项变动和删除记录以及经手人。删除的房间、清单项目、照片和检查发现可在 30 天内恢复。';

  @override
  String get allChanges => '所有变动';

  @override
  String get deletions => '删除记录';

  @override
  String get offlineShowingPreviouslyLoadedHistory => '当前离线，显示之前载入的历史记录。';

  @override
  String get historyIsRecordedFrom23October2026 => '历史记录始于 2026 年 10 月 23 日。';

  @override
  String get nothingHasBeenDeleted => '尚无删除记录。';

  @override
  String get noChangesRecordedYet => '尚无变动记录。';

  @override
  String get restoredLabel => '已恢复';

  @override
  String get restoring => '正在恢复…';

  @override
  String get restore => '恢复';

  @override
  String get thisRemovesItFromTheRoomAnd =>
      '这会从房间及关联的物品移除照片。可在 30 天内从房产的更改记录恢复。';

  @override
  String get line => '项';

  @override
  String get lines => '项';

  @override
  String get setCondition => '设置状况';

  @override
  String get thisRemovesTheLineFromTheInventory =>
      '这会从物品清单移除该条目。可在 30 天内从房产的更改记录恢复。';

  @override
  String get somePhotosOrChangesInThisRoom =>
      '此房间的部分照片或更改尚未上传。请打开相关物品或房间照片，完成照片标记并重试上传后再继续。';

  @override
  String get itsPhotosVideosAndInventoryWillBe =>
      '房间的照片、视频和物品清单将一并移除。您可在 30 天内从房产的变动记录恢复房间。';

  @override
  String get couldNotOpenThisRoom => '未能打开此房间';

  @override
  String get select => '选择';

  @override
  String get tapLinesToSelectThem => '点按要选择的项目';

  @override
  String get noItemsRecordedLabel => '尚未记录物品';

  @override
  String get addAnItemToRecordItsCondition => '添加物品以记录状况和照片。';

  @override
  String get noPhotosOrVideosRecorded => '尚未记录照片或视频';

  @override
  String get checkEveryItemAgainstThePhotosYour =>
      '对照照片核对每项物品。核对完成后，此房间即可列入报告。';

  @override
  String get worthCheckingBeforeYouReview => '复核前值得留意的事项';

  @override
  String get thisInventoryIsFixedForSigningYou => '物品清单已锁定待签署。你仍可查看照片和视频。';

  @override
  String get duplicate => '复制';

  @override
  String get couldNotOpenThisRepair => '未能打开此维修记录';

  @override
  String get usedWithYourNameOnReportsFor => '个人房产报告会显示此资料及你的姓名。团队房产使用团队品牌。';

  @override
  String get officePhoneOptional => '办公室电话（选填）';

  @override
  String get editReportBranding => '编辑报告品牌资料';

  @override
  String get aTeamOwner => '团队所有者';

  @override
  String get aTeamOwnerOrManager => '团队所有者或经理';

  @override
  String get teamDetails => '团队详情';

  @override
  String get theTeamIdentityShownOnItsReports => '团队报告中显示的团队身份。';

  @override
  String get addAgencyLicenceAndLogo => '添加地产代理公司执照编号和标志';

  @override
  String get propertyAssignments => '房产分工';

  @override
  String get couldNotLoadTheTimeline => '未能载入时间线';

  @override
  String get chooseAProperty => '选择房产';

  @override
  String get couldNotLoadYourProperties => '未能载入您的房产';

  @override
  String get search => '搜索';

  @override
  String get addressPostalCodeOrLastTenant => '地址、邮编或上一位租客';

  @override
  String get noPropertyMatches => '没有相符的房产。';

  @override
  String get paymentProof => '付款凭证';

  @override
  String get requestAnotherDocument => '索取其他文件';

  @override
  String get askTheTenantForAnOptionalSupporting => '向租客索取一份非必需的补充文件。';

  @override
  String get document => '文件';

  @override
  String get requesting => '正在发送请求…';

  @override
  String get requestLabel => '请求';

  @override
  String get photoSavedOnThisPhoneItWill => '照片已保存在这台手机上，重新连线后会自动上传。';

  @override
  String get couldNotLoadDocuments => '未能载入文件';

  @override
  String get hideOtherDocuments => '隐藏其他文件';

  @override
  String get otherDocuments => '其他文件';

  @override
  String get optionalSupportingFilesForThisTenancy => '此租约的补充文件（选填）';

  @override
  String get noOtherDocumentsRequested => '尚未索取其他文件。';

  @override
  String get privateToTheTenantLandlordAndAgents => '仅限本租约的租客、房东及获授权的经纪查看。';

  @override
  String get tenancyAgreement => '租赁协议';

  @override
  String get keepTheSignedAgreementWithThisProperty => '将已签署的租约存入此房产的记录。';

  @override
  String get yourAgreementAndReviewedRepairTerms => '你的租赁协议及已复核的维修条款。';

  @override
  String get yourAgreementForThisTenancy => '本租约的协议。';

  @override
  String get currentAgreement => '当前租约文件';

  @override
  String get hidePreviousAgreements => '隐藏旧版租约文件';

  @override
  String get previousAgreements => '旧版租约文件';

  @override
  String get uploadPdfInBrowser => '在浏览器中上传 PDF';

  @override
  String get reviewMaintenanceClause => '复核维修条款';

  @override
  String get retryUpload => '重试上传';

  @override
  String get uploadTheRequestedDocumentBelow => '请在下方上传所需文件。';

  @override
  String get waitingForTheTenantToUpload => '等待租客上传';

  @override
  String get setUpThePropertyTheTenancyAnd => '设置房产、租约及房间。';

  @override
  String get aNewTenancyStaysInThePropertys => '新租约仍属于原团队。个人房产的租约仍归个人。';

  @override
  String get newPropertyLabel => '新房产';

  @override
  String get existingProperty => '现有房产';

  @override
  String get findTheAddressOptional => '查找地址（选填）';

  @override
  String get postalCodeBuildingOrStreet => '邮编、楼名或街道';

  @override
  String get buildingOrStreetAreaAndCity => '楼名或街道、地区和城市';

  @override
  String get condominium => '公寓';

  @override
  String get condominiumServicedResidenceOrApartment => '公寓、服务式公寓或其他公寓住宅';

  @override
  String get roomsStartWithEditableInventoryRowsSuited =>
      '系统会按家具配置为每个房间提供可编辑的物品清单。';

  @override
  String get partiallyFurnished => '部分配备家具';

  @override
  String get unfurnished => '无家具';

  @override
  String get sameLandlordAsLastTime => '与上次相同的房东';

  @override
  String get chooseFromYourContacts => '从联系人中选择';

  @override
  String get verifyBothPartiesCea => '核实双方身份（CEA）';

  @override
  String get eachStartsWithStandardLinesYouCan => '每个房间都有可编辑的标准项目';

  @override
  String get namesOnlyThisCheckInRecordsIts => '只沿用房间名称，此次检查会另行记录房况';

  @override
  String get bedrooms => '卧室';

  @override
  String get bathrooms => '浴室';

  @override
  String get anotherRoomOptional => '其他房间（选填）';

  @override
  String get forExampleStudy => '例如：书房';

  @override
  String get noRoomsYetYouCanAddThem => '尚无房间。您可以稍后添加。';

  @override
  String get roomLabel => '间房';

  @override
  String get rooms => '间房';

  @override
  String get checkingForPhotosOnThisPhone => '正在检查此手机上的照片…';

  @override
  String get deleteChange => '删除变动';

  @override
  String get suggestAChange => '建议更改';

  @override
  String get chooseTheLandlord => '选择房东';

  @override
  String get chooseTheTenant => '选择租客';

  @override
  String get couldNotLoadYourContacts => '未能载入联系人';

  @override
  String get noContactsYet => '暂无联系人';

  @override
  String get nameOrEmail => '姓名或电邮';

  @override
  String get noContactMatches => '没有相符的联系人。';

  @override
  String get and => '和';

  @override
  String get singapore => '新加坡';

  @override
  String get malaysia => '马来西亚';

  @override
  String get whereDoYouWork => '你在哪里执业？';

  @override
  String get newPropertiesUseThatCountrysAddressesAnd =>
      '新房产将采用该国的地址格式和货币。您可稍后在“账户”中更改此设置。';

  @override
  String get newPropertiesAreMadeInThisCountry => '新房产将设在此国家，现有房产的国家保持不变。';

  @override
  String get couldNotLoadYourHomes => '未能载入您的住宅';

  @override
  String get reportsYouAgreedRepairsAndThePeople => '你已确认的报告、维修记录及相关人员。';

  @override
  String get noHomesWhereYouAreTheLandlord => '暂无您作为房东的住宅。';

  @override
  String get noHomesWhereYouAreTheTenant => '暂无您作为租客的住宅。';

  @override
  String get andItsAgent => '及其负责中介';

  @override
  String get saveTenancyChanges => '要保存租约更改吗？';

  @override
  String get theseDetailsIdentifyTheTenancyAndIts => '这些资料用于确认租约及签署方。保存前请仔细核对。';

  @override
  String get theAddressAndTypePrintedOnThe => '报告上显示的地址和房产类型';

  @override
  String get unitOptional => '单位号（选填）';

  @override
  String get postcode => '邮编';

  @override
  String get propertyType => '房产类型';

  @override
  String get condominiumOrApartment => '公寓住宅';

  @override
  String get addAnEmailSoEachPartyCan => '添加电邮地址，让双方都能收到并签署报告';

  @override
  String get landlordEmailOptional => '房东电邮（选填）';

  @override
  String get notProvided => '未提供';

  @override
  String get tenantEmailOptional => '租客电邮（选填）';

  @override
  String get openThisOnTheKiviloWebsite => '在 Kivilo 网站打开。';

  @override
  String get couldNotLoadYourTasks => '未能载入您的待办事项';

  @override
  String get nothingHereNow => '目前没有项目';

  @override
  String get thereIsMoreThanOneScreenOf => '还有更多工作。请先完成部分任务，或打开“房产”查看所有记录。';

  @override
  String get continueTheCheckOut => '继续退租检查';

  @override
  String get continueTheCheckIn => '继续入住检查';

  @override
  String get tasksForYourProperties => '你的房产待办事项。';

  @override
  String get tasksForYourRentedHomes => '你所租房屋的待办事项。';

  @override
  String get yourTasksUpdatesAndUpcomingDeadlines => '你的任务、最新动态及即将到期的事项。';

  @override
  String get offlineShowingTasksAsTheyWereLast =>
      '当前离线，显示上次载入的待办事项。部分事项可能已经完成。';

  @override
  String get checkingForUpdates => '正在检查更新…';

  @override
  String get nothingNeedsYourActionRightNow => '目前没有需要您处理的事项。';

  @override
  String get continueWhereYouLeftOff => '接着上次的进度';

  @override
  String get clientChecksKycCdd => '客户审查（KYC/CDD）';

  @override
  String get verifyClientsKycCdd => '核实客户身份（KYC/CDD）';

  @override
  String get yourFirstHandover => '你的首次交接';

  @override
  String get greatHandoversStartWithAClearRecord => '清晰的记录有助于顺利交接。';

  @override
  String get addThePropertyAndTenancyWellGuide =>
      '添加房产和租约。我们将从第一张照片引导您完成签署报告。您可以在“账户”中接受团队邀请。';

  @override
  String get youreAllCaughtUp => '所有待办已完成';

  @override
  String get nothingIsWaitingOnYouOrAnyone => '目前没有等待您或其他人处理的事项。';

  @override
  String get somePhotosOrChangesHaveNotUploaded =>
      '部分照片或更改尚未上传。请打开房间并点按“重试上传”，然后再发送签署。';

  @override
  String get remindersSentToThePartiesWithAn => '已向提供电邮地址的各方发送提醒';

  @override
  String get confirmNoChanges => '确认没有变动？';

  @override
  String get youAreConfirmingThatTheCheckOut =>
      '你将确认退租检查与已同意的入住检查一致，没有损坏、物品遗失或其他需记录的变化。双方均可在报告中看到这项确认。';

  @override
  String get confirmNoChangesLabel => '确认没有变动';

  @override
  String get couldNotOpenThisInspection => '未能打开此检查';

  @override
  String get waitingForSignatures => '等待签署。';

  @override
  String get readyToSendForSignature => '可发送给双方签署。';

  @override
  String get checkTheInventoryAgainstYourPhotosThen => '对照照片核对清单，然后将各个房间标为已核对。';

  @override
  String get openRoom => '打开房间';

  @override
  String get changesAtCheckOut => '退租时的变动';

  @override
  String get recordAnythingThatDiffersFromTheAgreed => '记录与已确认的入住状况有出入之处。';

  @override
  String get changeLabel => '项更改';

  @override
  String get changes => '项更改';

  @override
  String get nothingRecordedYet => '尚无记录';

  @override
  String get addDamageWearMissingItemsOrImprovements =>
      '记录损坏、损耗、缺失或改善之处。如没有变动，请在下方确认。';

  @override
  String get addAnotherChange => '再添加一项变动';

  @override
  String get partiesNotVerifiedYet => '双方尚未完成验证';

  @override
  String get ceaRequiresDueDiligenceOnTheLandlord => 'CEA 要求在签署租约前对房东和租客尽职审查。';

  @override
  String get sendForSignatureAnyway => '仍要发送签署';

  @override
  String get sendReminders => '发送提醒';

  @override
  String estimatedRepairCost(String currency) {
    return '预估费用（$currency）';
  }

  @override
  String previousTenantName(String name) {
    return '上一位租客：$name';
  }

  @override
  String get selectPropertyFirst => '请选择房产，或切换到新房产。';

  @override
  String get malaysianPostcodeLength => '马来西亚邮政编码为五位数';

  @override
  String get chooseFurnishingLevel => '请选择房产的家具配置。';

  @override
  String get choosePlan => '选择方案';

  @override
  String storePlanUnavailable(String store) {
    return '这个方案暂时无法通过 $store 订阅。';
  }

  @override
  String get reportTenancyPeriod => '租期';

  @override
  String get tenancyLength => '租期长度';

  @override
  String get chooseTenancyLength => '选择租期';

  @override
  String get oneYear => '1 年';

  @override
  String get twoYears => '2 年';

  @override
  String get threeYears => '3 年';

  @override
  String get customDates => '自选日期';

  @override
  String get chooseWhatToShow => '选择要查看的内容';

  @override
  String get yourHomesGroup => '您的房屋';

  @override
  String get myWork => '我的工作';
}
