import 'dart:async';

import 'package:flutter/material.dart';
import 'package:in_app_purchase_platform_interface/in_app_purchase_platform_interface.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/agency.dart';
import '../models/billing.dart';
import '../services/api.dart';
import '../config.dart';
import '../services/store_billing.dart';
import '../ui/kivilo_layout.dart';
import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key, required this.api, required this.billing});
  final Api api;
  final StoreBilling billing;

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen>
    with WidgetsBindingObserver {
  List<AgencySummary> _teams = [];
  String _workspace = 'personal';
  StoreBillingStatus? _status;
  List<ProductDetails> _products = [];
  String? _selectedProduct;
  String? _error;
  bool _loading = true;
  int _generation = 0;
  late final StreamSubscription<void> _changes;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _changes = widget.billing.planChanges.listen((_) => _load());
    unawaited(_initialize());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_changes.cancel());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_load());
  }

  Future<void> _initialize() async {
    try {
      final (teams, preference) = await (
        widget.api.agencies(),
        widget.api.workspacePreference(),
      ).wait;
      if (!mounted) return;
      _teams = teams.agencies;
      _workspace = _teams.any((team) => team.id == preference)
          ? preference!
          : 'personal';
      await _load();
    } catch (error) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = plainError(error);
        });
      }
    }
  }

  Future<void> _load() async {
    if (!mounted) return;
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final status = await widget.billing.status(_workspace);
      final products = status.canPurchase
          ? await widget.billing.products(status.products)
          : <ProductDetails>[];
      if (!mounted || generation != _generation) return;
      final selected = products.any((product) => product.id == _selectedProduct)
          ? _selectedProduct
          : products
                    .where((product) => product.id == status.currentProductId)
                    .firstOrNull
                    ?.id ??
                products.firstOrNull?.id;
      setState(() {
        _status = status;
        _products = products;
        _selectedProduct = selected;
      });
    } catch (error) {
      if (mounted && generation == _generation) {
        setState(() => _error = plainError(error));
      }
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _manage() async {
    final uri = widget.billing.provider == 'apple' ? Uri.parse('https://apps.apple.com/account/subscriptions') : Uri.https('play.google.com', '/store/account/subscriptions', {
      'package': 'one.kivilo.kivilo',
      if (_status?.currentProductId case final String id) 'sku': id,
    });
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw ApiFailure(
          'Could not open ${widget.billing.storeName}. Open your device’s subscription settings.',
          null,
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    }
  }

  Future<void> _openTerms(String url) async {
    try {
      if (!await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)) {
        throw const ApiFailure('Could not open the page. Try again.', null);
      }
    } catch (error) {
      if (mounted) setState(() => _error = plainError(error));
    }
  }

  int _seats(String productId) => _status!.products
      .firstWhere((product) => product.productId == productId)
      .seats;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Plans & billing')),
    body: SafeArea(
      child: KiviloContent(
        maxWidth: 720,
        child: AnimatedBuilder(
          animation: widget.billing,
          builder: (context, _) {
            final status = _status;
            final selected = _products
                .where((product) => product.id == _selectedProduct)
                .firstOrNull;
            final busy = _loading || widget.billing.busy;
            final currentPlan =
                status?.pro == true && selected?.id == status?.currentProductId;
            final team = _teams
                .where((team) => team.id == _workspace)
                .firstOrNull;
            return RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: kiviloScreenPadding,
                children: [
                  KiviloSelectField<String>(
                    label: 'Workspace',
                    sheetTitle: 'Choose billing workspace',
                    value: _workspace,
                    enabled: !busy,
                    options: [
                      const KiviloSelectOption(
                        value: 'personal',
                        label: 'Personal',
                      ),
                      for (final team in _teams)
                        KiviloSelectOption(value: team.id, label: team.name),
                    ],
                    onChanged: (value) {
                      setState(() {
                        _workspace = value;
                        _status = null;
                        _products = [];
                        _selectedProduct = null;
                      });
                      unawaited(_load());
                    },
                  ),
                  const SizedBox(height: 24),
                  if (_loading) ...[
                    const LinearProgressIndicator(),
                    const SizedBox(height: kiviloHeadingGap),
                  ],
                  if (_error != null) ...[
                    Text(
                      _error!,
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                    const SizedBox(height: kiviloButtonGap),
                    TextButton(
                      onPressed: busy ? null : _initialize,
                      child: const Text('Try again'),
                    ),
                    const SizedBox(height: kiviloSectionGap),
                  ],
                  if (status != null) ...[
                    Text(
                      status.pro ? 'Kivilo Pro' : 'Kivilo Free',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${status.activeProperties} of ${status.limit} active properties in use',
                    ),
                    if (status.pro)
                      Text(
                        '${status.seats} ${status.seats == 1 ? 'seat' : 'seats'}',
                      ),
                    if (status.currentPeriodEnd != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        '${status.cancelAtPeriodEnd ? 'Access until' : 'Current period ends'} ${MaterialLocalizations.of(context).formatMediumDate(status.currentPeriodEnd!.toLocal())}',
                      ),
                    ],
                    if (!status.canManageBilling) ...[
                      const SizedBox(height: 16),
                      Text(
                        status.managedByName == null
                            ? 'Ask your team owner or manager about this plan.'
                            : '${status.managedByName} manages this subscription.',
                      ),
                    ],
                    if (status.provider == 'stripe') ...[
                      const SizedBox(height: 16),
                      const Text(
                        'This plan was purchased on the Kivilo website. You can use it in the app.',
                      ),
                    ],
                    if (status.provider == widget.billing.provider &&
                        status.canManageBilling) ...[
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: busy ? null : _manage,
                        child: Text('Manage in ${widget.billing.storeName}'),
                      ),
                    ],
                    if (status.canPurchase) ...[
                      const SizedBox(height: 24),
                      Text(
                        team == null
                            ? 'Pro for your personal work'
                            : 'Pro for ${team.name}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      if (team != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          '25 active properties per seat, shared across this team. Choose at least ${status.seatsNeeded} ${status.seatsNeeded == 1 ? 'seat' : 'seats'} for its current members.',
                        ),
                        if (widget.billing.provider == 'apple') ...[
                          const SizedBox(height: kiviloHeadingGap),
                          const Text('Your Apple Account can subscribe for one team workspace, with up to 20 seats, alongside your Personal plan.'),
                        ],
                      ],
                      const SizedBox(height: 16),
                      if (_products.isEmpty && !_loading)
                        Text('${widget.billing.storeName} has no plans available for this account yet. Check your store account and try again.'),
                      if (_products.isNotEmpty) ...[
                        if (team != null) ...[
                          KiviloSelectField<String>(
                            label: 'Seats',
                            sheetTitle: 'Choose seats',
                            value: _selectedProduct!,
                            enabled: !busy,
                            options: [
                              for (final product in _products)
                                KiviloSelectOption(
                                  value: product.id,
                                  label:
                                      '${_seats(product.id)} ${_seats(product.id) == 1 ? 'seat' : 'seats'}',
                                  description:
                                      '${_seats(product.id) * 25} active properties · ${product.price}/month',
                                ),
                            ],
                            onChanged: (value) =>
                                setState(() => _selectedProduct = value),
                          ),
                          const SizedBox(height: kiviloHeadingGap),
                        ],
                        if (selected != null) ...[
                          Text(
                            '${selected.price}/month',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_seats(selected.id) * 25} active properties',
                          ),
                          const SizedBox(height: kiviloHeadingGap),
                          Text('Renews automatically until canceled in ${widget.billing.storeName}.'),
                        ],
                        if (team != null &&
                            status.provider == widget.billing.provider &&
                            !currentPlan) ...[
                          const SizedBox(height: kiviloHeadingGap),
                          Text(widget.billing.provider == 'apple'
                              ? 'More seats take effect immediately. Fewer seats take effect at renewal. Apple confirms the price and timing before you agree.'
                              : 'A seat change replaces this subscription immediately. Google Play credits the remaining time and confirms your next payment date before you agree.'),
                        ],
                        if (!currentPlan) ...[
                          const SizedBox(height: kiviloButtonGap),
                          FilledButton(
                            onPressed: busy || selected == null
                                ? null
                                : () => widget.billing.purchase(
                                    agencyId: _workspace,
                                    product: selected,
                                  ),
                            child: Text(
                              status.provider == widget.billing.provider
                                  ? 'Change plan in ${widget.billing.storeName}'
                                  : 'Subscribe with ${widget.billing.storeName}',
                            ),
                          ),
                        ],
                      ],
                    ] else if (status.canManageBilling &&
                        status.provider == null) ...[
                      const SizedBox(height: 16),
                      Text('${widget.billing.storeName} subscriptions are not available for this workspace yet.'),
                    ],
                  ],
                  if (widget.billing.errorMessage != null) ...[
                    const SizedBox(height: kiviloHeadingGap),
                    Text(
                      widget.billing.errorMessage!,
                      style: const TextStyle(color: KiviloColors.red),
                    ),
                  ],
                  if (widget.billing.message != null) ...[
                    const SizedBox(height: kiviloHeadingGap),
                    Text(widget.billing.message!),
                  ],
                  if (widget.billing.busy) ...[
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(),
                  ],
                  const SizedBox(height: kiviloSectionGap),
                  TextButton(
                    onPressed: busy ? null : () => widget.billing.restore(),
                    child: const Text('Restore purchases'),
                  ),
                  const SizedBox(height: kiviloHeadingGap),
                  Text('Use the ${widget.billing.storeName} and Kivilo accounts that made the purchase. Restoring does not charge you.'),
                  if (widget.billing.provider == 'apple') ...[
                    const SizedBox(height: kiviloHeadingGap),
                    const Text('Payment is charged to your Apple Account when you confirm. Cancel in App Store subscriptions at least 24 hours before renewal to avoid the next charge. Deleting Kivilo or its account does not cancel an Apple subscription.'),
                    const SizedBox(height: kiviloButtonGap),
                    TextButton(
                      onPressed: () => _openTerms('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'),
                      child: const Text('Terms of Use'),
                    ),
                    const SizedBox(height: kiviloButtonGap),
                    TextButton(
                      onPressed: () => _openTerms(Uri.parse(Config.apiBase).resolve('/privacy').toString()),
                      child: const Text('Privacy policy'),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    ),
  );
}
