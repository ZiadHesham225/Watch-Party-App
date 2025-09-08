import React, { useState } from 'react';
import { Search, Play, Clock, ExternalLink, Link } from 'lucide-react';
import { YouTubeVideo, YouTubeSearchResponse } from '../../types';
import { youTubeService } from '../../services/youTubeService';
import { VideoUrlUtils } from '../../utils/videoUrlUtils';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';

interface VideoSelectorProps {
    onVideoSelect: (videoUrl: string, videoTitle: string, videoThumbnail?: string) => void;
    hasControl: boolean;
}

const VideoSelector: React.FC<VideoSelectorProps> = ({ onVideoSelect, hasControl }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [directUrl, setDirectUrl] = useState('');
    const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'url' | 'search'>('url');
    const [showResults, setShowResults] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            const response: YouTubeSearchResponse = await youTubeService.searchVideos(searchQuery, 10);
            setSearchResults(response.videos);
            setShowResults(true);
        } catch (error) {
            toast.error('Failed to search YouTube videos');
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleVideoSelect = (video: YouTubeVideo) => {
        onVideoSelect(video.videoUrl, video.title, video.thumbnailUrl);
        toast.success(`Selected: ${video.title}`);
    };

    const handleDirectUrlSubmit = () => {
        if (!directUrl.trim()) return;
        
        if (!VideoUrlUtils.validateVideoUrl(directUrl)) {
            toast.error('Please enter a valid video URL');
            return;
        }

        const title = VideoUrlUtils.isYouTubeUrl(directUrl) ? 'YouTube Video' : 'Video';
        const thumbnail = VideoUrlUtils.getThumbnail(directUrl);
        
        onVideoSelect(directUrl, title, thumbnail || undefined);
        toast.success('Video URL set successfully');
    };

    const formatDuration = (duration: string) => {
        return youTubeService.formatDuration(duration);
    };

    if (!hasControl) {
        return (
            <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
                <Play className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Waiting for Video</h3>
                <p className="text-gray-600 text-center max-w-md">
                    The room controller will select a video to play. You'll see it here once they choose one.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center mb-6">
                <Play className="h-12 w-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose a Video to Play</h3>
                <p className="text-gray-600">Search YouTube or enter a direct video URL</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                <button
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'url'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('url')}
                >
                    <Link className="h-4 w-4 inline mr-2" />
                    Enter URL
                </button>
                <button
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'search'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setActiveTab('search')}
                >
                    <Search className="h-4 w-4 inline mr-2" />
                    Search YouTube
                </button>
            </div>

            {/* URL Input Tab */}
            {activeTab === 'url' && (
                <div className="space-y-4">
                    <Input
                        label="Video URL"
                        type="url"
                        value={directUrl}
                        onChange={(e) => setDirectUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... or direct video URL"
                        icon={ExternalLink}
                    />
                    <Button
                        onClick={handleDirectUrlSubmit}
                        disabled={!directUrl.trim()}
                        className="w-full"
                    >
                        Set Video
                    </Button>
                </div>
            )}

            {/* YouTube Search Tab */}
            {activeTab === 'search' && (
                <div className="space-y-4">
                    <div className="flex space-x-2">
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for videos..."
                            icon={Search}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={!searchQuery.trim() || isSearching}
                            isLoading={isSearching}
                        >
                            Search
                        </Button>
                    </div>

                    {/* Search Results */}
                    {showResults && (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {searchResults.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No videos found</p>
                            ) : (
                                searchResults.map((video) => (
                                    <div
                                        key={video.videoId}
                                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleVideoSelect(video)}
                                    >
                                        <img
                                            src={video.thumbnailUrl}
                                            alt={video.title}
                                            className="w-32 h-20 object-cover rounded flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                                {video.title}
                                            </h4>
                                            <p className="text-xs text-gray-600 mb-1">{video.channelTitle}</p>
                                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                                                <span className="flex items-center">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {formatDuration(video.duration)}
                                                </span>
                                                <span>
                                                    {new Date(video.publishedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            icon={Play}
                                            className="flex-shrink-0"
                                        >
                                            Select
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoSelector;
