import { useEffect, useRef } from "react";

function RemoteVideo({ stream, user }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-feed"
      />
      <span className="video-tile-label">{user}</span>
    </div>
  );
}

export default RemoteVideo;
