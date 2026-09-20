import React from 'react';
import VideoTile from './VideoTile';

const VideoGrid = ({
  localStream,
  remoteStreams,
  remoteUsers,
  remoteMediaStates,
  localUserName = 'You',
  isAudioMuted = false,
  isVideoMuted = false,
  isScreenSharing = false,
  isLocalSpeaking = false,
  activeSpeakers = {},
  isHandRaised = false,
  raisedHands = {},
}) => {
  const remoteSocketIds = Object.keys(remoteStreams);
  const totalCount = 1 + remoteSocketIds.length;

  const getGridClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-4xl max-h-[82vh]';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl';
    if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl';
    if (totalCount <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl';
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  return (
    <div className="w-full h-full p-4 flex items-center justify-center overflow-y-auto">
      <div className={`grid w-full h-full gap-4 items-center justify-center ${getGridClass()}`}>
        {/* Local Participant Tile */}
        <div className="w-full h-full aspect-video min-h-[200px]">
          <VideoTile
            stream={localStream}
            userName={localUserName}
            isLocal={true}
            isMuted={isAudioMuted}
            isCameraOff={isVideoMuted}
            isScreenSharing={isScreenSharing}
            isSpeaking={isLocalSpeaking}
            isHandRaised={isHandRaised}
          />
        </div>

        {/* Remote Participant Tiles */}
        {remoteSocketIds.map((socketId) => {
          const stream = remoteStreams[socketId];
          const user = remoteUsers[socketId];
          const mediaState = remoteMediaStates[socketId] || {};

          return (
            <div key={socketId} className="w-full h-full aspect-video min-h-[200px]">
              <VideoTile
                stream={stream}
                userName={(user && user.name) || 'Remote User'}
                isLocal={false}
                isMuted={mediaState.isMuted || false}
                isCameraOff={mediaState.isCameraOff || false}
                isScreenSharing={mediaState.isScreenSharing || false}
                isSpeaking={activeSpeakers[socketId] || false}
                isHandRaised={raisedHands[socketId] || false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VideoGrid;
