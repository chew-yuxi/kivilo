import 'dart:io';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../ui/kivilo_theme.dart';

/// Plays one piece of video evidence inside the app. A signed storage URL is a bearer
/// credential for footage of someone's home, so it is streamed here rather than handed
/// to a browser, where it would land in history and sync.
class VideoScreen extends StatefulWidget {
  const VideoScreen.network({super.key, required String this.url})
    : file = null;

  /// A video still on this phone, before its upload has finished.
  const VideoScreen.file({super.key, required File this.file}) : url = null;

  final String? url;
  final File? file;

  @override
  State<VideoScreen> createState() => _VideoScreenState();
}

class _VideoScreenState extends State<VideoScreen> {
  late final VideoPlayerController _controller = widget.file != null
      ? VideoPlayerController.file(widget.file!)
      : VideoPlayerController.networkUrl(Uri.parse(widget.url!));
  late final Future<void> _ready = _controller.initialize().then((_) {
    _controller.play();
  });

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() => setState(() {
    _controller.value.isPlaying ? _controller.pause() : _controller.play();
  });

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      title: const Text('Video'),
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
    ),
    body: FutureBuilder<void>(
      future: _ready,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'This video could not be loaded. Check your connection and try again.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white),
              ),
            ),
          );
        }
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(
            child: CircularProgressIndicator(color: Colors.white),
          );
        }
        return SafeArea(
          child: Column(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: _toggle,
                  child: Center(
                    child: AspectRatio(
                      aspectRatio: _controller.value.aspectRatio,
                      child: VideoPlayer(_controller),
                    ),
                  ),
                ),
              ),
              ValueListenableBuilder<VideoPlayerValue>(
                valueListenable: _controller,
                builder: (context, value, _) => Padding(
                  padding: const EdgeInsets.fromLTRB(8, 4, 16, 12),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: _toggle,
                        color: Colors.white,
                        tooltip: value.isPlaying ? 'Pause' : 'Play',
                        icon: Icon(
                          value.isPlaying
                              ? Icons.pause_rounded
                              : Icons.play_arrow_rounded,
                        ),
                      ),
                      Expanded(
                        child: VideoProgressIndicator(
                          _controller,
                          allowScrubbing: true,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${_time(value.position)} / ${_time(value.duration)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );

  static String _time(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}

/// What a video tile shows: the server-made still with a play badge, or the camcorder
/// icon until the still exists.
class VideoPoster extends StatelessWidget {
  const VideoPoster({super.key, required this.posterUrl, this.iconSize = 30});

  final String? posterUrl;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final icon = Icon(
      Icons.videocam_outlined,
      size: iconSize,
      color: KiviloColors.pinkDark,
    );
    if (posterUrl == null) return Center(child: icon);
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.network(
          posterUrl!,
          fit: BoxFit.contain,
          gaplessPlayback: true,
          errorBuilder: (_, _, _) => Center(child: icon),
        ),
        Center(
          child: DecoratedBox(
            decoration: const BoxDecoration(
              color: Colors.black54,
              shape: BoxShape.circle,
            ),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Icon(
                Icons.play_arrow_rounded,
                size: iconSize * 0.8,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
