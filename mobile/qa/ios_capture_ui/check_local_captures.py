#!/usr/bin/env python3
"""Read-only, exact-room Kivilo TestFlight queue and file-size audit."""

import argparse
import json
import os
import pathlib
import sqlite3
import subprocess
import tempfile


def devicectl(args, output):
    with output.open('w') as log:
        result = subprocess.run(
            ['xcrun', 'devicectl', *args, '--timeout', '40'],
            stdout=log,
            stderr=subprocess.STDOUT,
            timeout=50,
            check=False,
        )
    return result.returncode == 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--device', required=True)
    p.add_argument('--room', required=True)
    p.add_argument('--expected-photos', type=int)
    p.add_argument('--expected-videos', type=int)
    p.add_argument('--baseline-out', type=pathlib.Path)
    p.add_argument('--baseline-in', type=pathlib.Path)
    p.add_argument('--expected-new-photos', type=int)
    p.add_argument('--expected-new-videos', type=int)
    a = p.parse_args()

    with tempfile.TemporaryDirectory(prefix='kivilo-local-captures-') as tmp:
        directory = pathlib.Path(tmp)
        database = directory / 'kivilo_captures.sqlite'
        def journal_names(label):
            listing = directory / (label + '-documents.json')
            success = devicectl(
                ['device', 'info', 'files', '--device', a.device,
                 '--domain-type', 'appDataContainer',
                 '--domain-identifier', 'one.kivilo.kivilo',
                 '--subdirectory', 'Documents', '--json-output', str(listing)],
                directory / (label + '-documents.log'),
            )
            if not success:
                raise RuntimeError('Could not list Kivilo capture journal files')
            names = {entry['name'] for entry in
                     json.loads(listing.read_text())['result']['files']}
            return names & {
                'kivilo_captures.sqlite', 'kivilo_captures.sqlite-wal',
                'kivilo_captures.sqlite-shm',
            }

        before = journal_names('before')
        assert 'kivilo_captures.sqlite' in before, 'Kivilo journal missing'
        for suffix in ('', '-wal', '-shm'):
            if 'kivilo_captures.sqlite' + suffix not in before:
                continue
            source = 'Documents/kivilo_captures.sqlite' + suffix
            dest = pathlib.Path(str(database) + suffix)
            success = devicectl(
                ['device', 'copy', 'from', '--device', a.device,
                 '--source', source, '--destination', str(dest),
                 '--domain-type', 'appDataContainer',
                 '--domain-identifier', 'one.kivilo.kivilo'],
                directory / ('copy' + (suffix or '-main') + '.log'),
            )
            if not success:
                raise RuntimeError('Could not read Kivilo capture journal file')
        if journal_names('after') != before:
            raise RuntimeError('Kivilo journal sidecars changed during read; retry')

        db = sqlite3.connect('file:' + str(database) + '?mode=ro', uri=True)
        try:
            assert db.execute('pragma integrity_check').fetchone()[0] == 'ok'
            rows = db.execute(
                'select owner_id, client_id, kind, relative_path, size_bytes, '
                'duration_sec, uploaded_id, storage_path, claimed_at, attempts, '
                'last_error from pending_captures where room_id = ?',
                (a.room,),
            ).fetchall()
        finally:
            db.close()

        photos = [row for row in rows if row[2] == 'PHOTO']
        videos = [row for row in rows if row[2] == 'VIDEO']
        if a.expected_photos is not None:
            assert len(photos) == a.expected_photos, (len(photos), a.expected_photos)
        if a.expected_videos is not None:
            assert len(videos) == a.expected_videos, (len(videos), a.expected_videos)
        assert len(rows) == len(photos) + len(videos)
        assert len({row[0] for row in rows}) <= 1
        assert all(row[0] and row[1] and row[4] > 0 for row in rows)
        assert len({row[1] for row in rows}) == len(rows)

        matching = 0
        for owner in {row[0] for row in rows}:
            subtree = 'Library/Application Support/captures/' + owner
            listing = directory / 'capture-files.json'
            success = devicectl(
                ['device', 'info', 'files', '--device', a.device,
                 '--domain-type', 'appDataContainer',
                 '--domain-identifier', 'one.kivilo.kivilo',
                 '--subdirectory', subtree, '--json-output', str(listing)],
                directory / 'files.log',
            )
            if not success:
                raise RuntimeError('Could not list Kivilo saved capture files')
            files = {entry['name']: entry for entry in
                     json.loads(listing.read_text())['result']['files']}
            for row in (row for row in rows if row[0] == owner):
                relative = pathlib.PurePosixPath(row[3])
                assert str(relative.parent) == 'captures/' + owner
                entry = files.get(relative.name)
                assert entry and not entry['resources']['isDirectory']
                assert entry['metadata']['size'] == row[4], (
                    'Size mismatch', relative.name, row[4],
                    entry['metadata']['size'],
                )
                matching += 1

        assert matching == len(rows)
        if a.baseline_out:
            fd = os.open(a.baseline_out, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, 'w') as baseline_file:
                json.dump({
                    'room_id': a.room,
                    'photo_ids': sorted(row[1] for row in photos),
                    'video_ids': sorted(row[1] for row in videos),
                }, baseline_file)
        baseline = json.loads(a.baseline_in.read_text()) if a.baseline_in else {
            'room_id': a.room, 'photo_ids': [], 'video_ids': [],
        }
        assert baseline['room_id'] == a.room, 'Baseline belongs to another room'
        prior_photos = set(baseline['photo_ids'])
        prior_videos = set(baseline['video_ids'])
        new_photos = [row for row in photos if row[1] not in prior_photos]
        new_videos = [row for row in videos if row[1] not in prior_videos]
        if a.expected_new_photos is not None:
            assert len(new_photos) == a.expected_new_photos, (
                len(new_photos), a.expected_new_photos,
            )
        if a.expected_new_videos is not None:
            assert len(new_videos) == a.expected_new_videos, (
                len(new_videos), a.expected_new_videos,
            )
        print(json.dumps({
            'photo_rows': len(photos),
            'video_rows': len(videos),
            'unique_client_ids': len({row[1] for row in rows}),
            'durable_files_matching_sqlite_sizes': matching,
            'total_photo_bytes': sum(row[4] for row in photos),
            'total_video_bytes': sum(row[4] for row in videos),
            'video_durations_seconds': [row[5] for row in videos],
            'new_photo_rows_since_baseline': len(new_photos),
            'new_video_rows_since_baseline': len(new_videos),
            'new_photo_bytes_since_baseline': sum(row[4] for row in new_photos),
            'new_video_bytes_since_baseline': sum(row[4] for row in new_videos),
            'new_video_durations_seconds': [row[5] for row in new_videos],
            'pending_video_progress': [{
                'registered': bool(row[6]),
                'storage_path_set': bool(row[7]),
                'claimed_at': row[8],
                'attempts': row[9],
                'error_category': (
                    'none' if not row[10] else
                    'timeout' if 'respond' in row[10].lower() or 'timeout' in row[10].lower() else
                    'network' if 'connection' in row[10].lower() else
                    'authorization' if any(code in row[10].lower() for code in ('401', '403', 'token')) else
                    'other'
                ),
            } for row in videos],
        }, sort_keys=True))


if __name__ == '__main__':
    main()
