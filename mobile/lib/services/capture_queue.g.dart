// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'capture_queue.dart';

// ignore_for_file: type=lint
class $PendingCapturesTable extends PendingCaptures
    with TableInfo<$PendingCapturesTable, PendingCapture> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingCapturesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _ownerIdMeta = const VerificationMeta(
    'ownerId',
  );
  @override
  late final GeneratedColumn<String> ownerId = GeneratedColumn<String>(
    'owner_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _clientIdMeta = const VerificationMeta(
    'clientId',
  );
  @override
  late final GeneratedColumn<String> clientId = GeneratedColumn<String>(
    'client_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _roomIdMeta = const VerificationMeta('roomId');
  @override
  late final GeneratedColumn<String> roomId = GeneratedColumn<String>(
    'room_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _inspectionIdMeta = const VerificationMeta(
    'inspectionId',
  );
  @override
  late final GeneratedColumn<String> inspectionId = GeneratedColumn<String>(
    'inspection_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<String> itemId = GeneratedColumn<String>(
    'item_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _kindMeta = const VerificationMeta('kind');
  @override
  late final GeneratedColumn<String> kind = GeneratedColumn<String>(
    'kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _awaitingMarkupMeta = const VerificationMeta(
    'awaitingMarkup',
  );
  @override
  late final GeneratedColumn<bool> awaitingMarkup = GeneratedColumn<bool>(
    'awaiting_markup',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("awaiting_markup" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _relativePathMeta = const VerificationMeta(
    'relativePath',
  );
  @override
  late final GeneratedColumn<String> relativePath = GeneratedColumn<String>(
    'relative_path',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _filenameMeta = const VerificationMeta(
    'filename',
  );
  @override
  late final GeneratedColumn<String> filename = GeneratedColumn<String>(
    'filename',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _mimeTypeMeta = const VerificationMeta(
    'mimeType',
  );
  @override
  late final GeneratedColumn<String> mimeType = GeneratedColumn<String>(
    'mime_type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sizeBytesMeta = const VerificationMeta(
    'sizeBytes',
  );
  @override
  late final GeneratedColumn<int> sizeBytes = GeneratedColumn<int>(
    'size_bytes',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _durationSecMeta = const VerificationMeta(
    'durationSec',
  );
  @override
  late final GeneratedColumn<int> durationSec = GeneratedColumn<int>(
    'duration_sec',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _annotationsMeta = const VerificationMeta(
    'annotations',
  );
  @override
  late final GeneratedColumn<String> annotations = GeneratedColumn<String>(
    'annotations',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _uploadedIdMeta = const VerificationMeta(
    'uploadedId',
  );
  @override
  late final GeneratedColumn<String> uploadedId = GeneratedColumn<String>(
    'uploaded_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _registrationPreparedMeta =
      const VerificationMeta('registrationPrepared');
  @override
  late final GeneratedColumn<bool> registrationPrepared = GeneratedColumn<bool>(
    'registration_prepared',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("registration_prepared" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _registrationNoteMeta = const VerificationMeta(
    'registrationNote',
  );
  @override
  late final GeneratedColumn<String> registrationNote = GeneratedColumn<String>(
    'registration_note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _registrationAnnotationsMeta =
      const VerificationMeta('registrationAnnotations');
  @override
  late final GeneratedColumn<String> registrationAnnotations =
      GeneratedColumn<String>(
        'registration_annotations',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _registrationAnnotationsAppliedMeta =
      const VerificationMeta('registrationAnnotationsApplied');
  @override
  late final GeneratedColumn<bool> registrationAnnotationsApplied =
      GeneratedColumn<bool>(
        'registration_annotations_applied',
        aliasedName,
        false,
        type: DriftSqlType.bool,
        requiredDuringInsert: false,
        defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("registration_annotations_applied" IN (0, 1))',
        ),
        defaultValue: const Constant(true),
      );
  static const VerificationMeta _registrationItemAppliedMeta =
      const VerificationMeta('registrationItemApplied');
  @override
  late final GeneratedColumn<bool> registrationItemApplied =
      GeneratedColumn<bool>(
        'registration_item_applied',
        aliasedName,
        false,
        type: DriftSqlType.bool,
        requiredDuringInsert: false,
        defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("registration_item_applied" IN (0, 1))',
        ),
        defaultValue: const Constant(true),
      );
  static const VerificationMeta _storagePathMeta = const VerificationMeta(
    'storagePath',
  );
  @override
  late final GeneratedColumn<String> storagePath = GeneratedColumn<String>(
    'storage_path',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _deleteRequestedMeta = const VerificationMeta(
    'deleteRequested',
  );
  @override
  late final GeneratedColumn<bool> deleteRequested = GeneratedColumn<bool>(
    'delete_requested',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("delete_requested" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _claimedAtMeta = const VerificationMeta(
    'claimedAt',
  );
  @override
  late final GeneratedColumn<DateTime> claimedAt = GeneratedColumn<DateTime>(
    'claimed_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _leaseIdMeta = const VerificationMeta(
    'leaseId',
  );
  @override
  late final GeneratedColumn<String> leaseId = GeneratedColumn<String>(
    'lease_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _attemptsMeta = const VerificationMeta(
    'attempts',
  );
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
    'attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastErrorMeta = const VerificationMeta(
    'lastError',
  );
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
    'last_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    ownerId,
    clientId,
    roomId,
    inspectionId,
    itemId,
    kind,
    awaitingMarkup,
    relativePath,
    filename,
    mimeType,
    sizeBytes,
    durationSec,
    note,
    annotations,
    uploadedId,
    registrationPrepared,
    registrationNote,
    registrationAnnotations,
    registrationAnnotationsApplied,
    registrationItemApplied,
    storagePath,
    deleteRequested,
    claimedAt,
    leaseId,
    attempts,
    lastError,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_captures';
  @override
  VerificationContext validateIntegrity(
    Insertable<PendingCapture> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('owner_id')) {
      context.handle(
        _ownerIdMeta,
        ownerId.isAcceptableOrUnknown(data['owner_id']!, _ownerIdMeta),
      );
    }
    if (data.containsKey('client_id')) {
      context.handle(
        _clientIdMeta,
        clientId.isAcceptableOrUnknown(data['client_id']!, _clientIdMeta),
      );
    }
    if (data.containsKey('room_id')) {
      context.handle(
        _roomIdMeta,
        roomId.isAcceptableOrUnknown(data['room_id']!, _roomIdMeta),
      );
    } else if (isInserting) {
      context.missing(_roomIdMeta);
    }
    if (data.containsKey('inspection_id')) {
      context.handle(
        _inspectionIdMeta,
        inspectionId.isAcceptableOrUnknown(
          data['inspection_id']!,
          _inspectionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_inspectionIdMeta);
    }
    if (data.containsKey('item_id')) {
      context.handle(
        _itemIdMeta,
        itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta),
      );
    }
    if (data.containsKey('kind')) {
      context.handle(
        _kindMeta,
        kind.isAcceptableOrUnknown(data['kind']!, _kindMeta),
      );
    } else if (isInserting) {
      context.missing(_kindMeta);
    }
    if (data.containsKey('awaiting_markup')) {
      context.handle(
        _awaitingMarkupMeta,
        awaitingMarkup.isAcceptableOrUnknown(
          data['awaiting_markup']!,
          _awaitingMarkupMeta,
        ),
      );
    }
    if (data.containsKey('relative_path')) {
      context.handle(
        _relativePathMeta,
        relativePath.isAcceptableOrUnknown(
          data['relative_path']!,
          _relativePathMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_relativePathMeta);
    }
    if (data.containsKey('filename')) {
      context.handle(
        _filenameMeta,
        filename.isAcceptableOrUnknown(data['filename']!, _filenameMeta),
      );
    } else if (isInserting) {
      context.missing(_filenameMeta);
    }
    if (data.containsKey('mime_type')) {
      context.handle(
        _mimeTypeMeta,
        mimeType.isAcceptableOrUnknown(data['mime_type']!, _mimeTypeMeta),
      );
    } else if (isInserting) {
      context.missing(_mimeTypeMeta);
    }
    if (data.containsKey('size_bytes')) {
      context.handle(
        _sizeBytesMeta,
        sizeBytes.isAcceptableOrUnknown(data['size_bytes']!, _sizeBytesMeta),
      );
    } else if (isInserting) {
      context.missing(_sizeBytesMeta);
    }
    if (data.containsKey('duration_sec')) {
      context.handle(
        _durationSecMeta,
        durationSec.isAcceptableOrUnknown(
          data['duration_sec']!,
          _durationSecMeta,
        ),
      );
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('annotations')) {
      context.handle(
        _annotationsMeta,
        annotations.isAcceptableOrUnknown(
          data['annotations']!,
          _annotationsMeta,
        ),
      );
    }
    if (data.containsKey('uploaded_id')) {
      context.handle(
        _uploadedIdMeta,
        uploadedId.isAcceptableOrUnknown(data['uploaded_id']!, _uploadedIdMeta),
      );
    }
    if (data.containsKey('registration_prepared')) {
      context.handle(
        _registrationPreparedMeta,
        registrationPrepared.isAcceptableOrUnknown(
          data['registration_prepared']!,
          _registrationPreparedMeta,
        ),
      );
    }
    if (data.containsKey('registration_note')) {
      context.handle(
        _registrationNoteMeta,
        registrationNote.isAcceptableOrUnknown(
          data['registration_note']!,
          _registrationNoteMeta,
        ),
      );
    }
    if (data.containsKey('registration_annotations')) {
      context.handle(
        _registrationAnnotationsMeta,
        registrationAnnotations.isAcceptableOrUnknown(
          data['registration_annotations']!,
          _registrationAnnotationsMeta,
        ),
      );
    }
    if (data.containsKey('registration_annotations_applied')) {
      context.handle(
        _registrationAnnotationsAppliedMeta,
        registrationAnnotationsApplied.isAcceptableOrUnknown(
          data['registration_annotations_applied']!,
          _registrationAnnotationsAppliedMeta,
        ),
      );
    }
    if (data.containsKey('registration_item_applied')) {
      context.handle(
        _registrationItemAppliedMeta,
        registrationItemApplied.isAcceptableOrUnknown(
          data['registration_item_applied']!,
          _registrationItemAppliedMeta,
        ),
      );
    }
    if (data.containsKey('storage_path')) {
      context.handle(
        _storagePathMeta,
        storagePath.isAcceptableOrUnknown(
          data['storage_path']!,
          _storagePathMeta,
        ),
      );
    }
    if (data.containsKey('delete_requested')) {
      context.handle(
        _deleteRequestedMeta,
        deleteRequested.isAcceptableOrUnknown(
          data['delete_requested']!,
          _deleteRequestedMeta,
        ),
      );
    }
    if (data.containsKey('claimed_at')) {
      context.handle(
        _claimedAtMeta,
        claimedAt.isAcceptableOrUnknown(data['claimed_at']!, _claimedAtMeta),
      );
    }
    if (data.containsKey('lease_id')) {
      context.handle(
        _leaseIdMeta,
        leaseId.isAcceptableOrUnknown(data['lease_id']!, _leaseIdMeta),
      );
    }
    if (data.containsKey('attempts')) {
      context.handle(
        _attemptsMeta,
        attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta),
      );
    }
    if (data.containsKey('last_error')) {
      context.handle(
        _lastErrorMeta,
        lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PendingCapture map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingCapture(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      ownerId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}owner_id'],
      ),
      clientId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_id'],
      ),
      roomId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}room_id'],
      )!,
      inspectionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}inspection_id'],
      )!,
      itemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}item_id'],
      ),
      kind: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}kind'],
      )!,
      awaitingMarkup: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}awaiting_markup'],
      )!,
      relativePath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}relative_path'],
      )!,
      filename: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}filename'],
      )!,
      mimeType: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}mime_type'],
      )!,
      sizeBytes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}size_bytes'],
      )!,
      durationSec: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}duration_sec'],
      ),
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      annotations: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}annotations'],
      ),
      uploadedId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}uploaded_id'],
      ),
      registrationPrepared: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}registration_prepared'],
      )!,
      registrationNote: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}registration_note'],
      ),
      registrationAnnotations: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}registration_annotations'],
      ),
      registrationAnnotationsApplied: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}registration_annotations_applied'],
      )!,
      registrationItemApplied: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}registration_item_applied'],
      )!,
      storagePath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}storage_path'],
      ),
      deleteRequested: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}delete_requested'],
      )!,
      claimedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}claimed_at'],
      ),
      leaseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}lease_id'],
      ),
      attempts: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attempts'],
      )!,
      lastError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $PendingCapturesTable createAlias(String alias) {
    return $PendingCapturesTable(attachedDatabase, alias);
  }
}

class PendingCapture extends DataClass implements Insertable<PendingCapture> {
  final int id;

  /// The auth user's id, not an email address. A later login must never send another
  /// account's unsent evidence using its bearer token.
  final String? ownerId;

  /// Stable across retries, app restarts and lost HTTP responses.
  final String? clientId;
  final String roomId;
  final String inspectionId;
  final String? itemId;
  final String kind;

  /// A new photo stays local until its inspector finishes the immediate mark editor.
  /// This survives process death: reopening the item resumes the saved draft.
  final bool awaitingMarkup;

  /// Relative to the app support directory, never absolute: iOS moves the container
  /// between launches and an absolute path recorded yesterday points nowhere today.
  final String relativePath;
  final String filename;
  final String mimeType;
  final int sizeBytes;
  final int? durationSec;
  final String? note;

  /// Marks drawn before the photo ever left the phone, as the JSON the server accepts.
  final String? annotations;

  /// Set the moment the server has the bytes. From then on the row is only a hand-over
  /// of the phone's copy and its bytes are never sent again.
  final String? uploadedId;

  /// The exact note and marks sent in the first registration. Retries send this
  /// snapshot, and only later edits require a separate mutation. This matters when
  /// late media lands after the report was sent for signature: unchanged evidence can
  /// register without an edit that the signature freeze rightly rejects.
  final bool registrationPrepared;
  final String? registrationNote;
  final String? registrationAnnotations;
  final bool registrationAnnotationsApplied;
  final bool registrationItemApplied;

  /// Remember the object path as soon as a credential is issued. If the storage PUT
  /// succeeds but its response is lost, the retry uses the same path and clientId.
  final String? storagePath;
  final bool deleteRequested;

  /// Held by whichever uploader is working on this row. Background transfers run in
  /// their own isolate with their own database handle, so a re-entrancy flag in memory
  /// (which is all the web client needs) would not be seen by the other side.
  final DateTime? claimedAt;
  final String? leaseId;
  final int attempts;
  final String? lastError;
  final DateTime createdAt;
  const PendingCapture({
    required this.id,
    this.ownerId,
    this.clientId,
    required this.roomId,
    required this.inspectionId,
    this.itemId,
    required this.kind,
    required this.awaitingMarkup,
    required this.relativePath,
    required this.filename,
    required this.mimeType,
    required this.sizeBytes,
    this.durationSec,
    this.note,
    this.annotations,
    this.uploadedId,
    required this.registrationPrepared,
    this.registrationNote,
    this.registrationAnnotations,
    required this.registrationAnnotationsApplied,
    required this.registrationItemApplied,
    this.storagePath,
    required this.deleteRequested,
    this.claimedAt,
    this.leaseId,
    required this.attempts,
    this.lastError,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    if (!nullToAbsent || ownerId != null) {
      map['owner_id'] = Variable<String>(ownerId);
    }
    if (!nullToAbsent || clientId != null) {
      map['client_id'] = Variable<String>(clientId);
    }
    map['room_id'] = Variable<String>(roomId);
    map['inspection_id'] = Variable<String>(inspectionId);
    if (!nullToAbsent || itemId != null) {
      map['item_id'] = Variable<String>(itemId);
    }
    map['kind'] = Variable<String>(kind);
    map['awaiting_markup'] = Variable<bool>(awaitingMarkup);
    map['relative_path'] = Variable<String>(relativePath);
    map['filename'] = Variable<String>(filename);
    map['mime_type'] = Variable<String>(mimeType);
    map['size_bytes'] = Variable<int>(sizeBytes);
    if (!nullToAbsent || durationSec != null) {
      map['duration_sec'] = Variable<int>(durationSec);
    }
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    if (!nullToAbsent || annotations != null) {
      map['annotations'] = Variable<String>(annotations);
    }
    if (!nullToAbsent || uploadedId != null) {
      map['uploaded_id'] = Variable<String>(uploadedId);
    }
    map['registration_prepared'] = Variable<bool>(registrationPrepared);
    if (!nullToAbsent || registrationNote != null) {
      map['registration_note'] = Variable<String>(registrationNote);
    }
    if (!nullToAbsent || registrationAnnotations != null) {
      map['registration_annotations'] = Variable<String>(
        registrationAnnotations,
      );
    }
    map['registration_annotations_applied'] = Variable<bool>(
      registrationAnnotationsApplied,
    );
    map['registration_item_applied'] = Variable<bool>(registrationItemApplied);
    if (!nullToAbsent || storagePath != null) {
      map['storage_path'] = Variable<String>(storagePath);
    }
    map['delete_requested'] = Variable<bool>(deleteRequested);
    if (!nullToAbsent || claimedAt != null) {
      map['claimed_at'] = Variable<DateTime>(claimedAt);
    }
    if (!nullToAbsent || leaseId != null) {
      map['lease_id'] = Variable<String>(leaseId);
    }
    map['attempts'] = Variable<int>(attempts);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  PendingCapturesCompanion toCompanion(bool nullToAbsent) {
    return PendingCapturesCompanion(
      id: Value(id),
      ownerId: ownerId == null && nullToAbsent
          ? const Value.absent()
          : Value(ownerId),
      clientId: clientId == null && nullToAbsent
          ? const Value.absent()
          : Value(clientId),
      roomId: Value(roomId),
      inspectionId: Value(inspectionId),
      itemId: itemId == null && nullToAbsent
          ? const Value.absent()
          : Value(itemId),
      kind: Value(kind),
      awaitingMarkup: Value(awaitingMarkup),
      relativePath: Value(relativePath),
      filename: Value(filename),
      mimeType: Value(mimeType),
      sizeBytes: Value(sizeBytes),
      durationSec: durationSec == null && nullToAbsent
          ? const Value.absent()
          : Value(durationSec),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      annotations: annotations == null && nullToAbsent
          ? const Value.absent()
          : Value(annotations),
      uploadedId: uploadedId == null && nullToAbsent
          ? const Value.absent()
          : Value(uploadedId),
      registrationPrepared: Value(registrationPrepared),
      registrationNote: registrationNote == null && nullToAbsent
          ? const Value.absent()
          : Value(registrationNote),
      registrationAnnotations: registrationAnnotations == null && nullToAbsent
          ? const Value.absent()
          : Value(registrationAnnotations),
      registrationAnnotationsApplied: Value(registrationAnnotationsApplied),
      registrationItemApplied: Value(registrationItemApplied),
      storagePath: storagePath == null && nullToAbsent
          ? const Value.absent()
          : Value(storagePath),
      deleteRequested: Value(deleteRequested),
      claimedAt: claimedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(claimedAt),
      leaseId: leaseId == null && nullToAbsent
          ? const Value.absent()
          : Value(leaseId),
      attempts: Value(attempts),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      createdAt: Value(createdAt),
    );
  }

  factory PendingCapture.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingCapture(
      id: serializer.fromJson<int>(json['id']),
      ownerId: serializer.fromJson<String?>(json['ownerId']),
      clientId: serializer.fromJson<String?>(json['clientId']),
      roomId: serializer.fromJson<String>(json['roomId']),
      inspectionId: serializer.fromJson<String>(json['inspectionId']),
      itemId: serializer.fromJson<String?>(json['itemId']),
      kind: serializer.fromJson<String>(json['kind']),
      awaitingMarkup: serializer.fromJson<bool>(json['awaitingMarkup']),
      relativePath: serializer.fromJson<String>(json['relativePath']),
      filename: serializer.fromJson<String>(json['filename']),
      mimeType: serializer.fromJson<String>(json['mimeType']),
      sizeBytes: serializer.fromJson<int>(json['sizeBytes']),
      durationSec: serializer.fromJson<int?>(json['durationSec']),
      note: serializer.fromJson<String?>(json['note']),
      annotations: serializer.fromJson<String?>(json['annotations']),
      uploadedId: serializer.fromJson<String?>(json['uploadedId']),
      registrationPrepared: serializer.fromJson<bool>(
        json['registrationPrepared'],
      ),
      registrationNote: serializer.fromJson<String?>(json['registrationNote']),
      registrationAnnotations: serializer.fromJson<String?>(
        json['registrationAnnotations'],
      ),
      registrationAnnotationsApplied: serializer.fromJson<bool>(
        json['registrationAnnotationsApplied'],
      ),
      registrationItemApplied: serializer.fromJson<bool>(
        json['registrationItemApplied'],
      ),
      storagePath: serializer.fromJson<String?>(json['storagePath']),
      deleteRequested: serializer.fromJson<bool>(json['deleteRequested']),
      claimedAt: serializer.fromJson<DateTime?>(json['claimedAt']),
      leaseId: serializer.fromJson<String?>(json['leaseId']),
      attempts: serializer.fromJson<int>(json['attempts']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'ownerId': serializer.toJson<String?>(ownerId),
      'clientId': serializer.toJson<String?>(clientId),
      'roomId': serializer.toJson<String>(roomId),
      'inspectionId': serializer.toJson<String>(inspectionId),
      'itemId': serializer.toJson<String?>(itemId),
      'kind': serializer.toJson<String>(kind),
      'awaitingMarkup': serializer.toJson<bool>(awaitingMarkup),
      'relativePath': serializer.toJson<String>(relativePath),
      'filename': serializer.toJson<String>(filename),
      'mimeType': serializer.toJson<String>(mimeType),
      'sizeBytes': serializer.toJson<int>(sizeBytes),
      'durationSec': serializer.toJson<int?>(durationSec),
      'note': serializer.toJson<String?>(note),
      'annotations': serializer.toJson<String?>(annotations),
      'uploadedId': serializer.toJson<String?>(uploadedId),
      'registrationPrepared': serializer.toJson<bool>(registrationPrepared),
      'registrationNote': serializer.toJson<String?>(registrationNote),
      'registrationAnnotations': serializer.toJson<String?>(
        registrationAnnotations,
      ),
      'registrationAnnotationsApplied': serializer.toJson<bool>(
        registrationAnnotationsApplied,
      ),
      'registrationItemApplied': serializer.toJson<bool>(
        registrationItemApplied,
      ),
      'storagePath': serializer.toJson<String?>(storagePath),
      'deleteRequested': serializer.toJson<bool>(deleteRequested),
      'claimedAt': serializer.toJson<DateTime?>(claimedAt),
      'leaseId': serializer.toJson<String?>(leaseId),
      'attempts': serializer.toJson<int>(attempts),
      'lastError': serializer.toJson<String?>(lastError),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  PendingCapture copyWith({
    int? id,
    Value<String?> ownerId = const Value.absent(),
    Value<String?> clientId = const Value.absent(),
    String? roomId,
    String? inspectionId,
    Value<String?> itemId = const Value.absent(),
    String? kind,
    bool? awaitingMarkup,
    String? relativePath,
    String? filename,
    String? mimeType,
    int? sizeBytes,
    Value<int?> durationSec = const Value.absent(),
    Value<String?> note = const Value.absent(),
    Value<String?> annotations = const Value.absent(),
    Value<String?> uploadedId = const Value.absent(),
    bool? registrationPrepared,
    Value<String?> registrationNote = const Value.absent(),
    Value<String?> registrationAnnotations = const Value.absent(),
    bool? registrationAnnotationsApplied,
    bool? registrationItemApplied,
    Value<String?> storagePath = const Value.absent(),
    bool? deleteRequested,
    Value<DateTime?> claimedAt = const Value.absent(),
    Value<String?> leaseId = const Value.absent(),
    int? attempts,
    Value<String?> lastError = const Value.absent(),
    DateTime? createdAt,
  }) => PendingCapture(
    id: id ?? this.id,
    ownerId: ownerId.present ? ownerId.value : this.ownerId,
    clientId: clientId.present ? clientId.value : this.clientId,
    roomId: roomId ?? this.roomId,
    inspectionId: inspectionId ?? this.inspectionId,
    itemId: itemId.present ? itemId.value : this.itemId,
    kind: kind ?? this.kind,
    awaitingMarkup: awaitingMarkup ?? this.awaitingMarkup,
    relativePath: relativePath ?? this.relativePath,
    filename: filename ?? this.filename,
    mimeType: mimeType ?? this.mimeType,
    sizeBytes: sizeBytes ?? this.sizeBytes,
    durationSec: durationSec.present ? durationSec.value : this.durationSec,
    note: note.present ? note.value : this.note,
    annotations: annotations.present ? annotations.value : this.annotations,
    uploadedId: uploadedId.present ? uploadedId.value : this.uploadedId,
    registrationPrepared: registrationPrepared ?? this.registrationPrepared,
    registrationNote: registrationNote.present
        ? registrationNote.value
        : this.registrationNote,
    registrationAnnotations: registrationAnnotations.present
        ? registrationAnnotations.value
        : this.registrationAnnotations,
    registrationAnnotationsApplied:
        registrationAnnotationsApplied ?? this.registrationAnnotationsApplied,
    registrationItemApplied:
        registrationItemApplied ?? this.registrationItemApplied,
    storagePath: storagePath.present ? storagePath.value : this.storagePath,
    deleteRequested: deleteRequested ?? this.deleteRequested,
    claimedAt: claimedAt.present ? claimedAt.value : this.claimedAt,
    leaseId: leaseId.present ? leaseId.value : this.leaseId,
    attempts: attempts ?? this.attempts,
    lastError: lastError.present ? lastError.value : this.lastError,
    createdAt: createdAt ?? this.createdAt,
  );
  PendingCapture copyWithCompanion(PendingCapturesCompanion data) {
    return PendingCapture(
      id: data.id.present ? data.id.value : this.id,
      ownerId: data.ownerId.present ? data.ownerId.value : this.ownerId,
      clientId: data.clientId.present ? data.clientId.value : this.clientId,
      roomId: data.roomId.present ? data.roomId.value : this.roomId,
      inspectionId: data.inspectionId.present
          ? data.inspectionId.value
          : this.inspectionId,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      kind: data.kind.present ? data.kind.value : this.kind,
      awaitingMarkup: data.awaitingMarkup.present
          ? data.awaitingMarkup.value
          : this.awaitingMarkup,
      relativePath: data.relativePath.present
          ? data.relativePath.value
          : this.relativePath,
      filename: data.filename.present ? data.filename.value : this.filename,
      mimeType: data.mimeType.present ? data.mimeType.value : this.mimeType,
      sizeBytes: data.sizeBytes.present ? data.sizeBytes.value : this.sizeBytes,
      durationSec: data.durationSec.present
          ? data.durationSec.value
          : this.durationSec,
      note: data.note.present ? data.note.value : this.note,
      annotations: data.annotations.present
          ? data.annotations.value
          : this.annotations,
      uploadedId: data.uploadedId.present
          ? data.uploadedId.value
          : this.uploadedId,
      registrationPrepared: data.registrationPrepared.present
          ? data.registrationPrepared.value
          : this.registrationPrepared,
      registrationNote: data.registrationNote.present
          ? data.registrationNote.value
          : this.registrationNote,
      registrationAnnotations: data.registrationAnnotations.present
          ? data.registrationAnnotations.value
          : this.registrationAnnotations,
      registrationAnnotationsApplied:
          data.registrationAnnotationsApplied.present
          ? data.registrationAnnotationsApplied.value
          : this.registrationAnnotationsApplied,
      registrationItemApplied: data.registrationItemApplied.present
          ? data.registrationItemApplied.value
          : this.registrationItemApplied,
      storagePath: data.storagePath.present
          ? data.storagePath.value
          : this.storagePath,
      deleteRequested: data.deleteRequested.present
          ? data.deleteRequested.value
          : this.deleteRequested,
      claimedAt: data.claimedAt.present ? data.claimedAt.value : this.claimedAt,
      leaseId: data.leaseId.present ? data.leaseId.value : this.leaseId,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingCapture(')
          ..write('id: $id, ')
          ..write('ownerId: $ownerId, ')
          ..write('clientId: $clientId, ')
          ..write('roomId: $roomId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('itemId: $itemId, ')
          ..write('kind: $kind, ')
          ..write('awaitingMarkup: $awaitingMarkup, ')
          ..write('relativePath: $relativePath, ')
          ..write('filename: $filename, ')
          ..write('mimeType: $mimeType, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('durationSec: $durationSec, ')
          ..write('note: $note, ')
          ..write('annotations: $annotations, ')
          ..write('uploadedId: $uploadedId, ')
          ..write('registrationPrepared: $registrationPrepared, ')
          ..write('registrationNote: $registrationNote, ')
          ..write('registrationAnnotations: $registrationAnnotations, ')
          ..write(
            'registrationAnnotationsApplied: $registrationAnnotationsApplied, ',
          )
          ..write('registrationItemApplied: $registrationItemApplied, ')
          ..write('storagePath: $storagePath, ')
          ..write('deleteRequested: $deleteRequested, ')
          ..write('claimedAt: $claimedAt, ')
          ..write('leaseId: $leaseId, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    id,
    ownerId,
    clientId,
    roomId,
    inspectionId,
    itemId,
    kind,
    awaitingMarkup,
    relativePath,
    filename,
    mimeType,
    sizeBytes,
    durationSec,
    note,
    annotations,
    uploadedId,
    registrationPrepared,
    registrationNote,
    registrationAnnotations,
    registrationAnnotationsApplied,
    registrationItemApplied,
    storagePath,
    deleteRequested,
    claimedAt,
    leaseId,
    attempts,
    lastError,
    createdAt,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingCapture &&
          other.id == this.id &&
          other.ownerId == this.ownerId &&
          other.clientId == this.clientId &&
          other.roomId == this.roomId &&
          other.inspectionId == this.inspectionId &&
          other.itemId == this.itemId &&
          other.kind == this.kind &&
          other.awaitingMarkup == this.awaitingMarkup &&
          other.relativePath == this.relativePath &&
          other.filename == this.filename &&
          other.mimeType == this.mimeType &&
          other.sizeBytes == this.sizeBytes &&
          other.durationSec == this.durationSec &&
          other.note == this.note &&
          other.annotations == this.annotations &&
          other.uploadedId == this.uploadedId &&
          other.registrationPrepared == this.registrationPrepared &&
          other.registrationNote == this.registrationNote &&
          other.registrationAnnotations == this.registrationAnnotations &&
          other.registrationAnnotationsApplied ==
              this.registrationAnnotationsApplied &&
          other.registrationItemApplied == this.registrationItemApplied &&
          other.storagePath == this.storagePath &&
          other.deleteRequested == this.deleteRequested &&
          other.claimedAt == this.claimedAt &&
          other.leaseId == this.leaseId &&
          other.attempts == this.attempts &&
          other.lastError == this.lastError &&
          other.createdAt == this.createdAt);
}

class PendingCapturesCompanion extends UpdateCompanion<PendingCapture> {
  final Value<int> id;
  final Value<String?> ownerId;
  final Value<String?> clientId;
  final Value<String> roomId;
  final Value<String> inspectionId;
  final Value<String?> itemId;
  final Value<String> kind;
  final Value<bool> awaitingMarkup;
  final Value<String> relativePath;
  final Value<String> filename;
  final Value<String> mimeType;
  final Value<int> sizeBytes;
  final Value<int?> durationSec;
  final Value<String?> note;
  final Value<String?> annotations;
  final Value<String?> uploadedId;
  final Value<bool> registrationPrepared;
  final Value<String?> registrationNote;
  final Value<String?> registrationAnnotations;
  final Value<bool> registrationAnnotationsApplied;
  final Value<bool> registrationItemApplied;
  final Value<String?> storagePath;
  final Value<bool> deleteRequested;
  final Value<DateTime?> claimedAt;
  final Value<String?> leaseId;
  final Value<int> attempts;
  final Value<String?> lastError;
  final Value<DateTime> createdAt;
  const PendingCapturesCompanion({
    this.id = const Value.absent(),
    this.ownerId = const Value.absent(),
    this.clientId = const Value.absent(),
    this.roomId = const Value.absent(),
    this.inspectionId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.kind = const Value.absent(),
    this.awaitingMarkup = const Value.absent(),
    this.relativePath = const Value.absent(),
    this.filename = const Value.absent(),
    this.mimeType = const Value.absent(),
    this.sizeBytes = const Value.absent(),
    this.durationSec = const Value.absent(),
    this.note = const Value.absent(),
    this.annotations = const Value.absent(),
    this.uploadedId = const Value.absent(),
    this.registrationPrepared = const Value.absent(),
    this.registrationNote = const Value.absent(),
    this.registrationAnnotations = const Value.absent(),
    this.registrationAnnotationsApplied = const Value.absent(),
    this.registrationItemApplied = const Value.absent(),
    this.storagePath = const Value.absent(),
    this.deleteRequested = const Value.absent(),
    this.claimedAt = const Value.absent(),
    this.leaseId = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  PendingCapturesCompanion.insert({
    this.id = const Value.absent(),
    this.ownerId = const Value.absent(),
    this.clientId = const Value.absent(),
    required String roomId,
    required String inspectionId,
    this.itemId = const Value.absent(),
    required String kind,
    this.awaitingMarkup = const Value.absent(),
    required String relativePath,
    required String filename,
    required String mimeType,
    required int sizeBytes,
    this.durationSec = const Value.absent(),
    this.note = const Value.absent(),
    this.annotations = const Value.absent(),
    this.uploadedId = const Value.absent(),
    this.registrationPrepared = const Value.absent(),
    this.registrationNote = const Value.absent(),
    this.registrationAnnotations = const Value.absent(),
    this.registrationAnnotationsApplied = const Value.absent(),
    this.registrationItemApplied = const Value.absent(),
    this.storagePath = const Value.absent(),
    this.deleteRequested = const Value.absent(),
    this.claimedAt = const Value.absent(),
    this.leaseId = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    required DateTime createdAt,
  }) : roomId = Value(roomId),
       inspectionId = Value(inspectionId),
       kind = Value(kind),
       relativePath = Value(relativePath),
       filename = Value(filename),
       mimeType = Value(mimeType),
       sizeBytes = Value(sizeBytes),
       createdAt = Value(createdAt);
  static Insertable<PendingCapture> custom({
    Expression<int>? id,
    Expression<String>? ownerId,
    Expression<String>? clientId,
    Expression<String>? roomId,
    Expression<String>? inspectionId,
    Expression<String>? itemId,
    Expression<String>? kind,
    Expression<bool>? awaitingMarkup,
    Expression<String>? relativePath,
    Expression<String>? filename,
    Expression<String>? mimeType,
    Expression<int>? sizeBytes,
    Expression<int>? durationSec,
    Expression<String>? note,
    Expression<String>? annotations,
    Expression<String>? uploadedId,
    Expression<bool>? registrationPrepared,
    Expression<String>? registrationNote,
    Expression<String>? registrationAnnotations,
    Expression<bool>? registrationAnnotationsApplied,
    Expression<bool>? registrationItemApplied,
    Expression<String>? storagePath,
    Expression<bool>? deleteRequested,
    Expression<DateTime>? claimedAt,
    Expression<String>? leaseId,
    Expression<int>? attempts,
    Expression<String>? lastError,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (ownerId != null) 'owner_id': ownerId,
      if (clientId != null) 'client_id': clientId,
      if (roomId != null) 'room_id': roomId,
      if (inspectionId != null) 'inspection_id': inspectionId,
      if (itemId != null) 'item_id': itemId,
      if (kind != null) 'kind': kind,
      if (awaitingMarkup != null) 'awaiting_markup': awaitingMarkup,
      if (relativePath != null) 'relative_path': relativePath,
      if (filename != null) 'filename': filename,
      if (mimeType != null) 'mime_type': mimeType,
      if (sizeBytes != null) 'size_bytes': sizeBytes,
      if (durationSec != null) 'duration_sec': durationSec,
      if (note != null) 'note': note,
      if (annotations != null) 'annotations': annotations,
      if (uploadedId != null) 'uploaded_id': uploadedId,
      if (registrationPrepared != null)
        'registration_prepared': registrationPrepared,
      if (registrationNote != null) 'registration_note': registrationNote,
      if (registrationAnnotations != null)
        'registration_annotations': registrationAnnotations,
      if (registrationAnnotationsApplied != null)
        'registration_annotations_applied': registrationAnnotationsApplied,
      if (registrationItemApplied != null)
        'registration_item_applied': registrationItemApplied,
      if (storagePath != null) 'storage_path': storagePath,
      if (deleteRequested != null) 'delete_requested': deleteRequested,
      if (claimedAt != null) 'claimed_at': claimedAt,
      if (leaseId != null) 'lease_id': leaseId,
      if (attempts != null) 'attempts': attempts,
      if (lastError != null) 'last_error': lastError,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  PendingCapturesCompanion copyWith({
    Value<int>? id,
    Value<String?>? ownerId,
    Value<String?>? clientId,
    Value<String>? roomId,
    Value<String>? inspectionId,
    Value<String?>? itemId,
    Value<String>? kind,
    Value<bool>? awaitingMarkup,
    Value<String>? relativePath,
    Value<String>? filename,
    Value<String>? mimeType,
    Value<int>? sizeBytes,
    Value<int?>? durationSec,
    Value<String?>? note,
    Value<String?>? annotations,
    Value<String?>? uploadedId,
    Value<bool>? registrationPrepared,
    Value<String?>? registrationNote,
    Value<String?>? registrationAnnotations,
    Value<bool>? registrationAnnotationsApplied,
    Value<bool>? registrationItemApplied,
    Value<String?>? storagePath,
    Value<bool>? deleteRequested,
    Value<DateTime?>? claimedAt,
    Value<String?>? leaseId,
    Value<int>? attempts,
    Value<String?>? lastError,
    Value<DateTime>? createdAt,
  }) {
    return PendingCapturesCompanion(
      id: id ?? this.id,
      ownerId: ownerId ?? this.ownerId,
      clientId: clientId ?? this.clientId,
      roomId: roomId ?? this.roomId,
      inspectionId: inspectionId ?? this.inspectionId,
      itemId: itemId ?? this.itemId,
      kind: kind ?? this.kind,
      awaitingMarkup: awaitingMarkup ?? this.awaitingMarkup,
      relativePath: relativePath ?? this.relativePath,
      filename: filename ?? this.filename,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      durationSec: durationSec ?? this.durationSec,
      note: note ?? this.note,
      annotations: annotations ?? this.annotations,
      uploadedId: uploadedId ?? this.uploadedId,
      registrationPrepared: registrationPrepared ?? this.registrationPrepared,
      registrationNote: registrationNote ?? this.registrationNote,
      registrationAnnotations:
          registrationAnnotations ?? this.registrationAnnotations,
      registrationAnnotationsApplied:
          registrationAnnotationsApplied ?? this.registrationAnnotationsApplied,
      registrationItemApplied:
          registrationItemApplied ?? this.registrationItemApplied,
      storagePath: storagePath ?? this.storagePath,
      deleteRequested: deleteRequested ?? this.deleteRequested,
      claimedAt: claimedAt ?? this.claimedAt,
      leaseId: leaseId ?? this.leaseId,
      attempts: attempts ?? this.attempts,
      lastError: lastError ?? this.lastError,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (ownerId.present) {
      map['owner_id'] = Variable<String>(ownerId.value);
    }
    if (clientId.present) {
      map['client_id'] = Variable<String>(clientId.value);
    }
    if (roomId.present) {
      map['room_id'] = Variable<String>(roomId.value);
    }
    if (inspectionId.present) {
      map['inspection_id'] = Variable<String>(inspectionId.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<String>(itemId.value);
    }
    if (kind.present) {
      map['kind'] = Variable<String>(kind.value);
    }
    if (awaitingMarkup.present) {
      map['awaiting_markup'] = Variable<bool>(awaitingMarkup.value);
    }
    if (relativePath.present) {
      map['relative_path'] = Variable<String>(relativePath.value);
    }
    if (filename.present) {
      map['filename'] = Variable<String>(filename.value);
    }
    if (mimeType.present) {
      map['mime_type'] = Variable<String>(mimeType.value);
    }
    if (sizeBytes.present) {
      map['size_bytes'] = Variable<int>(sizeBytes.value);
    }
    if (durationSec.present) {
      map['duration_sec'] = Variable<int>(durationSec.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (annotations.present) {
      map['annotations'] = Variable<String>(annotations.value);
    }
    if (uploadedId.present) {
      map['uploaded_id'] = Variable<String>(uploadedId.value);
    }
    if (registrationPrepared.present) {
      map['registration_prepared'] = Variable<bool>(registrationPrepared.value);
    }
    if (registrationNote.present) {
      map['registration_note'] = Variable<String>(registrationNote.value);
    }
    if (registrationAnnotations.present) {
      map['registration_annotations'] = Variable<String>(
        registrationAnnotations.value,
      );
    }
    if (registrationAnnotationsApplied.present) {
      map['registration_annotations_applied'] = Variable<bool>(
        registrationAnnotationsApplied.value,
      );
    }
    if (registrationItemApplied.present) {
      map['registration_item_applied'] = Variable<bool>(
        registrationItemApplied.value,
      );
    }
    if (storagePath.present) {
      map['storage_path'] = Variable<String>(storagePath.value);
    }
    if (deleteRequested.present) {
      map['delete_requested'] = Variable<bool>(deleteRequested.value);
    }
    if (claimedAt.present) {
      map['claimed_at'] = Variable<DateTime>(claimedAt.value);
    }
    if (leaseId.present) {
      map['lease_id'] = Variable<String>(leaseId.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingCapturesCompanion(')
          ..write('id: $id, ')
          ..write('ownerId: $ownerId, ')
          ..write('clientId: $clientId, ')
          ..write('roomId: $roomId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('itemId: $itemId, ')
          ..write('kind: $kind, ')
          ..write('awaitingMarkup: $awaitingMarkup, ')
          ..write('relativePath: $relativePath, ')
          ..write('filename: $filename, ')
          ..write('mimeType: $mimeType, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('durationSec: $durationSec, ')
          ..write('note: $note, ')
          ..write('annotations: $annotations, ')
          ..write('uploadedId: $uploadedId, ')
          ..write('registrationPrepared: $registrationPrepared, ')
          ..write('registrationNote: $registrationNote, ')
          ..write('registrationAnnotations: $registrationAnnotations, ')
          ..write(
            'registrationAnnotationsApplied: $registrationAnnotationsApplied, ',
          )
          ..write('registrationItemApplied: $registrationItemApplied, ')
          ..write('storagePath: $storagePath, ')
          ..write('deleteRequested: $deleteRequested, ')
          ..write('claimedAt: $claimedAt, ')
          ..write('leaseId: $leaseId, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $PendingRemoteEditsTable extends PendingRemoteEdits
    with TableInfo<$PendingRemoteEditsTable, PendingRemoteEdit> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingRemoteEditsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _captureIdMeta = const VerificationMeta(
    'captureId',
  );
  @override
  late final GeneratedColumn<String> captureId = GeneratedColumn<String>(
    'capture_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ownerIdMeta = const VerificationMeta(
    'ownerId',
  );
  @override
  late final GeneratedColumn<String> ownerId = GeneratedColumn<String>(
    'owner_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _inspectionIdMeta = const VerificationMeta(
    'inspectionId',
  );
  @override
  late final GeneratedColumn<String> inspectionId = GeneratedColumn<String>(
    'inspection_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _hasNoteMeta = const VerificationMeta(
    'hasNote',
  );
  @override
  late final GeneratedColumn<bool> hasNote = GeneratedColumn<bool>(
    'has_note',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("has_note" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _annotationsMeta = const VerificationMeta(
    'annotations',
  );
  @override
  late final GeneratedColumn<String> annotations = GeneratedColumn<String>(
    'annotations',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _hasAnnotationsMeta = const VerificationMeta(
    'hasAnnotations',
  );
  @override
  late final GeneratedColumn<bool> hasAnnotations = GeneratedColumn<bool>(
    'has_annotations',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("has_annotations" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _deleteRequestedMeta = const VerificationMeta(
    'deleteRequested',
  );
  @override
  late final GeneratedColumn<bool> deleteRequested = GeneratedColumn<bool>(
    'delete_requested',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("delete_requested" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _versionMeta = const VerificationMeta(
    'version',
  );
  @override
  late final GeneratedColumn<int> version = GeneratedColumn<int>(
    'version',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _attemptsMeta = const VerificationMeta(
    'attempts',
  );
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
    'attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastErrorMeta = const VerificationMeta(
    'lastError',
  );
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
    'last_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _claimedAtMeta = const VerificationMeta(
    'claimedAt',
  );
  @override
  late final GeneratedColumn<DateTime> claimedAt = GeneratedColumn<DateTime>(
    'claimed_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _leaseIdMeta = const VerificationMeta(
    'leaseId',
  );
  @override
  late final GeneratedColumn<String> leaseId = GeneratedColumn<String>(
    'lease_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    captureId,
    ownerId,
    inspectionId,
    note,
    hasNote,
    annotations,
    hasAnnotations,
    deleteRequested,
    version,
    attempts,
    lastError,
    claimedAt,
    leaseId,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_remote_edits';
  @override
  VerificationContext validateIntegrity(
    Insertable<PendingRemoteEdit> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('capture_id')) {
      context.handle(
        _captureIdMeta,
        captureId.isAcceptableOrUnknown(data['capture_id']!, _captureIdMeta),
      );
    } else if (isInserting) {
      context.missing(_captureIdMeta);
    }
    if (data.containsKey('owner_id')) {
      context.handle(
        _ownerIdMeta,
        ownerId.isAcceptableOrUnknown(data['owner_id']!, _ownerIdMeta),
      );
    } else if (isInserting) {
      context.missing(_ownerIdMeta);
    }
    if (data.containsKey('inspection_id')) {
      context.handle(
        _inspectionIdMeta,
        inspectionId.isAcceptableOrUnknown(
          data['inspection_id']!,
          _inspectionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_inspectionIdMeta);
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('has_note')) {
      context.handle(
        _hasNoteMeta,
        hasNote.isAcceptableOrUnknown(data['has_note']!, _hasNoteMeta),
      );
    }
    if (data.containsKey('annotations')) {
      context.handle(
        _annotationsMeta,
        annotations.isAcceptableOrUnknown(
          data['annotations']!,
          _annotationsMeta,
        ),
      );
    }
    if (data.containsKey('has_annotations')) {
      context.handle(
        _hasAnnotationsMeta,
        hasAnnotations.isAcceptableOrUnknown(
          data['has_annotations']!,
          _hasAnnotationsMeta,
        ),
      );
    }
    if (data.containsKey('delete_requested')) {
      context.handle(
        _deleteRequestedMeta,
        deleteRequested.isAcceptableOrUnknown(
          data['delete_requested']!,
          _deleteRequestedMeta,
        ),
      );
    }
    if (data.containsKey('version')) {
      context.handle(
        _versionMeta,
        version.isAcceptableOrUnknown(data['version']!, _versionMeta),
      );
    }
    if (data.containsKey('attempts')) {
      context.handle(
        _attemptsMeta,
        attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta),
      );
    }
    if (data.containsKey('last_error')) {
      context.handle(
        _lastErrorMeta,
        lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta),
      );
    }
    if (data.containsKey('claimed_at')) {
      context.handle(
        _claimedAtMeta,
        claimedAt.isAcceptableOrUnknown(data['claimed_at']!, _claimedAtMeta),
      );
    }
    if (data.containsKey('lease_id')) {
      context.handle(
        _leaseIdMeta,
        leaseId.isAcceptableOrUnknown(data['lease_id']!, _leaseIdMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {captureId};
  @override
  PendingRemoteEdit map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingRemoteEdit(
      captureId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}capture_id'],
      )!,
      ownerId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}owner_id'],
      )!,
      inspectionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}inspection_id'],
      )!,
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      hasNote: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}has_note'],
      )!,
      annotations: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}annotations'],
      ),
      hasAnnotations: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}has_annotations'],
      )!,
      deleteRequested: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}delete_requested'],
      )!,
      version: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}version'],
      )!,
      attempts: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attempts'],
      )!,
      lastError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error'],
      ),
      claimedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}claimed_at'],
      ),
      leaseId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}lease_id'],
      ),
    );
  }

  @override
  $PendingRemoteEditsTable createAlias(String alias) {
    return $PendingRemoteEditsTable(attachedDatabase, alias);
  }
}

class PendingRemoteEdit extends DataClass
    implements Insertable<PendingRemoteEdit> {
  final String captureId;
  final String ownerId;
  final String inspectionId;
  final String? note;
  final bool hasNote;
  final String? annotations;
  final bool hasAnnotations;
  final bool deleteRequested;
  final int version;
  final int attempts;
  final String? lastError;
  final DateTime? claimedAt;
  final String? leaseId;
  const PendingRemoteEdit({
    required this.captureId,
    required this.ownerId,
    required this.inspectionId,
    this.note,
    required this.hasNote,
    this.annotations,
    required this.hasAnnotations,
    required this.deleteRequested,
    required this.version,
    required this.attempts,
    this.lastError,
    this.claimedAt,
    this.leaseId,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['capture_id'] = Variable<String>(captureId);
    map['owner_id'] = Variable<String>(ownerId);
    map['inspection_id'] = Variable<String>(inspectionId);
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['has_note'] = Variable<bool>(hasNote);
    if (!nullToAbsent || annotations != null) {
      map['annotations'] = Variable<String>(annotations);
    }
    map['has_annotations'] = Variable<bool>(hasAnnotations);
    map['delete_requested'] = Variable<bool>(deleteRequested);
    map['version'] = Variable<int>(version);
    map['attempts'] = Variable<int>(attempts);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    if (!nullToAbsent || claimedAt != null) {
      map['claimed_at'] = Variable<DateTime>(claimedAt);
    }
    if (!nullToAbsent || leaseId != null) {
      map['lease_id'] = Variable<String>(leaseId);
    }
    return map;
  }

  PendingRemoteEditsCompanion toCompanion(bool nullToAbsent) {
    return PendingRemoteEditsCompanion(
      captureId: Value(captureId),
      ownerId: Value(ownerId),
      inspectionId: Value(inspectionId),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      hasNote: Value(hasNote),
      annotations: annotations == null && nullToAbsent
          ? const Value.absent()
          : Value(annotations),
      hasAnnotations: Value(hasAnnotations),
      deleteRequested: Value(deleteRequested),
      version: Value(version),
      attempts: Value(attempts),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      claimedAt: claimedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(claimedAt),
      leaseId: leaseId == null && nullToAbsent
          ? const Value.absent()
          : Value(leaseId),
    );
  }

  factory PendingRemoteEdit.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingRemoteEdit(
      captureId: serializer.fromJson<String>(json['captureId']),
      ownerId: serializer.fromJson<String>(json['ownerId']),
      inspectionId: serializer.fromJson<String>(json['inspectionId']),
      note: serializer.fromJson<String?>(json['note']),
      hasNote: serializer.fromJson<bool>(json['hasNote']),
      annotations: serializer.fromJson<String?>(json['annotations']),
      hasAnnotations: serializer.fromJson<bool>(json['hasAnnotations']),
      deleteRequested: serializer.fromJson<bool>(json['deleteRequested']),
      version: serializer.fromJson<int>(json['version']),
      attempts: serializer.fromJson<int>(json['attempts']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      claimedAt: serializer.fromJson<DateTime?>(json['claimedAt']),
      leaseId: serializer.fromJson<String?>(json['leaseId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'captureId': serializer.toJson<String>(captureId),
      'ownerId': serializer.toJson<String>(ownerId),
      'inspectionId': serializer.toJson<String>(inspectionId),
      'note': serializer.toJson<String?>(note),
      'hasNote': serializer.toJson<bool>(hasNote),
      'annotations': serializer.toJson<String?>(annotations),
      'hasAnnotations': serializer.toJson<bool>(hasAnnotations),
      'deleteRequested': serializer.toJson<bool>(deleteRequested),
      'version': serializer.toJson<int>(version),
      'attempts': serializer.toJson<int>(attempts),
      'lastError': serializer.toJson<String?>(lastError),
      'claimedAt': serializer.toJson<DateTime?>(claimedAt),
      'leaseId': serializer.toJson<String?>(leaseId),
    };
  }

  PendingRemoteEdit copyWith({
    String? captureId,
    String? ownerId,
    String? inspectionId,
    Value<String?> note = const Value.absent(),
    bool? hasNote,
    Value<String?> annotations = const Value.absent(),
    bool? hasAnnotations,
    bool? deleteRequested,
    int? version,
    int? attempts,
    Value<String?> lastError = const Value.absent(),
    Value<DateTime?> claimedAt = const Value.absent(),
    Value<String?> leaseId = const Value.absent(),
  }) => PendingRemoteEdit(
    captureId: captureId ?? this.captureId,
    ownerId: ownerId ?? this.ownerId,
    inspectionId: inspectionId ?? this.inspectionId,
    note: note.present ? note.value : this.note,
    hasNote: hasNote ?? this.hasNote,
    annotations: annotations.present ? annotations.value : this.annotations,
    hasAnnotations: hasAnnotations ?? this.hasAnnotations,
    deleteRequested: deleteRequested ?? this.deleteRequested,
    version: version ?? this.version,
    attempts: attempts ?? this.attempts,
    lastError: lastError.present ? lastError.value : this.lastError,
    claimedAt: claimedAt.present ? claimedAt.value : this.claimedAt,
    leaseId: leaseId.present ? leaseId.value : this.leaseId,
  );
  PendingRemoteEdit copyWithCompanion(PendingRemoteEditsCompanion data) {
    return PendingRemoteEdit(
      captureId: data.captureId.present ? data.captureId.value : this.captureId,
      ownerId: data.ownerId.present ? data.ownerId.value : this.ownerId,
      inspectionId: data.inspectionId.present
          ? data.inspectionId.value
          : this.inspectionId,
      note: data.note.present ? data.note.value : this.note,
      hasNote: data.hasNote.present ? data.hasNote.value : this.hasNote,
      annotations: data.annotations.present
          ? data.annotations.value
          : this.annotations,
      hasAnnotations: data.hasAnnotations.present
          ? data.hasAnnotations.value
          : this.hasAnnotations,
      deleteRequested: data.deleteRequested.present
          ? data.deleteRequested.value
          : this.deleteRequested,
      version: data.version.present ? data.version.value : this.version,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      claimedAt: data.claimedAt.present ? data.claimedAt.value : this.claimedAt,
      leaseId: data.leaseId.present ? data.leaseId.value : this.leaseId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingRemoteEdit(')
          ..write('captureId: $captureId, ')
          ..write('ownerId: $ownerId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('note: $note, ')
          ..write('hasNote: $hasNote, ')
          ..write('annotations: $annotations, ')
          ..write('hasAnnotations: $hasAnnotations, ')
          ..write('deleteRequested: $deleteRequested, ')
          ..write('version: $version, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('claimedAt: $claimedAt, ')
          ..write('leaseId: $leaseId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    captureId,
    ownerId,
    inspectionId,
    note,
    hasNote,
    annotations,
    hasAnnotations,
    deleteRequested,
    version,
    attempts,
    lastError,
    claimedAt,
    leaseId,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingRemoteEdit &&
          other.captureId == this.captureId &&
          other.ownerId == this.ownerId &&
          other.inspectionId == this.inspectionId &&
          other.note == this.note &&
          other.hasNote == this.hasNote &&
          other.annotations == this.annotations &&
          other.hasAnnotations == this.hasAnnotations &&
          other.deleteRequested == this.deleteRequested &&
          other.version == this.version &&
          other.attempts == this.attempts &&
          other.lastError == this.lastError &&
          other.claimedAt == this.claimedAt &&
          other.leaseId == this.leaseId);
}

class PendingRemoteEditsCompanion extends UpdateCompanion<PendingRemoteEdit> {
  final Value<String> captureId;
  final Value<String> ownerId;
  final Value<String> inspectionId;
  final Value<String?> note;
  final Value<bool> hasNote;
  final Value<String?> annotations;
  final Value<bool> hasAnnotations;
  final Value<bool> deleteRequested;
  final Value<int> version;
  final Value<int> attempts;
  final Value<String?> lastError;
  final Value<DateTime?> claimedAt;
  final Value<String?> leaseId;
  final Value<int> rowid;
  const PendingRemoteEditsCompanion({
    this.captureId = const Value.absent(),
    this.ownerId = const Value.absent(),
    this.inspectionId = const Value.absent(),
    this.note = const Value.absent(),
    this.hasNote = const Value.absent(),
    this.annotations = const Value.absent(),
    this.hasAnnotations = const Value.absent(),
    this.deleteRequested = const Value.absent(),
    this.version = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.claimedAt = const Value.absent(),
    this.leaseId = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PendingRemoteEditsCompanion.insert({
    required String captureId,
    required String ownerId,
    required String inspectionId,
    this.note = const Value.absent(),
    this.hasNote = const Value.absent(),
    this.annotations = const Value.absent(),
    this.hasAnnotations = const Value.absent(),
    this.deleteRequested = const Value.absent(),
    this.version = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.claimedAt = const Value.absent(),
    this.leaseId = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : captureId = Value(captureId),
       ownerId = Value(ownerId),
       inspectionId = Value(inspectionId);
  static Insertable<PendingRemoteEdit> custom({
    Expression<String>? captureId,
    Expression<String>? ownerId,
    Expression<String>? inspectionId,
    Expression<String>? note,
    Expression<bool>? hasNote,
    Expression<String>? annotations,
    Expression<bool>? hasAnnotations,
    Expression<bool>? deleteRequested,
    Expression<int>? version,
    Expression<int>? attempts,
    Expression<String>? lastError,
    Expression<DateTime>? claimedAt,
    Expression<String>? leaseId,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (captureId != null) 'capture_id': captureId,
      if (ownerId != null) 'owner_id': ownerId,
      if (inspectionId != null) 'inspection_id': inspectionId,
      if (note != null) 'note': note,
      if (hasNote != null) 'has_note': hasNote,
      if (annotations != null) 'annotations': annotations,
      if (hasAnnotations != null) 'has_annotations': hasAnnotations,
      if (deleteRequested != null) 'delete_requested': deleteRequested,
      if (version != null) 'version': version,
      if (attempts != null) 'attempts': attempts,
      if (lastError != null) 'last_error': lastError,
      if (claimedAt != null) 'claimed_at': claimedAt,
      if (leaseId != null) 'lease_id': leaseId,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PendingRemoteEditsCompanion copyWith({
    Value<String>? captureId,
    Value<String>? ownerId,
    Value<String>? inspectionId,
    Value<String?>? note,
    Value<bool>? hasNote,
    Value<String?>? annotations,
    Value<bool>? hasAnnotations,
    Value<bool>? deleteRequested,
    Value<int>? version,
    Value<int>? attempts,
    Value<String?>? lastError,
    Value<DateTime?>? claimedAt,
    Value<String?>? leaseId,
    Value<int>? rowid,
  }) {
    return PendingRemoteEditsCompanion(
      captureId: captureId ?? this.captureId,
      ownerId: ownerId ?? this.ownerId,
      inspectionId: inspectionId ?? this.inspectionId,
      note: note ?? this.note,
      hasNote: hasNote ?? this.hasNote,
      annotations: annotations ?? this.annotations,
      hasAnnotations: hasAnnotations ?? this.hasAnnotations,
      deleteRequested: deleteRequested ?? this.deleteRequested,
      version: version ?? this.version,
      attempts: attempts ?? this.attempts,
      lastError: lastError ?? this.lastError,
      claimedAt: claimedAt ?? this.claimedAt,
      leaseId: leaseId ?? this.leaseId,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (captureId.present) {
      map['capture_id'] = Variable<String>(captureId.value);
    }
    if (ownerId.present) {
      map['owner_id'] = Variable<String>(ownerId.value);
    }
    if (inspectionId.present) {
      map['inspection_id'] = Variable<String>(inspectionId.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (hasNote.present) {
      map['has_note'] = Variable<bool>(hasNote.value);
    }
    if (annotations.present) {
      map['annotations'] = Variable<String>(annotations.value);
    }
    if (hasAnnotations.present) {
      map['has_annotations'] = Variable<bool>(hasAnnotations.value);
    }
    if (deleteRequested.present) {
      map['delete_requested'] = Variable<bool>(deleteRequested.value);
    }
    if (version.present) {
      map['version'] = Variable<int>(version.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (claimedAt.present) {
      map['claimed_at'] = Variable<DateTime>(claimedAt.value);
    }
    if (leaseId.present) {
      map['lease_id'] = Variable<String>(leaseId.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingRemoteEditsCompanion(')
          ..write('captureId: $captureId, ')
          ..write('ownerId: $ownerId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('note: $note, ')
          ..write('hasNote: $hasNote, ')
          ..write('annotations: $annotations, ')
          ..write('hasAnnotations: $hasAnnotations, ')
          ..write('deleteRequested: $deleteRequested, ')
          ..write('version: $version, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('claimedAt: $claimedAt, ')
          ..write('leaseId: $leaseId, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $CaptureHandoffsTable extends CaptureHandoffs
    with TableInfo<$CaptureHandoffsTable, CaptureHandoff> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $CaptureHandoffsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _clientIdMeta = const VerificationMeta(
    'clientId',
  );
  @override
  late final GeneratedColumn<String> clientId = GeneratedColumn<String>(
    'client_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ownerIdMeta = const VerificationMeta(
    'ownerId',
  );
  @override
  late final GeneratedColumn<String> ownerId = GeneratedColumn<String>(
    'owner_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _inspectionIdMeta = const VerificationMeta(
    'inspectionId',
  );
  @override
  late final GeneratedColumn<String> inspectionId = GeneratedColumn<String>(
    'inspection_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _captureIdMeta = const VerificationMeta(
    'captureId',
  );
  @override
  late final GeneratedColumn<String> captureId = GeneratedColumn<String>(
    'capture_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    clientId,
    ownerId,
    inspectionId,
    captureId,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'capture_handoffs';
  @override
  VerificationContext validateIntegrity(
    Insertable<CaptureHandoff> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('client_id')) {
      context.handle(
        _clientIdMeta,
        clientId.isAcceptableOrUnknown(data['client_id']!, _clientIdMeta),
      );
    } else if (isInserting) {
      context.missing(_clientIdMeta);
    }
    if (data.containsKey('owner_id')) {
      context.handle(
        _ownerIdMeta,
        ownerId.isAcceptableOrUnknown(data['owner_id']!, _ownerIdMeta),
      );
    } else if (isInserting) {
      context.missing(_ownerIdMeta);
    }
    if (data.containsKey('inspection_id')) {
      context.handle(
        _inspectionIdMeta,
        inspectionId.isAcceptableOrUnknown(
          data['inspection_id']!,
          _inspectionIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_inspectionIdMeta);
    }
    if (data.containsKey('capture_id')) {
      context.handle(
        _captureIdMeta,
        captureId.isAcceptableOrUnknown(data['capture_id']!, _captureIdMeta),
      );
    } else if (isInserting) {
      context.missing(_captureIdMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {clientId};
  @override
  CaptureHandoff map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return CaptureHandoff(
      clientId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}client_id'],
      )!,
      ownerId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}owner_id'],
      )!,
      inspectionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}inspection_id'],
      )!,
      captureId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}capture_id'],
      )!,
    );
  }

  @override
  $CaptureHandoffsTable createAlias(String alias) {
    return $CaptureHandoffsTable(attachedDatabase, alias);
  }
}

class CaptureHandoff extends DataClass implements Insertable<CaptureHandoff> {
  final String clientId;
  final String ownerId;
  final String inspectionId;
  final String captureId;
  const CaptureHandoff({
    required this.clientId,
    required this.ownerId,
    required this.inspectionId,
    required this.captureId,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['client_id'] = Variable<String>(clientId);
    map['owner_id'] = Variable<String>(ownerId);
    map['inspection_id'] = Variable<String>(inspectionId);
    map['capture_id'] = Variable<String>(captureId);
    return map;
  }

  CaptureHandoffsCompanion toCompanion(bool nullToAbsent) {
    return CaptureHandoffsCompanion(
      clientId: Value(clientId),
      ownerId: Value(ownerId),
      inspectionId: Value(inspectionId),
      captureId: Value(captureId),
    );
  }

  factory CaptureHandoff.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return CaptureHandoff(
      clientId: serializer.fromJson<String>(json['clientId']),
      ownerId: serializer.fromJson<String>(json['ownerId']),
      inspectionId: serializer.fromJson<String>(json['inspectionId']),
      captureId: serializer.fromJson<String>(json['captureId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'clientId': serializer.toJson<String>(clientId),
      'ownerId': serializer.toJson<String>(ownerId),
      'inspectionId': serializer.toJson<String>(inspectionId),
      'captureId': serializer.toJson<String>(captureId),
    };
  }

  CaptureHandoff copyWith({
    String? clientId,
    String? ownerId,
    String? inspectionId,
    String? captureId,
  }) => CaptureHandoff(
    clientId: clientId ?? this.clientId,
    ownerId: ownerId ?? this.ownerId,
    inspectionId: inspectionId ?? this.inspectionId,
    captureId: captureId ?? this.captureId,
  );
  CaptureHandoff copyWithCompanion(CaptureHandoffsCompanion data) {
    return CaptureHandoff(
      clientId: data.clientId.present ? data.clientId.value : this.clientId,
      ownerId: data.ownerId.present ? data.ownerId.value : this.ownerId,
      inspectionId: data.inspectionId.present
          ? data.inspectionId.value
          : this.inspectionId,
      captureId: data.captureId.present ? data.captureId.value : this.captureId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('CaptureHandoff(')
          ..write('clientId: $clientId, ')
          ..write('ownerId: $ownerId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('captureId: $captureId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(clientId, ownerId, inspectionId, captureId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is CaptureHandoff &&
          other.clientId == this.clientId &&
          other.ownerId == this.ownerId &&
          other.inspectionId == this.inspectionId &&
          other.captureId == this.captureId);
}

class CaptureHandoffsCompanion extends UpdateCompanion<CaptureHandoff> {
  final Value<String> clientId;
  final Value<String> ownerId;
  final Value<String> inspectionId;
  final Value<String> captureId;
  final Value<int> rowid;
  const CaptureHandoffsCompanion({
    this.clientId = const Value.absent(),
    this.ownerId = const Value.absent(),
    this.inspectionId = const Value.absent(),
    this.captureId = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  CaptureHandoffsCompanion.insert({
    required String clientId,
    required String ownerId,
    required String inspectionId,
    required String captureId,
    this.rowid = const Value.absent(),
  }) : clientId = Value(clientId),
       ownerId = Value(ownerId),
       inspectionId = Value(inspectionId),
       captureId = Value(captureId);
  static Insertable<CaptureHandoff> custom({
    Expression<String>? clientId,
    Expression<String>? ownerId,
    Expression<String>? inspectionId,
    Expression<String>? captureId,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (clientId != null) 'client_id': clientId,
      if (ownerId != null) 'owner_id': ownerId,
      if (inspectionId != null) 'inspection_id': inspectionId,
      if (captureId != null) 'capture_id': captureId,
      if (rowid != null) 'rowid': rowid,
    });
  }

  CaptureHandoffsCompanion copyWith({
    Value<String>? clientId,
    Value<String>? ownerId,
    Value<String>? inspectionId,
    Value<String>? captureId,
    Value<int>? rowid,
  }) {
    return CaptureHandoffsCompanion(
      clientId: clientId ?? this.clientId,
      ownerId: ownerId ?? this.ownerId,
      inspectionId: inspectionId ?? this.inspectionId,
      captureId: captureId ?? this.captureId,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (clientId.present) {
      map['client_id'] = Variable<String>(clientId.value);
    }
    if (ownerId.present) {
      map['owner_id'] = Variable<String>(ownerId.value);
    }
    if (inspectionId.present) {
      map['inspection_id'] = Variable<String>(inspectionId.value);
    }
    if (captureId.present) {
      map['capture_id'] = Variable<String>(captureId.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('CaptureHandoffsCompanion(')
          ..write('clientId: $clientId, ')
          ..write('ownerId: $ownerId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('captureId: $captureId, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$CaptureQueue extends GeneratedDatabase {
  _$CaptureQueue(QueryExecutor e) : super(e);
  $CaptureQueueManager get managers => $CaptureQueueManager(this);
  late final $PendingCapturesTable pendingCaptures = $PendingCapturesTable(
    this,
  );
  late final $PendingRemoteEditsTable pendingRemoteEdits =
      $PendingRemoteEditsTable(this);
  late final $CaptureHandoffsTable captureHandoffs = $CaptureHandoffsTable(
    this,
  );
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    pendingCaptures,
    pendingRemoteEdits,
    captureHandoffs,
  ];
}

typedef $$PendingCapturesTableCreateCompanionBuilder =
    PendingCapturesCompanion Function({
      Value<int> id,
      Value<String?> ownerId,
      Value<String?> clientId,
      required String roomId,
      required String inspectionId,
      Value<String?> itemId,
      required String kind,
      Value<bool> awaitingMarkup,
      required String relativePath,
      required String filename,
      required String mimeType,
      required int sizeBytes,
      Value<int?> durationSec,
      Value<String?> note,
      Value<String?> annotations,
      Value<String?> uploadedId,
      Value<bool> registrationPrepared,
      Value<String?> registrationNote,
      Value<String?> registrationAnnotations,
      Value<bool> registrationAnnotationsApplied,
      Value<bool> registrationItemApplied,
      Value<String?> storagePath,
      Value<bool> deleteRequested,
      Value<DateTime?> claimedAt,
      Value<String?> leaseId,
      Value<int> attempts,
      Value<String?> lastError,
      required DateTime createdAt,
    });
typedef $$PendingCapturesTableUpdateCompanionBuilder =
    PendingCapturesCompanion Function({
      Value<int> id,
      Value<String?> ownerId,
      Value<String?> clientId,
      Value<String> roomId,
      Value<String> inspectionId,
      Value<String?> itemId,
      Value<String> kind,
      Value<bool> awaitingMarkup,
      Value<String> relativePath,
      Value<String> filename,
      Value<String> mimeType,
      Value<int> sizeBytes,
      Value<int?> durationSec,
      Value<String?> note,
      Value<String?> annotations,
      Value<String?> uploadedId,
      Value<bool> registrationPrepared,
      Value<String?> registrationNote,
      Value<String?> registrationAnnotations,
      Value<bool> registrationAnnotationsApplied,
      Value<bool> registrationItemApplied,
      Value<String?> storagePath,
      Value<bool> deleteRequested,
      Value<DateTime?> claimedAt,
      Value<String?> leaseId,
      Value<int> attempts,
      Value<String?> lastError,
      Value<DateTime> createdAt,
    });

class $$PendingCapturesTableFilterComposer
    extends Composer<_$CaptureQueue, $PendingCapturesTable> {
  $$PendingCapturesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ownerId => $composableBuilder(
    column: $table.ownerId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get clientId => $composableBuilder(
    column: $table.clientId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get roomId => $composableBuilder(
    column: $table.roomId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get itemId => $composableBuilder(
    column: $table.itemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get awaitingMarkup => $composableBuilder(
    column: $table.awaitingMarkup,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get relativePath => $composableBuilder(
    column: $table.relativePath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get filename => $composableBuilder(
    column: $table.filename,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get mimeType => $composableBuilder(
    column: $table.mimeType,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sizeBytes => $composableBuilder(
    column: $table.sizeBytes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get durationSec => $composableBuilder(
    column: $table.durationSec,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get annotations => $composableBuilder(
    column: $table.annotations,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get uploadedId => $composableBuilder(
    column: $table.uploadedId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get registrationPrepared => $composableBuilder(
    column: $table.registrationPrepared,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get registrationNote => $composableBuilder(
    column: $table.registrationNote,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get registrationAnnotations => $composableBuilder(
    column: $table.registrationAnnotations,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get registrationAnnotationsApplied => $composableBuilder(
    column: $table.registrationAnnotationsApplied,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get registrationItemApplied => $composableBuilder(
    column: $table.registrationItemApplied,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get storagePath => $composableBuilder(
    column: $table.storagePath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get deleteRequested => $composableBuilder(
    column: $table.deleteRequested,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get claimedAt => $composableBuilder(
    column: $table.claimedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get leaseId => $composableBuilder(
    column: $table.leaseId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PendingCapturesTableOrderingComposer
    extends Composer<_$CaptureQueue, $PendingCapturesTable> {
  $$PendingCapturesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ownerId => $composableBuilder(
    column: $table.ownerId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get clientId => $composableBuilder(
    column: $table.clientId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get roomId => $composableBuilder(
    column: $table.roomId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get itemId => $composableBuilder(
    column: $table.itemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get awaitingMarkup => $composableBuilder(
    column: $table.awaitingMarkup,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get relativePath => $composableBuilder(
    column: $table.relativePath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get filename => $composableBuilder(
    column: $table.filename,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get mimeType => $composableBuilder(
    column: $table.mimeType,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sizeBytes => $composableBuilder(
    column: $table.sizeBytes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get durationSec => $composableBuilder(
    column: $table.durationSec,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get annotations => $composableBuilder(
    column: $table.annotations,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get uploadedId => $composableBuilder(
    column: $table.uploadedId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get registrationPrepared => $composableBuilder(
    column: $table.registrationPrepared,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get registrationNote => $composableBuilder(
    column: $table.registrationNote,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get registrationAnnotations => $composableBuilder(
    column: $table.registrationAnnotations,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get registrationAnnotationsApplied =>
      $composableBuilder(
        column: $table.registrationAnnotationsApplied,
        builder: (column) => ColumnOrderings(column),
      );

  ColumnOrderings<bool> get registrationItemApplied => $composableBuilder(
    column: $table.registrationItemApplied,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get storagePath => $composableBuilder(
    column: $table.storagePath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get deleteRequested => $composableBuilder(
    column: $table.deleteRequested,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get claimedAt => $composableBuilder(
    column: $table.claimedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get leaseId => $composableBuilder(
    column: $table.leaseId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PendingCapturesTableAnnotationComposer
    extends Composer<_$CaptureQueue, $PendingCapturesTable> {
  $$PendingCapturesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get ownerId =>
      $composableBuilder(column: $table.ownerId, builder: (column) => column);

  GeneratedColumn<String> get clientId =>
      $composableBuilder(column: $table.clientId, builder: (column) => column);

  GeneratedColumn<String> get roomId =>
      $composableBuilder(column: $table.roomId, builder: (column) => column);

  GeneratedColumn<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get itemId =>
      $composableBuilder(column: $table.itemId, builder: (column) => column);

  GeneratedColumn<String> get kind =>
      $composableBuilder(column: $table.kind, builder: (column) => column);

  GeneratedColumn<bool> get awaitingMarkup => $composableBuilder(
    column: $table.awaitingMarkup,
    builder: (column) => column,
  );

  GeneratedColumn<String> get relativePath => $composableBuilder(
    column: $table.relativePath,
    builder: (column) => column,
  );

  GeneratedColumn<String> get filename =>
      $composableBuilder(column: $table.filename, builder: (column) => column);

  GeneratedColumn<String> get mimeType =>
      $composableBuilder(column: $table.mimeType, builder: (column) => column);

  GeneratedColumn<int> get sizeBytes =>
      $composableBuilder(column: $table.sizeBytes, builder: (column) => column);

  GeneratedColumn<int> get durationSec => $composableBuilder(
    column: $table.durationSec,
    builder: (column) => column,
  );

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<String> get annotations => $composableBuilder(
    column: $table.annotations,
    builder: (column) => column,
  );

  GeneratedColumn<String> get uploadedId => $composableBuilder(
    column: $table.uploadedId,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get registrationPrepared => $composableBuilder(
    column: $table.registrationPrepared,
    builder: (column) => column,
  );

  GeneratedColumn<String> get registrationNote => $composableBuilder(
    column: $table.registrationNote,
    builder: (column) => column,
  );

  GeneratedColumn<String> get registrationAnnotations => $composableBuilder(
    column: $table.registrationAnnotations,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get registrationAnnotationsApplied =>
      $composableBuilder(
        column: $table.registrationAnnotationsApplied,
        builder: (column) => column,
      );

  GeneratedColumn<bool> get registrationItemApplied => $composableBuilder(
    column: $table.registrationItemApplied,
    builder: (column) => column,
  );

  GeneratedColumn<String> get storagePath => $composableBuilder(
    column: $table.storagePath,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get deleteRequested => $composableBuilder(
    column: $table.deleteRequested,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get claimedAt =>
      $composableBuilder(column: $table.claimedAt, builder: (column) => column);

  GeneratedColumn<String> get leaseId =>
      $composableBuilder(column: $table.leaseId, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$PendingCapturesTableTableManager
    extends
        RootTableManager<
          _$CaptureQueue,
          $PendingCapturesTable,
          PendingCapture,
          $$PendingCapturesTableFilterComposer,
          $$PendingCapturesTableOrderingComposer,
          $$PendingCapturesTableAnnotationComposer,
          $$PendingCapturesTableCreateCompanionBuilder,
          $$PendingCapturesTableUpdateCompanionBuilder,
          (
            PendingCapture,
            BaseReferences<
              _$CaptureQueue,
              $PendingCapturesTable,
              PendingCapture
            >,
          ),
          PendingCapture,
          PrefetchHooks Function()
        > {
  $$PendingCapturesTableTableManager(
    _$CaptureQueue db,
    $PendingCapturesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingCapturesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingCapturesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingCapturesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String?> ownerId = const Value.absent(),
                Value<String?> clientId = const Value.absent(),
                Value<String> roomId = const Value.absent(),
                Value<String> inspectionId = const Value.absent(),
                Value<String?> itemId = const Value.absent(),
                Value<String> kind = const Value.absent(),
                Value<bool> awaitingMarkup = const Value.absent(),
                Value<String> relativePath = const Value.absent(),
                Value<String> filename = const Value.absent(),
                Value<String> mimeType = const Value.absent(),
                Value<int> sizeBytes = const Value.absent(),
                Value<int?> durationSec = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String?> annotations = const Value.absent(),
                Value<String?> uploadedId = const Value.absent(),
                Value<bool> registrationPrepared = const Value.absent(),
                Value<String?> registrationNote = const Value.absent(),
                Value<String?> registrationAnnotations = const Value.absent(),
                Value<bool> registrationAnnotationsApplied =
                    const Value.absent(),
                Value<bool> registrationItemApplied = const Value.absent(),
                Value<String?> storagePath = const Value.absent(),
                Value<bool> deleteRequested = const Value.absent(),
                Value<DateTime?> claimedAt = const Value.absent(),
                Value<String?> leaseId = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => PendingCapturesCompanion(
                id: id,
                ownerId: ownerId,
                clientId: clientId,
                roomId: roomId,
                inspectionId: inspectionId,
                itemId: itemId,
                kind: kind,
                awaitingMarkup: awaitingMarkup,
                relativePath: relativePath,
                filename: filename,
                mimeType: mimeType,
                sizeBytes: sizeBytes,
                durationSec: durationSec,
                note: note,
                annotations: annotations,
                uploadedId: uploadedId,
                registrationPrepared: registrationPrepared,
                registrationNote: registrationNote,
                registrationAnnotations: registrationAnnotations,
                registrationAnnotationsApplied: registrationAnnotationsApplied,
                registrationItemApplied: registrationItemApplied,
                storagePath: storagePath,
                deleteRequested: deleteRequested,
                claimedAt: claimedAt,
                leaseId: leaseId,
                attempts: attempts,
                lastError: lastError,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String?> ownerId = const Value.absent(),
                Value<String?> clientId = const Value.absent(),
                required String roomId,
                required String inspectionId,
                Value<String?> itemId = const Value.absent(),
                required String kind,
                Value<bool> awaitingMarkup = const Value.absent(),
                required String relativePath,
                required String filename,
                required String mimeType,
                required int sizeBytes,
                Value<int?> durationSec = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String?> annotations = const Value.absent(),
                Value<String?> uploadedId = const Value.absent(),
                Value<bool> registrationPrepared = const Value.absent(),
                Value<String?> registrationNote = const Value.absent(),
                Value<String?> registrationAnnotations = const Value.absent(),
                Value<bool> registrationAnnotationsApplied =
                    const Value.absent(),
                Value<bool> registrationItemApplied = const Value.absent(),
                Value<String?> storagePath = const Value.absent(),
                Value<bool> deleteRequested = const Value.absent(),
                Value<DateTime?> claimedAt = const Value.absent(),
                Value<String?> leaseId = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                required DateTime createdAt,
              }) => PendingCapturesCompanion.insert(
                id: id,
                ownerId: ownerId,
                clientId: clientId,
                roomId: roomId,
                inspectionId: inspectionId,
                itemId: itemId,
                kind: kind,
                awaitingMarkup: awaitingMarkup,
                relativePath: relativePath,
                filename: filename,
                mimeType: mimeType,
                sizeBytes: sizeBytes,
                durationSec: durationSec,
                note: note,
                annotations: annotations,
                uploadedId: uploadedId,
                registrationPrepared: registrationPrepared,
                registrationNote: registrationNote,
                registrationAnnotations: registrationAnnotations,
                registrationAnnotationsApplied: registrationAnnotationsApplied,
                registrationItemApplied: registrationItemApplied,
                storagePath: storagePath,
                deleteRequested: deleteRequested,
                claimedAt: claimedAt,
                leaseId: leaseId,
                attempts: attempts,
                lastError: lastError,
                createdAt: createdAt,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PendingCapturesTableProcessedTableManager =
    ProcessedTableManager<
      _$CaptureQueue,
      $PendingCapturesTable,
      PendingCapture,
      $$PendingCapturesTableFilterComposer,
      $$PendingCapturesTableOrderingComposer,
      $$PendingCapturesTableAnnotationComposer,
      $$PendingCapturesTableCreateCompanionBuilder,
      $$PendingCapturesTableUpdateCompanionBuilder,
      (
        PendingCapture,
        BaseReferences<_$CaptureQueue, $PendingCapturesTable, PendingCapture>,
      ),
      PendingCapture,
      PrefetchHooks Function()
    >;
typedef $$PendingRemoteEditsTableCreateCompanionBuilder =
    PendingRemoteEditsCompanion Function({
      required String captureId,
      required String ownerId,
      required String inspectionId,
      Value<String?> note,
      Value<bool> hasNote,
      Value<String?> annotations,
      Value<bool> hasAnnotations,
      Value<bool> deleteRequested,
      Value<int> version,
      Value<int> attempts,
      Value<String?> lastError,
      Value<DateTime?> claimedAt,
      Value<String?> leaseId,
      Value<int> rowid,
    });
typedef $$PendingRemoteEditsTableUpdateCompanionBuilder =
    PendingRemoteEditsCompanion Function({
      Value<String> captureId,
      Value<String> ownerId,
      Value<String> inspectionId,
      Value<String?> note,
      Value<bool> hasNote,
      Value<String?> annotations,
      Value<bool> hasAnnotations,
      Value<bool> deleteRequested,
      Value<int> version,
      Value<int> attempts,
      Value<String?> lastError,
      Value<DateTime?> claimedAt,
      Value<String?> leaseId,
      Value<int> rowid,
    });

class $$PendingRemoteEditsTableFilterComposer
    extends Composer<_$CaptureQueue, $PendingRemoteEditsTable> {
  $$PendingRemoteEditsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get captureId => $composableBuilder(
    column: $table.captureId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ownerId => $composableBuilder(
    column: $table.ownerId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get hasNote => $composableBuilder(
    column: $table.hasNote,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get annotations => $composableBuilder(
    column: $table.annotations,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get hasAnnotations => $composableBuilder(
    column: $table.hasAnnotations,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get deleteRequested => $composableBuilder(
    column: $table.deleteRequested,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get claimedAt => $composableBuilder(
    column: $table.claimedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get leaseId => $composableBuilder(
    column: $table.leaseId,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PendingRemoteEditsTableOrderingComposer
    extends Composer<_$CaptureQueue, $PendingRemoteEditsTable> {
  $$PendingRemoteEditsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get captureId => $composableBuilder(
    column: $table.captureId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ownerId => $composableBuilder(
    column: $table.ownerId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get hasNote => $composableBuilder(
    column: $table.hasNote,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get annotations => $composableBuilder(
    column: $table.annotations,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get hasAnnotations => $composableBuilder(
    column: $table.hasAnnotations,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get deleteRequested => $composableBuilder(
    column: $table.deleteRequested,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get claimedAt => $composableBuilder(
    column: $table.claimedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get leaseId => $composableBuilder(
    column: $table.leaseId,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PendingRemoteEditsTableAnnotationComposer
    extends Composer<_$CaptureQueue, $PendingRemoteEditsTable> {
  $$PendingRemoteEditsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get captureId =>
      $composableBuilder(column: $table.captureId, builder: (column) => column);

  GeneratedColumn<String> get ownerId =>
      $composableBuilder(column: $table.ownerId, builder: (column) => column);

  GeneratedColumn<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<bool> get hasNote =>
      $composableBuilder(column: $table.hasNote, builder: (column) => column);

  GeneratedColumn<String> get annotations => $composableBuilder(
    column: $table.annotations,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get hasAnnotations => $composableBuilder(
    column: $table.hasAnnotations,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get deleteRequested => $composableBuilder(
    column: $table.deleteRequested,
    builder: (column) => column,
  );

  GeneratedColumn<int> get version =>
      $composableBuilder(column: $table.version, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<DateTime> get claimedAt =>
      $composableBuilder(column: $table.claimedAt, builder: (column) => column);

  GeneratedColumn<String> get leaseId =>
      $composableBuilder(column: $table.leaseId, builder: (column) => column);
}

class $$PendingRemoteEditsTableTableManager
    extends
        RootTableManager<
          _$CaptureQueue,
          $PendingRemoteEditsTable,
          PendingRemoteEdit,
          $$PendingRemoteEditsTableFilterComposer,
          $$PendingRemoteEditsTableOrderingComposer,
          $$PendingRemoteEditsTableAnnotationComposer,
          $$PendingRemoteEditsTableCreateCompanionBuilder,
          $$PendingRemoteEditsTableUpdateCompanionBuilder,
          (
            PendingRemoteEdit,
            BaseReferences<
              _$CaptureQueue,
              $PendingRemoteEditsTable,
              PendingRemoteEdit
            >,
          ),
          PendingRemoteEdit,
          PrefetchHooks Function()
        > {
  $$PendingRemoteEditsTableTableManager(
    _$CaptureQueue db,
    $PendingRemoteEditsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingRemoteEditsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingRemoteEditsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingRemoteEditsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> captureId = const Value.absent(),
                Value<String> ownerId = const Value.absent(),
                Value<String> inspectionId = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<bool> hasNote = const Value.absent(),
                Value<String?> annotations = const Value.absent(),
                Value<bool> hasAnnotations = const Value.absent(),
                Value<bool> deleteRequested = const Value.absent(),
                Value<int> version = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<DateTime?> claimedAt = const Value.absent(),
                Value<String?> leaseId = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PendingRemoteEditsCompanion(
                captureId: captureId,
                ownerId: ownerId,
                inspectionId: inspectionId,
                note: note,
                hasNote: hasNote,
                annotations: annotations,
                hasAnnotations: hasAnnotations,
                deleteRequested: deleteRequested,
                version: version,
                attempts: attempts,
                lastError: lastError,
                claimedAt: claimedAt,
                leaseId: leaseId,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String captureId,
                required String ownerId,
                required String inspectionId,
                Value<String?> note = const Value.absent(),
                Value<bool> hasNote = const Value.absent(),
                Value<String?> annotations = const Value.absent(),
                Value<bool> hasAnnotations = const Value.absent(),
                Value<bool> deleteRequested = const Value.absent(),
                Value<int> version = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<DateTime?> claimedAt = const Value.absent(),
                Value<String?> leaseId = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PendingRemoteEditsCompanion.insert(
                captureId: captureId,
                ownerId: ownerId,
                inspectionId: inspectionId,
                note: note,
                hasNote: hasNote,
                annotations: annotations,
                hasAnnotations: hasAnnotations,
                deleteRequested: deleteRequested,
                version: version,
                attempts: attempts,
                lastError: lastError,
                claimedAt: claimedAt,
                leaseId: leaseId,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PendingRemoteEditsTableProcessedTableManager =
    ProcessedTableManager<
      _$CaptureQueue,
      $PendingRemoteEditsTable,
      PendingRemoteEdit,
      $$PendingRemoteEditsTableFilterComposer,
      $$PendingRemoteEditsTableOrderingComposer,
      $$PendingRemoteEditsTableAnnotationComposer,
      $$PendingRemoteEditsTableCreateCompanionBuilder,
      $$PendingRemoteEditsTableUpdateCompanionBuilder,
      (
        PendingRemoteEdit,
        BaseReferences<
          _$CaptureQueue,
          $PendingRemoteEditsTable,
          PendingRemoteEdit
        >,
      ),
      PendingRemoteEdit,
      PrefetchHooks Function()
    >;
typedef $$CaptureHandoffsTableCreateCompanionBuilder =
    CaptureHandoffsCompanion Function({
      required String clientId,
      required String ownerId,
      required String inspectionId,
      required String captureId,
      Value<int> rowid,
    });
typedef $$CaptureHandoffsTableUpdateCompanionBuilder =
    CaptureHandoffsCompanion Function({
      Value<String> clientId,
      Value<String> ownerId,
      Value<String> inspectionId,
      Value<String> captureId,
      Value<int> rowid,
    });

class $$CaptureHandoffsTableFilterComposer
    extends Composer<_$CaptureQueue, $CaptureHandoffsTable> {
  $$CaptureHandoffsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get clientId => $composableBuilder(
    column: $table.clientId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ownerId => $composableBuilder(
    column: $table.ownerId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get captureId => $composableBuilder(
    column: $table.captureId,
    builder: (column) => ColumnFilters(column),
  );
}

class $$CaptureHandoffsTableOrderingComposer
    extends Composer<_$CaptureQueue, $CaptureHandoffsTable> {
  $$CaptureHandoffsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get clientId => $composableBuilder(
    column: $table.clientId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ownerId => $composableBuilder(
    column: $table.ownerId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get captureId => $composableBuilder(
    column: $table.captureId,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$CaptureHandoffsTableAnnotationComposer
    extends Composer<_$CaptureQueue, $CaptureHandoffsTable> {
  $$CaptureHandoffsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get clientId =>
      $composableBuilder(column: $table.clientId, builder: (column) => column);

  GeneratedColumn<String> get ownerId =>
      $composableBuilder(column: $table.ownerId, builder: (column) => column);

  GeneratedColumn<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get captureId =>
      $composableBuilder(column: $table.captureId, builder: (column) => column);
}

class $$CaptureHandoffsTableTableManager
    extends
        RootTableManager<
          _$CaptureQueue,
          $CaptureHandoffsTable,
          CaptureHandoff,
          $$CaptureHandoffsTableFilterComposer,
          $$CaptureHandoffsTableOrderingComposer,
          $$CaptureHandoffsTableAnnotationComposer,
          $$CaptureHandoffsTableCreateCompanionBuilder,
          $$CaptureHandoffsTableUpdateCompanionBuilder,
          (
            CaptureHandoff,
            BaseReferences<
              _$CaptureQueue,
              $CaptureHandoffsTable,
              CaptureHandoff
            >,
          ),
          CaptureHandoff,
          PrefetchHooks Function()
        > {
  $$CaptureHandoffsTableTableManager(
    _$CaptureQueue db,
    $CaptureHandoffsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$CaptureHandoffsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$CaptureHandoffsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$CaptureHandoffsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> clientId = const Value.absent(),
                Value<String> ownerId = const Value.absent(),
                Value<String> inspectionId = const Value.absent(),
                Value<String> captureId = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => CaptureHandoffsCompanion(
                clientId: clientId,
                ownerId: ownerId,
                inspectionId: inspectionId,
                captureId: captureId,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String clientId,
                required String ownerId,
                required String inspectionId,
                required String captureId,
                Value<int> rowid = const Value.absent(),
              }) => CaptureHandoffsCompanion.insert(
                clientId: clientId,
                ownerId: ownerId,
                inspectionId: inspectionId,
                captureId: captureId,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$CaptureHandoffsTableProcessedTableManager =
    ProcessedTableManager<
      _$CaptureQueue,
      $CaptureHandoffsTable,
      CaptureHandoff,
      $$CaptureHandoffsTableFilterComposer,
      $$CaptureHandoffsTableOrderingComposer,
      $$CaptureHandoffsTableAnnotationComposer,
      $$CaptureHandoffsTableCreateCompanionBuilder,
      $$CaptureHandoffsTableUpdateCompanionBuilder,
      (
        CaptureHandoff,
        BaseReferences<_$CaptureQueue, $CaptureHandoffsTable, CaptureHandoff>,
      ),
      CaptureHandoff,
      PrefetchHooks Function()
    >;

class $CaptureQueueManager {
  final _$CaptureQueue _db;
  $CaptureQueueManager(this._db);
  $$PendingCapturesTableTableManager get pendingCaptures =>
      $$PendingCapturesTableTableManager(_db, _db.pendingCaptures);
  $$PendingRemoteEditsTableTableManager get pendingRemoteEdits =>
      $$PendingRemoteEditsTableTableManager(_db, _db.pendingRemoteEdits);
  $$CaptureHandoffsTableTableManager get captureHandoffs =>
      $$CaptureHandoffsTableTableManager(_db, _db.captureHandoffs);
}
