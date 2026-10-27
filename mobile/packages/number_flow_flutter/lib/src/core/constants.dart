/// Core constants. Do not change these values casually — they are calibrated
/// against the NumberFlow visual design.
library;

/// Maximum number of animated slots a single component will render.
const int kMaxSlots = 20;

/// Default font size when none is supplied via [TextStyle].
const double kDefaultFontSize = 16;

/// Number of values in a standard digit wheel (0-9).
const int kDigitCount = 10;

/// Fallback character set for glyph measurement when the actual format
/// characters are unknown.
const String kMeasurableChars =
    '0123456789.,%+-\$/:! €£¥₩'
    'abcdefghijklmnopqrstuvwxyz'
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ~°×';

/// Horizontal mask fade width as a ratio of lineHeight.
/// Matches web NumberFlow's `--number-flow-mask-width: 0.5em`.
const double kMaskWidthRatio = 0.5;

/// Superscript exponent rendering scale derived from OpenType font metrics.
/// Inter font OS/2 table: ySuperscriptYSize = 1229/2048 ≈ 0.60.
/// Consistent with TeX (`\defaultscriptratio=0.7`) and typography convention.
const double kSuperscriptScale = 0.6;

/// Roll speed (|digits/second|) below which motion blur is not applied.
const double kDefaultMotionBlurThreshold = 0.5;

/// Roll speed (|digits/second|) at which motion blur reaches its full sigma.
const double kDefaultMotionBlurVelocityScale = 8.0;

/// Motion-blur defaults used when the iOS spring preset is active. Tuned to a
/// prominent, present-through-the-roll blur (a light gaussian smear along the
/// roll axis): a higher peak sigma and a lower velocity scale so the blur ramps
/// in early in the roll rather than only near peak speed.
const double kIosMotionBlur = 4.0;

/// Velocity scale for the iOS preset — lower than the default so the blur is
/// near full strength for most of the roll, not just at its fastest instant.
const double kIosMotionBlurVelocityScale = 4.0;

/// Horizontal digit squish for the iOS preset: at peak roll speed a rolling
/// digit compresses to scaleX 0.7 (1 - 0.3), springing back as it settles.
const double kIosDigitSquish = 0.3;

/// Starting opacity for an entering digit. Non-zero so a new digit is visible
/// almost immediately as it rolls in, instead of fading up from fully invisible.
const double kEnterOpacityStart = 0.35;

/// Fraction of the opacity timing used for the enter fade-in. The (longer) full
/// timing is reserved for exits; entering digits reach full opacity faster so
/// they read immediately during rapid changes.
const double kEnterOpacityDurationFactor = 0.45;
