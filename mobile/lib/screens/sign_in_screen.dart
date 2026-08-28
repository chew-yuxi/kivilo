import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
  bool _sent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on AuthException catch (error) {
      setState(() => _error = error.message);
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendCode() => _run(() async {
        await Supabase.instance.client.auth.signInWithOtp(email: _email.text.trim());
        if (mounted) setState(() => _sent = true);
      });

  Future<void> _verify() => _run(() async {
        await Supabase.instance.client.auth.verifyOTP(
          email: _email.text.trim(),
          token: _code.text.trim(),
          type: OtpType.email,
        );
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          color: Color(0xFFEC4899),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('Kivilo', style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    _sent ? 'Enter the code' : 'Sign in',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _sent
                        ? 'We sent a six digit code to ${_email.text.trim()}.'
                        : 'We will email you a six digit code.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 20),
                  if (!_sent)
                    TextField(
                      controller: _email,
                      autofocus: true,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                      ),
                      onSubmitted: (_) => _sendCode(),
                    )
                  else
                    TextField(
                      controller: _code,
                      autofocus: true,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: const InputDecoration(
                        labelText: 'Six digit code',
                        border: OutlineInputBorder(),
                      ),
                      onSubmitted: (_) => _verify(),
                    ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                  ],
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _busy ? null : (_sent ? _verify : _sendCode),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFEC4899),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(
                      _busy
                          ? 'Working'
                          : _sent
                              ? 'Sign in'
                              : 'Email me a code',
                    ),
                  ),
                  if (_sent)
                    TextButton(
                      onPressed: _busy ? null : () => setState(() => _sent = false),
                      child: const Text('Use a different email'),
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
