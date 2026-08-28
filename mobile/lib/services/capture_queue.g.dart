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
  static const VerificationMeta _kindMeta = const VerificationMeta('kind');
  @override
  late final GeneratedColumn<String> kind = GeneratedColumn<String>(
    'kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
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
    roomId,
    inspectionId,
    kind,
    relativePath,
    filename,
    mimeType,
    sizeBytes,
    durationSec,
    note,
    annotations,
    uploadedId,
    claimedAt,
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
    if (data.containsKey('kind')) {
      context.handle(
        _kindMeta,
        kind.isAcceptableOrUnknown(data['kind']!, _kindMeta),
      );
    } else if (isInserting) {
      context.missing(_kindMeta);
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
    if (data.containsKey('claimed_at')) {
      context.handle(
        _claimedAtMeta,
        claimedAt.isAcceptableOrUnknown(data['claimed_at']!, _claimedAtMeta),
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
      roomId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}room_id'],
      )!,
      inspectionId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}inspection_id'],
      )!,
      kind: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}kind'],
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
      claimedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}claimed_at'],
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
  final String roomId;
  final String inspectionId;
  final String kind;

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

  /// Held by whichever uploader is working on this row. Background transfers run in
  /// their own isolate with their own database handle, so a re-entrancy flag in memory
  /// (which is all the web client needs) would not be seen by the other side.
  final DateTime? claimedAt;
  final int attempts;
  final String? lastError;
  final DateTime createdAt;
  const PendingCapture({
    required this.id,
    required this.roomId,
    required this.inspectionId,
    required this.kind,
    required this.relativePath,
    required this.filename,
    required this.mimeType,
    required this.sizeBytes,
    this.durationSec,
    this.note,
    this.annotations,
    this.uploadedId,
    this.claimedAt,
    required this.attempts,
    this.lastError,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['room_id'] = Variable<String>(roomId);
    map['inspection_id'] = Variable<String>(inspectionId);
    map['kind'] = Variable<String>(kind);
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
    if (!nullToAbsent || claimedAt != null) {
      map['claimed_at'] = Variable<DateTime>(claimedAt);
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
      roomId: Value(roomId),
      inspectionId: Value(inspectionId),
      kind: Value(kind),
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
      claimedAt: claimedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(claimedAt),
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
      roomId: serializer.fromJson<String>(json['roomId']),
      inspectionId: serializer.fromJson<String>(json['inspectionId']),
      kind: serializer.fromJson<String>(json['kind']),
      relativePath: serializer.fromJson<String>(json['relativePath']),
      filename: serializer.fromJson<String>(json['filename']),
      mimeType: serializer.fromJson<String>(json['mimeType']),
      sizeBytes: serializer.fromJson<int>(json['sizeBytes']),
      durationSec: serializer.fromJson<int?>(json['durationSec']),
      note: serializer.fromJson<String?>(json['note']),
      annotations: serializer.fromJson<String?>(json['annotations']),
      uploadedId: serializer.fromJson<String?>(json['uploadedId']),
      claimedAt: serializer.fromJson<DateTime?>(json['claimedAt']),
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
      'roomId': serializer.toJson<String>(roomId),
      'inspectionId': serializer.toJson<String>(inspectionId),
      'kind': serializer.toJson<String>(kind),
      'relativePath': serializer.toJson<String>(relativePath),
      'filename': serializer.toJson<String>(filename),
      'mimeType': serializer.toJson<String>(mimeType),
      'sizeBytes': serializer.toJson<int>(sizeBytes),
      'durationSec': serializer.toJson<int?>(durationSec),
      'note': serializer.toJson<String?>(note),
      'annotations': serializer.toJson<String?>(annotations),
      'uploadedId': serializer.toJson<String?>(uploadedId),
      'claimedAt': serializer.toJson<DateTime?>(claimedAt),
      'attempts': serializer.toJson<int>(attempts),
      'lastError': serializer.toJson<String?>(lastError),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  PendingCapture copyWith({
    int? id,
    String? roomId,
    String? inspectionId,
    String? kind,
    String? relativePath,
    String? filename,
    String? mimeType,
    int? sizeBytes,
    Value<int?> durationSec = const Value.absent(),
    Value<String?> note = const Value.absent(),
    Value<String?> annotations = const Value.absent(),
    Value<String?> uploadedId = const Value.absent(),
    Value<DateTime?> claimedAt = const Value.absent(),
    int? attempts,
    Value<String?> lastError = const Value.absent(),
    DateTime? createdAt,
  }) => PendingCapture(
    id: id ?? this.id,
    roomId: roomId ?? this.roomId,
    inspectionId: inspectionId ?? this.inspectionId,
    kind: kind ?? this.kind,
    relativePath: relativePath ?? this.relativePath,
    filename: filename ?? this.filename,
    mimeType: mimeType ?? this.mimeType,
    sizeBytes: sizeBytes ?? this.sizeBytes,
    durationSec: durationSec.present ? durationSec.value : this.durationSec,
    note: note.present ? note.value : this.note,
    annotations: annotations.present ? annotations.value : this.annotations,
    uploadedId: uploadedId.present ? uploadedId.value : this.uploadedId,
    claimedAt: claimedAt.present ? claimedAt.value : this.claimedAt,
    attempts: attempts ?? this.attempts,
    lastError: lastError.present ? lastError.value : this.lastError,
    createdAt: createdAt ?? this.createdAt,
  );
  PendingCapture copyWithCompanion(PendingCapturesCompanion data) {
    return PendingCapture(
      id: data.id.present ? data.id.value : this.id,
      roomId: data.roomId.present ? data.roomId.value : this.roomId,
      inspectionId: data.inspectionId.present
          ? data.inspectionId.value
          : this.inspectionId,
      kind: data.kind.present ? data.kind.value : this.kind,
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
      claimedAt: data.claimedAt.present ? data.claimedAt.value : this.claimedAt,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingCapture(')
          ..write('id: $id, ')
          ..write('roomId: $roomId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('kind: $kind, ')
          ..write('relativePath: $relativePath, ')
          ..write('filename: $filename, ')
          ..write('mimeType: $mimeType, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('durationSec: $durationSec, ')
          ..write('note: $note, ')
          ..write('annotations: $annotations, ')
          ..write('uploadedId: $uploadedId, ')
          ..write('claimedAt: $claimedAt, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    roomId,
    inspectionId,
    kind,
    relativePath,
    filename,
    mimeType,
    sizeBytes,
    durationSec,
    note,
    annotations,
    uploadedId,
    claimedAt,
    attempts,
    lastError,
    createdAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingCapture &&
          other.id == this.id &&
          other.roomId == this.roomId &&
          other.inspectionId == this.inspectionId &&
          other.kind == this.kind &&
          other.relativePath == this.relativePath &&
          other.filename == this.filename &&
          other.mimeType == this.mimeType &&
          other.sizeBytes == this.sizeBytes &&
          other.durationSec == this.durationSec &&
          other.note == this.note &&
          other.annotations == this.annotations &&
          other.uploadedId == this.uploadedId &&
          other.claimedAt == this.claimedAt &&
          other.attempts == this.attempts &&
          other.lastError == this.lastError &&
          other.createdAt == this.createdAt);
}

class PendingCapturesCompanion extends UpdateCompanion<PendingCapture> {
  final Value<int> id;
  final Value<String> roomId;
  final Value<String> inspectionId;
  final Value<String> kind;
  final Value<String> relativePath;
  final Value<String> filename;
  final Value<String> mimeType;
  final Value<int> sizeBytes;
  final Value<int?> durationSec;
  final Value<String?> note;
  final Value<String?> annotations;
  final Value<String?> uploadedId;
  final Value<DateTime?> claimedAt;
  final Value<int> attempts;
  final Value<String?> lastError;
  final Value<DateTime> createdAt;
  const PendingCapturesCompanion({
    this.id = const Value.absent(),
    this.roomId = const Value.absent(),
    this.inspectionId = const Value.absent(),
    this.kind = const Value.absent(),
    this.relativePath = const Value.absent(),
    this.filename = const Value.absent(),
    this.mimeType = const Value.absent(),
    this.sizeBytes = const Value.absent(),
    this.durationSec = const Value.absent(),
    this.note = const Value.absent(),
    this.annotations = const Value.absent(),
    this.uploadedId = const Value.absent(),
    this.claimedAt = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  PendingCapturesCompanion.insert({
    this.id = const Value.absent(),
    required String roomId,
    required String inspectionId,
    required String kind,
    required String relativePath,
    required String filename,
    required String mimeType,
    required int sizeBytes,
    this.durationSec = const Value.absent(),
    this.note = const Value.absent(),
    this.annotations = const Value.absent(),
    this.uploadedId = const Value.absent(),
    this.claimedAt = const Value.absent(),
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
    Expression<String>? roomId,
    Expression<String>? inspectionId,
    Expression<String>? kind,
    Expression<String>? relativePath,
    Expression<String>? filename,
    Expression<String>? mimeType,
    Expression<int>? sizeBytes,
    Expression<int>? durationSec,
    Expression<String>? note,
    Expression<String>? annotations,
    Expression<String>? uploadedId,
    Expression<DateTime>? claimedAt,
    Expression<int>? attempts,
    Expression<String>? lastError,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (roomId != null) 'room_id': roomId,
      if (inspectionId != null) 'inspection_id': inspectionId,
      if (kind != null) 'kind': kind,
      if (relativePath != null) 'relative_path': relativePath,
      if (filename != null) 'filename': filename,
      if (mimeType != null) 'mime_type': mimeType,
      if (sizeBytes != null) 'size_bytes': sizeBytes,
      if (durationSec != null) 'duration_sec': durationSec,
      if (note != null) 'note': note,
      if (annotations != null) 'annotations': annotations,
      if (uploadedId != null) 'uploaded_id': uploadedId,
      if (claimedAt != null) 'claimed_at': claimedAt,
      if (attempts != null) 'attempts': attempts,
      if (lastError != null) 'last_error': lastError,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  PendingCapturesCompanion copyWith({
    Value<int>? id,
    Value<String>? roomId,
    Value<String>? inspectionId,
    Value<String>? kind,
    Value<String>? relativePath,
    Value<String>? filename,
    Value<String>? mimeType,
    Value<int>? sizeBytes,
    Value<int?>? durationSec,
    Value<String?>? note,
    Value<String?>? annotations,
    Value<String?>? uploadedId,
    Value<DateTime?>? claimedAt,
    Value<int>? attempts,
    Value<String?>? lastError,
    Value<DateTime>? createdAt,
  }) {
    return PendingCapturesCompanion(
      id: id ?? this.id,
      roomId: roomId ?? this.roomId,
      inspectionId: inspectionId ?? this.inspectionId,
      kind: kind ?? this.kind,
      relativePath: relativePath ?? this.relativePath,
      filename: filename ?? this.filename,
      mimeType: mimeType ?? this.mimeType,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      durationSec: durationSec ?? this.durationSec,
      note: note ?? this.note,
      annotations: annotations ?? this.annotations,
      uploadedId: uploadedId ?? this.uploadedId,
      claimedAt: claimedAt ?? this.claimedAt,
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
    if (roomId.present) {
      map['room_id'] = Variable<String>(roomId.value);
    }
    if (inspectionId.present) {
      map['inspection_id'] = Variable<String>(inspectionId.value);
    }
    if (kind.present) {
      map['kind'] = Variable<String>(kind.value);
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
    if (claimedAt.present) {
      map['claimed_at'] = Variable<DateTime>(claimedAt.value);
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
          ..write('roomId: $roomId, ')
          ..write('inspectionId: $inspectionId, ')
          ..write('kind: $kind, ')
          ..write('relativePath: $relativePath, ')
          ..write('filename: $filename, ')
          ..write('mimeType: $mimeType, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('durationSec: $durationSec, ')
          ..write('note: $note, ')
          ..write('annotations: $annotations, ')
          ..write('uploadedId: $uploadedId, ')
          ..write('claimedAt: $claimedAt, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('createdAt: $createdAt')
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
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [pendingCaptures];
}

typedef $$PendingCapturesTableCreateCompanionBuilder =
    PendingCapturesCompanion Function({
      Value<int> id,
      required String roomId,
      required String inspectionId,
      required String kind,
      required String relativePath,
      required String filename,
      required String mimeType,
      required int sizeBytes,
      Value<int?> durationSec,
      Value<String?> note,
      Value<String?> annotations,
      Value<String?> uploadedId,
      Value<DateTime?> claimedAt,
      Value<int> attempts,
      Value<String?> lastError,
      required DateTime createdAt,
    });
typedef $$PendingCapturesTableUpdateCompanionBuilder =
    PendingCapturesCompanion Function({
      Value<int> id,
      Value<String> roomId,
      Value<String> inspectionId,
      Value<String> kind,
      Value<String> relativePath,
      Value<String> filename,
      Value<String> mimeType,
      Value<int> sizeBytes,
      Value<int?> durationSec,
      Value<String?> note,
      Value<String?> annotations,
      Value<String?> uploadedId,
      Value<DateTime?> claimedAt,
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

  ColumnFilters<String> get roomId => $composableBuilder(
    column: $table.roomId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get kind => $composableBuilder(
    column: $table.kind,
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

  ColumnFilters<DateTime> get claimedAt => $composableBuilder(
    column: $table.claimedAt,
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

  ColumnOrderings<String> get roomId => $composableBuilder(
    column: $table.roomId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get kind => $composableBuilder(
    column: $table.kind,
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

  ColumnOrderings<DateTime> get claimedAt => $composableBuilder(
    column: $table.claimedAt,
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

  GeneratedColumn<String> get roomId =>
      $composableBuilder(column: $table.roomId, builder: (column) => column);

  GeneratedColumn<String> get inspectionId => $composableBuilder(
    column: $table.inspectionId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get kind =>
      $composableBuilder(column: $table.kind, builder: (column) => column);

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

  GeneratedColumn<DateTime> get claimedAt =>
      $composableBuilder(column: $table.claimedAt, builder: (column) => column);

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
                Value<String> roomId = const Value.absent(),
                Value<String> inspectionId = const Value.absent(),
                Value<String> kind = const Value.absent(),
                Value<String> relativePath = const Value.absent(),
                Value<String> filename = const Value.absent(),
                Value<String> mimeType = const Value.absent(),
                Value<int> sizeBytes = const Value.absent(),
                Value<int?> durationSec = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String?> annotations = const Value.absent(),
                Value<String?> uploadedId = const Value.absent(),
                Value<DateTime?> claimedAt = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => PendingCapturesCompanion(
                id: id,
                roomId: roomId,
                inspectionId: inspectionId,
                kind: kind,
                relativePath: relativePath,
                filename: filename,
                mimeType: mimeType,
                sizeBytes: sizeBytes,
                durationSec: durationSec,
                note: note,
                annotations: annotations,
                uploadedId: uploadedId,
                claimedAt: claimedAt,
                attempts: attempts,
                lastError: lastError,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String roomId,
                required String inspectionId,
                required String kind,
                required String relativePath,
                required String filename,
                required String mimeType,
                required int sizeBytes,
                Value<int?> durationSec = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String?> annotations = const Value.absent(),
                Value<String?> uploadedId = const Value.absent(),
                Value<DateTime?> claimedAt = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                required DateTime createdAt,
              }) => PendingCapturesCompanion.insert(
                id: id,
                roomId: roomId,
                inspectionId: inspectionId,
                kind: kind,
                relativePath: relativePath,
                filename: filename,
                mimeType: mimeType,
                sizeBytes: sizeBytes,
                durationSec: durationSec,
                note: note,
                annotations: annotations,
                uploadedId: uploadedId,
                claimedAt: claimedAt,
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

class $CaptureQueueManager {
  final _$CaptureQueue _db;
  $CaptureQueueManager(this._db);
  $$PendingCapturesTableTableManager get pendingCaptures =>
      $$PendingCapturesTableTableManager(_db, _db.pendingCaptures);
}
