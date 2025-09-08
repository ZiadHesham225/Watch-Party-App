import React, { useState } from 'react';
import { Video } from 'lucide-react';
import VideoSelector from './VideoSelector';
import Button from '../common/Button';

interface VideoControlPanelProps {
    hasControl: boolean;
    onVideoSelect: (videoUrl: string, videoTitle: string, videoThumbnail?: string) => void;
}

const VideoControlPanel: React.FC<VideoControlPanelProps> = ({ hasControl, onVideoSelect }) => {
    const [showVideoSelector, setShowVideoSelector] = useState(false);

    if (!hasControl) {
        return null;
    }

    return (
        <>
            <div className="absolute top-4 right-4 z-10">
                <Button
                    size="sm"
                    variant="secondary"
                    icon={Video}
                    onClick={() => setShowVideoSelector(true)}
                    className="bg-black/70 text-white hover:bg-black/90"
                >
                    Change Video
                </Button>
            </div>

            {showVideoSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold">Change Video</h2>
                            <button
                                onClick={() => setShowVideoSelector(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-4">
                            <VideoSelector
                                onVideoSelect={(url, title, thumbnail) => {
                                    onVideoSelect(url, title, thumbnail);
                                    setShowVideoSelector(false);
                                }}
                                hasControl={hasControl}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VideoControlPanel;
