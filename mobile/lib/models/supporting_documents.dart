class SupportingDocuments {
  const SupportingDocuments({
    required this.tenancyId,
    required this.propertyLabel,
    required this.tenantName,
    required this.startDate,
    required this.endDate,
    required this.role,
    required this.canRequest,
    required this.canUpload,
    required this.requests,
    required this.agreement,
    this.currentMinorRepairCap,
  });

  final String tenancyId;
  final String propertyLabel;
  final String tenantName;
  final String startDate;
  final String endDate;
  final String role;
  final bool canRequest;
  final bool canUpload;
  final List<SupportingDocumentRequest> requests;
  final TenancyAgreement agreement;
  final String? currentMinorRepairCap;

  factory SupportingDocuments.fromJson(Map<String, dynamic> json) =>
      SupportingDocuments(
        tenancyId: json['tenancyId'] as String,
        propertyLabel: json['propertyLabel'] as String,
        tenantName: json['tenantName'] as String,
        startDate: json['startDate'] as String,
        endDate: json['endDate'] as String,
        role: json['role'] as String,
        canRequest: json['canRequest'] as bool,
        canUpload: json['canUpload'] as bool,
        agreement: TenancyAgreement.fromJson(
          json['agreement'] as Map<String, dynamic>,
        ),
        currentMinorRepairCap: json['currentMinorRepairCap'] as String?,
        requests: (json['requests'] as List<dynamic>)
            .map(
              (row) => SupportingDocumentRequest.fromJson(
                row as Map<String, dynamic>,
              ),
            )
            .toList(),
      );
}

class SupportingDocumentRequest {
  const SupportingDocumentRequest({
    required this.id,
    required this.title,
    required this.requestedAt,
    required this.requestedBy,
    required this.files,
    required this.canUpload,
  });

  final String id;
  final String title;
  final String requestedAt;
  final String requestedBy;
  final List<SupportingDocumentFile> files;
  final bool canUpload;

  factory SupportingDocumentRequest.fromJson(Map<String, dynamic> json) =>
      SupportingDocumentRequest(
        id: json['id'] as String,
        canUpload: json['canUpload'] as bool,
        title: json['title'] as String,
        requestedAt: json['requestedAt'] as String,
        requestedBy:
            (json['requestedBy'] as Map<String, dynamic>)['name'] as String,
        files: (json['files'] as List<dynamic>)
            .map(
              (row) =>
                  SupportingDocumentFile.fromJson(row as Map<String, dynamic>),
            )
            .toList(),
      );
}

class TenancyAgreement {
  const TenancyAgreement({
    required this.requestId,
    required this.files,
    required this.currentFileId,
    required this.canUpload,
    required this.canReview,
    required this.termsMatchCurrentFile,
    this.terms,
  });
  final String? requestId;
  final List<SupportingDocumentFile> files;
  final String? currentFileId;
  final bool canUpload;
  final bool canReview;
  final bool termsMatchCurrentFile;
  final AgreementTerms? terms;

  factory TenancyAgreement.fromJson(Map<String, dynamic> json) =>
      TenancyAgreement(
        requestId: json['requestId'] as String?,
        currentFileId: json['currentFileId'] as String?,
        files: (json['files'] as List<dynamic>)
            .map(
              (file) =>
                  SupportingDocumentFile.fromJson(file as Map<String, dynamic>),
            )
            .toList(),
        canUpload: json['canUpload'] as bool,
        canReview: json['canReview'] as bool,
        termsMatchCurrentFile: json['termsMatchCurrentFile'] as bool,
        terms: json['terms'] == null
            ? null
            : AgreementTerms.fromJson(json['terms'] as Map<String, dynamic>),
      );
}

class AgreementTerms {
  const AgreementTerms({
    required this.fileId,
    required this.page,
    required this.quote,
    required this.rule,
    required this.tenantCap,
    required this.confirmedAt,
    required this.confirmedBy,
    this.notes,
    this.sourceFileName,
    this.matchesCurrentAgreement = true,
  });
  final String fileId;
  final int page;
  final String quote;
  final String rule;
  final String? tenantCap;
  final String? notes;
  final String? sourceFileName;
  final String confirmedAt;
  final String confirmedBy;
  final bool matchesCurrentAgreement;

  String get summary => rule == 'FIRST_AMOUNT'
      ? 'Tenant pays the first S\$$tenantCap per repair'
      : 'Repair responsibility follows the agreement';

  factory AgreementTerms.fromJson(Map<String, dynamic> json) => AgreementTerms(
    fileId: json['fileId'] as String,
    page: json['page'] as int,
    quote: json['quote'] as String,
    rule: json['rule'] as String,
    tenantCap: json['tenantCap'] as String?,
    notes: json['notes'] as String?,
    sourceFileName: json['sourceFileName'] as String?,
    confirmedAt: json['confirmedAt'] as String,
    confirmedBy:
        (json['confirmedBy'] as Map<String, dynamic>)['name'] as String,
    matchesCurrentAgreement: json['matchesCurrentAgreement'] as bool? ?? true,
  );
}

class AgreementClauseAnalysis {
  const AgreementClauseAnalysis({
    required this.fileId,
    required this.status,
    required this.candidates,
  });
  final String fileId;
  final String status;
  final List<AgreementClauseCandidate> candidates;
  factory AgreementClauseAnalysis.fromJson(
    Map<String, dynamic> json,
  ) => AgreementClauseAnalysis(
    fileId: json['fileId'] as String,
    status: json['status'] as String,
    candidates: (json['candidates'] as List<dynamic>)
        .map(
          (value) =>
              AgreementClauseCandidate.fromJson(value as Map<String, dynamic>),
        )
        .toList(),
  );
}

class AgreementClauseCandidate {
  const AgreementClauseCandidate({
    required this.page,
    required this.text,
    required this.suggestedTenantCap,
  });
  final int page;
  final String text;
  final String? suggestedTenantCap;
  factory AgreementClauseCandidate.fromJson(Map<String, dynamic> json) =>
      AgreementClauseCandidate(
        page: json['page'] as int,
        text: json['text'] as String,
        suggestedTenantCap: json['suggestedTenantCap'] as String?,
      );
}

class SupportingDocumentFile {
  const SupportingDocumentFile({
    required this.id,
    required this.clientId,
    required this.fileName,
    required this.mimeType,
    required this.byteSize,
    required this.submittedAt,
    required this.submittedBy,
  });

  final String id;
  final String clientId;
  final String fileName;
  final String mimeType;
  final int byteSize;
  final String submittedAt;
  final String submittedBy;

  factory SupportingDocumentFile.fromJson(Map<String, dynamic> json) =>
      SupportingDocumentFile(
        id: json['id'] as String,
        clientId: json['clientId'] as String,
        fileName: json['fileName'] as String,
        mimeType: json['mimeType'] as String,
        byteSize: json['byteSize'] as int,
        submittedAt: json['submittedAt'] as String,
        submittedBy:
            (json['submittedBy'] as Map<String, dynamic>)['name'] as String,
      );
}
