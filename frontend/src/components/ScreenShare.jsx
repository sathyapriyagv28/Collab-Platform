import { useRef } from "react";

function ScreenShare() {
  const videoRef = useRef();

  const shareScreen = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

      videoRef.current.srcObject =
        stream;
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h3>Screen Sharing</h3>

      <button onClick={shareScreen}>
        Share Screen
      </button>

      <br />
      <br />

      <video
        ref={videoRef}
        autoPlay
        controls
        width="500"
      />
    </div>
  );
}

export default ScreenShare;
