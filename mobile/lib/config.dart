/// Supplied at build time, so no key or origin is committed:
///   flutter run --dart-define-from-file=env.json
class Config {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
  static const apiBase = String.fromEnvironment('API_BASE');

  static bool get isComplete =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty && apiBase.isNotEmpty;
}
