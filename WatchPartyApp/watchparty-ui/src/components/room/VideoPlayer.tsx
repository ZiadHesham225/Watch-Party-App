import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw } from 'lucide-react';
import Button from '../common/Button';

interface VideoPlayerProps {
  src: string;
  isPlaying: boolean;
  position: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  onTimeUpdate: (position: number) => void;
  onDurationUpdate?: (duration: number) => void;
  hasControl?: boolean;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  isPlaying,
  position,
  duration,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
  onDurationUpdate,
  hasControl = true,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isUserSeeking, setIsUserSeeking] = useState(false); // Track if user is seeking
  const [recentUserAction, setRecentUserAction] = useState(false); // Track recent play/pause actions
  const [bufferedProgress, setBufferedProgress] = useState(0); // Track video buffering progress
  let controlsTimeout: NodeJS.Timeout;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const timeDiff = Math.abs(video.currentTime - position);
    const isControllingUser = hasControl;
    
    let shouldSeek = false;
    
    if (isControllingUser) {
      shouldSeek = timeDiff > 2.5 && !isUserSeeking && !recentUserAction;
    } else {
      shouldSeek = timeDiff > 1.5 && !isUserSeeking;
    }
    
    if (shouldSeek || (isUserSeeking && timeDiff > 5.0)) { 
      video.currentTime = position;
    }

    if (isPlaying && video.paused) {
      video.play()
        .then(() => {
        })
        .catch(error => {
        });
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying, position]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!isUserSeeking) {
        onTimeUpdate(video.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration && onDurationUpdate) {
        onDurationUpdate(video.duration);
      }
    };

    const handleDurationChange = () => {
      if (video.duration && onDurationUpdate) {
        onDurationUpdate(video.duration);
      }
    };

    const handleUserPlay = () => {
      if (hasControl) {
        setRecentUserAction(true);
        setTimeout(() => setRecentUserAction(false), 1500);
      }
    };

    const handleUserPause = () => {
      if (hasControl) {
        setRecentUserAction(true);
        setTimeout(() => setRecentUserAction(false), 1500);
      }
    };

    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / video.duration) * 100;
        setBufferedProgress(bufferedPercent);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handleUserPlay);
    video.addEventListener('pause', handleUserPause);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handleUserPlay);
      video.removeEventListener('pause', handleUserPause);
      video.removeEventListener('progress', handleProgress);
    };
  }, [onTimeUpdate, onDurationUpdate]);

  const handlePlayPause = () => {
    if (!hasControl) {
      return; // Don't allow play/pause if user doesn't have control
    }
    
    // Set flag to prevent syncing for a short time after user action
    setRecentUserAction(true);
    setTimeout(() => setRecentUserAction(false), 1500); // 1.5 second grace period
    
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasControl) {
      return; // Don't allow seeking if user doesn't have control
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (x / width) * duration;
    setIsUserSeeking(true);
    
    // Immediately update local video position
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    onSeek(newTime);
    // Reset the seeking flag after a short delay
    setTimeout(() => setIsUserSeeking(false), 1000);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const toggleFullscreen = () => {
    const fullscreenContainer = document.getElementById('fullscreen-container');
    
    if (!document.fullscreenElement && fullscreenContainer) {
      // Request fullscreen on the container that includes both video and chat
      fullscreenContainer.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skipBackward = () => {
    if (!hasControl) return;
    
    setIsUserSeeking(true);
    const newTime = Math.max(0, position - 10);
    
    // Immediately update local video position
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    onSeek(newTime);
    setTimeout(() => setIsUserSeeking(false), 1000);
  };

  const skipForward = () => {
    if (!hasControl) return;
    
    setIsUserSeeking(true);
    const newTime = Math.min(duration, position + 10);
    
    // Immediately update local video position
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    
    onSeek(newTime);
    setTimeout(() => setIsUserSeeking(false), 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showControlsTemporary = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div 
      className={`relative bg-black group ${className} fullscreen-player`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onMouseMove={showControlsTemporary}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={handlePlayPause}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Loading overlay */}
      {!videoRef.current?.readyState && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-lg">Loading...</div>
        </div>
      )}

      {/* Play button overlay for paused state */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="secondary"
            size="lg"
            icon={Play}
            onClick={handlePlayPause}
            disabled={!hasControl}
            className={`border-0 p-4 rounded-full ${
              hasControl 
                ? 'bg-black/50 hover:bg-black/70 text-white' 
                : 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
            }`}
          />
          {!hasControl && (
            <div className="absolute top-full mt-2 text-center text-white text-sm bg-black/70 px-3 py-1 rounded">
              You don't have control
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="mb-4">
          <div 
            className={`w-full h-2 bg-gray-600 rounded-full relative ${
              hasControl ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={handleSeekClick}
            title={hasControl ? 'Click to seek' : 'You don\'t have control to seek'}
          >
            {/* Buffered progress (loading progress) */}
            <div 
              className="bg-gray-400 h-2 rounded-full transition-all duration-200 absolute top-0 left-0"
              style={{ width: `${bufferedProgress}%` }}
            />
            {/* Current progress */}
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-200 relative z-10"
              style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
            />
            {/* Progress thumb */}
            <div 
              className="absolute top-0 w-4 h-4 bg-red-500 rounded-full transform -translate-x-2 -translate-y-1 cursor-pointer z-20"
              style={{ left: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={skipBackward}
              disabled={!hasControl}
              className={`p-2 ${hasControl ? 'text-white hover:bg-white/20' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
              title={hasControl ? "Skip back 10 seconds" : "You don't have control"}
            />
            
            <Button
              variant="ghost"
              size="sm"
              icon={isPlaying ? Pause : Play}
              onClick={handlePlayPause}
              disabled={!hasControl}
              className={`p-2 ${hasControl ? 'text-white hover:bg-white/20' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
              title={hasControl ? (isPlaying ? "Pause" : "Play") : "You don't have control"}
            />
            
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCw}
              onClick={skipForward}
              disabled={!hasControl}
              className={`p-2 ${hasControl ? 'text-white hover:bg-white/20' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
              title={hasControl ? "Skip forward 10 seconds" : "You don't have control"}
            />

            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                icon={isMuted ? VolumeX : Volume2}
                onClick={toggleMute}
                className="text-white hover:bg-white/20 p-2"
              />
              <div className="relative w-16 h-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full h-2 bg-gray-600 rounded-full">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-150"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {formatTime(position)} / {formatTime(duration)}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              icon={isFullscreen ? Minimize : Maximize}
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 p-2"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
