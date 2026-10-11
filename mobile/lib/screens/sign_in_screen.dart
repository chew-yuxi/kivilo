import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../ui/kivilo_components.dart';
import '../ui/kivilo_theme.dart';

/// The emailed six digit code, not a magic link. A link opens the phone's default
/// browser, which for an installed app means the agent ends up signed in somewhere that
/// is not the app. The web client does exactly this, and the same Send Email Hook
/// delivers for both, so there is nothing server-side to add for this screen.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  bool _sent = false;
  bool _passwordMode = false;
  bool _showPassword = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on AuthRetryableFetchException {
      setState(
        () => _error = 'Could not connect. Check your connection and try again.',
      );
    } on AuthException catch (error) {
      setState(() => _error = error.message);
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode() => _run(() async {
    await Supabase.instance.client.auth.signInWithOtp(
      email: _email.text.trim(),
    );
    if (mounted) setState(() => _sent = true);
  });

  Future<void> _verify() => _run(() async {
    await Supabase.instance.client.auth.verifyOTP(
      email: _email.text.trim(),
      token: _code.text.trim(),
      type: OtpType.email,
    );
  });

  Future<void> _signInWithPassword() => _run(() async {
    await Supabase.instance.client.auth.signInWithPassword(
      email: _email.text.trim(),
      password: _password.text,
    );
  });

  @override
  Widget build(BuildContext context) {
    final title = _passwordMode
        ? 'Welcome back'
        : _sent
        ? 'Check your email'
        : 'A better way to hand over';
    final subtitle = _passwordMode
        ? 'Sign in to continue your inspections.'
        : _sent
        ? 'Enter the six-digit code sent to ${_email.text.trim()}.'
        : 'Create a clear, room-by-room record of every property.';

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Center(child: KiviloMark(size: 68)),
                  const SizedBox(height: 16),
                  Text(
                    'Kivilo',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 48),
                  Text(title, style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 8),
                  Text(subtitle, style: Theme.of(context).textTheme.bodyLarge),
                  const SizedBox(height: 32),
                  Text(
                    _sent && !_passwordMode
                        ? 'VERIFICATION CODE'
                        : 'EMAIL ADDRESS',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                      color: KiviloColors.muted,
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (!_sent || _passwordMode)
                    TextField(
                      controller: _email,
                      autofocus: true,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        hintText: 'you@example.com',
                        prefixIcon: Icon(Icons.mail_outline),
                      ),
                      onSubmitted: (_) =>
                          _passwordMode ? _signInWithPassword() : _sendCode(),
                    )
                  else
                    TextField(
                      controller: _code,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(
                        hintText: '000000',
                        prefixIcon: Icon(Icons.lock_outline),
                        counterText: '',
                      ),
                      onSubmitted: (_) => _verify(),
                    ),
                  if (_passwordMode) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'PASSWORD',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                        color: KiviloColors.muted,
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _password,
                      obscureText: !_showPassword,
                      autofillHints: const [AutofillHints.password],
                      decoration: InputDecoration(
                        hintText: 'Your password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _showPassword
                              ? 'Hide password'
                              : 'Show password',
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                          ),
                          onPressed: () =>
                              setState(() => _showPassword = !_showPassword),
                        ),
                      ),
                      onSubmitted: (_) => _signInWithPassword(),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: KiviloColors.redSoft,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: KiviloColors.red),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy
                        ? null
                        : (_passwordMode
                              ? _signInWithPassword
                              : _sent
                              ? _verify
                              : _sendCode),
                    child: Text(
                      _busy
                          ? 'Working'
                          : _passwordMode
                          ? 'Sign in'
                          : _sent
                          ? 'Sign in'
                          : 'Email me a code',
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_sent && !_passwordMode) ...[
                    TextButton(
                      onPressed: _busy ? null : _sendCode,
                      child: const Text('Send a new code'),
                    ),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() => _sent = false),
                      child: const Text('Use a different email'),
                    ),
                  ],
                  if (!_sent || _passwordMode)
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() {
                              _passwordMode = !_passwordMode;
                              _sent = false;
                              _error = null;
                            }),
                      child: Text(
                        _passwordMode
                            ? 'Use an emailed code instead'
                            : 'Sign in with password',
                      ),
                    ),
                  const SizedBox(height: 36),
                  const Divider(),
                  const SizedBox(height: 12),
                  const Text(
                    'Every room. Every detail. Ready when you need it.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: KiviloColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
