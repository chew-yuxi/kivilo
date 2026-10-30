"""Audit Kivilo's Apple catalog; --create-drafts creates missing review material.

Uses the operator's existing ~/.appstoreconnect/asc_check.py token() helper only.
Never submits review, changes an existing price, or prints authentication material.
Prices can subsequently be changed in App Store Connect without an app release.
"""
import argparse
import importlib.util
import json
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

APP_ID = '6821514302'
BASE = 'https://api.appstoreconnect.apple.com'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--create-drafts', action='store_true')
    parser.add_argument('--auth-helper', type=Path, default=Path.home() / '.appstoreconnect/asc_check.py')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--price-policy', choices=['exact', 'at-or-below', 'nearest'], default='exact',
                        help='Only change from exact with explicit owner approval; existing prices are never changed.')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('asc_auth', args.auth_helper)
    auth = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(auth)

    def request(path, payload=None):
        url = path if path.startswith(BASE + '/') else BASE + path
        if not url.startswith(BASE + '/v1/') and not url.startswith(BASE + '/v2/'):
            raise ValueError('Unexpected API endpoint')
        req = Request(url, data=json.dumps(payload).encode() if payload else None,
                      headers={'Authorization': 'Bearer ' + auth.token(), 'Content-Type': 'application/json'})
        try:
            with urlopen(req, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            details = json.loads(error.read()).get('errors', [])
            raise RuntimeError(f'Apple HTTP {error.code}: ' + '; '.join(e.get('detail', e.get('title', '')) for e in details)) from None

    def items(path):
        rows = []
        while path:
            data = request(path)
            rows.extend(data['data'])
            path = data.get('links', {}).get('next')
        return rows

    def create(kind, attributes, relationships, version='v1'):
        return request(f'/{version}/{kind}', {'data': {'type': kind, 'attributes': attributes, 'relationships': relationships}})['data']

    def relation(kind, identity):
        return {'data': {'type': kind, 'id': identity}}

    groups = items(f'/v1/apps/{APP_ID}/subscriptionGroups')
    report = []
    for kind, group_name, seats_list in [('personal', 'Kivilo Personal', [1]), ('team', 'Kivilo Team', range(1, 21))]:
        group = next((g for g in groups if g['attributes']['referenceName'] == group_name), None)
        if group is None and args.create_drafts:
            group = create('subscriptionGroups', {'referenceName': group_name}, {'app': relation('apps', APP_ID)})
        if group is None:
            report.append({'group': group_name, 'status': 'missing'})
            continue
        gid = group['id']
        versions = items(f'/v1/subscriptionGroups/{gid}/versions')
        if not versions and args.create_drafts:
            versions = [create('subscriptionGroupVersions', {}, {'subscriptionGroup': relation('subscriptionGroups', gid)})]
        if versions:
            version_id = versions[-1]['id']
            localized = items(f'/v1/subscriptionGroupVersions/{version_id}/localizations')
            if not localized and args.create_drafts:
                create('subscriptionGroupLocalizations', {'name': group_name, 'locale': 'en-GB'},
                       {'version': relation('subscriptionGroupVersions', version_id)}, 'v2')
        subscriptions = items(f'/v1/subscriptionGroups/{gid}/subscriptions?limit=100')
        for seats in seats_list:
            product = 'kivilo_pro_monthly' if kind == 'personal' else f'kivilo_pro_team_{seats}_monthly'
            name = 'Kivilo Pro Personal' if kind == 'personal' else f'Kivilo Pro Team {seats} seat' + ('s' if seats != 1 else '')
            sub = next((s for s in subscriptions if s['attributes']['productId'] == product), None)
            if sub is None and args.create_drafts:
                sub = create('subscriptions', {
                    'name': name, 'productId': product, 'subscriptionPeriod': 'ONE_MONTH',
                    'familySharable': False, 'groupLevel': 1 if kind == 'personal' else 21 - seats,
                    'reviewNote': f'Account > Plan > {"Personal" if kind == "personal" else "choose a team"}. {seats} seat(s), {25 * seats} active properties. Apple verifies and bills the monthly subscription. Restore purchases is on the same screen.',
                }, {'group': relation('subscriptionGroups', gid)})
            if sub is None:
                report.append({'productId': product, 'status': 'missing'})
                continue
            sid = sub['id']
            if sub['attributes']['subscriptionPeriod'] != 'ONE_MONTH' or sub['attributes']['familySharable']:
                raise RuntimeError(f'{product} has incompatible period/sharing settings; review it manually.')
            localizations = items(f'/v1/subscriptions/{sid}/subscriptionLocalizations')
            if not localizations and args.create_drafts:
                create('subscriptionLocalizations', {'name': name, 'locale': 'en-GB',
                       'description': f'{25 * seats} active properties. Reports, evidence and signing.'},
                       {'subscription': relation('subscriptions', sid)})
            availability = items(f'/v1/subscriptions/{sid}/planAvailabilities')
            if not availability and args.create_drafts:
                # UPFRONT means paying for the ONE_MONTH period. MONTHLY is Apple's
                # separate annual commitment with monthly instalments.
                create('subscriptionPlanAvailabilities', {'planType': 'UPFRONT', 'availableInNewTerritories': False}, {
                    'subscription': relation('subscriptions', sid),
                    'availableTerritories': {'data': [{'type': 'territories', 'id': 'SGP'}]},
                })
            prices = items(f'/v1/subscriptions/{sid}/prices?filter[territory]=SGP&include=subscriptionPricePoint')
            desired_price = Decimal(39 * seats)
            points = items(f'/v1/subscriptions/{sid}/pricePoints?filter[territory]=SGP&limit=200')
            point = next((p for p in points if Decimal(p['attributes']['customerPrice']) == desired_price), None)
            selected_point = point
            candidates = [p for p in points if args.price_policy == 'nearest' or Decimal(p['attributes']['customerPrice']) <= desired_price]
            if selected_point is None and args.price_policy != 'exact' and candidates:
                selected_point = min(candidates, key=lambda p: (abs(Decimal(p['attributes']['customerPrice']) - desired_price), Decimal(p['attributes']['customerPrice'])))
            if not prices and selected_point and args.create_drafts:
                create('subscriptionPrices', {'preserveCurrentPrice': True, 'planType': 'UPFRONT'}, {
                    'subscription': relation('subscriptions', sid),
                    'subscriptionPricePoint': relation('subscriptionPricePoints', selected_point['id']),
                })
                prices = items(f'/v1/subscriptions/{sid}/prices?filter[territory]=SGP&include=subscriptionPricePoint')
            configured_ids = {p.get('relationships', {}).get('subscriptionPricePoint', {}).get('data', {}).get('id') for p in prices}
            row = {'productId': product, 'id': sid, 'groupId': gid, 'seats': seats,
                   'desiredMonthlySGD': str(desired_price), 'exactPriceAvailable': point is not None,
                   'priceConfigured': bool(prices), 'state': sub['attributes']['state'],
                   'configuredPricesSGD': [p['attributes']['customerPrice'] for p in points if p['id'] in configured_ids],
                   'pricePolicy': args.price_policy}
            if not point:
                nearest = sorted(points, key=lambda p: abs(Decimal(p['attributes']['customerPrice']) - desired_price))[:2]
                row['nearestPricesSGD'] = [p['attributes']['customerPrice'] for p in nearest]
            report.append(row)
            print(json.dumps(row), flush=True)
            if args.output:
                args.output.write_text(json.dumps({'appId': APP_ID, 'subscriptions': report}, indent=2) + '\n')
    if args.output:
        args.output.write_text(json.dumps({'appId': APP_ID, 'subscriptions': report}, indent=2) + '\n')
    if not report:
        print('No catalog entries found.')


if __name__ == '__main__':
    main()
