import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import socket from "../socket";
import RemoteVideo from "./RemoteVideo";

function VideoCall({ roomId }) {
  const myVideo = useRef(null);
  const peerRef = useRef(null);
  const callsRef = useRef([]);
  const peerUsersRef = useRef({});
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callEndedRef = useRef(false);
  const [stream, setStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sharingUser, setSharingUser] = useState("");
  const [canShare, setCanShare] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [raisedUser, setRaisedUser] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [callError, setCallError] = useState("");

  useEffect(() => {
    let disposed = false;
    callEndedRef.current = false;

    const addCall = (call, user) => {
      callsRef.current.push(call);
      call.on("stream", (remoteStream) => {
        setRemoteStreams((previous) => {
          if (previous.some((item) => item.stream.id === remoteStream.id)) {
            return previous;
          }

          return [...previous, { stream: remoteStream, user }];
        });
      });
    };

    const handlePeerUsers = (users) => {
      peerUsersRef.current = users;
    };

    const handleUserConnected = ({ peerId, user }) => {
      peerUsersRef.current[peerId] = user;
      const peer = peerRef.current;
      const localStream = streamRef.current;

      if (!peer || !localStream) return;
      addCall(peer.call(peerId, localStream), user);
    };

    const handleRaisedHand = (user) => {
      setRaisedUser(user);
      setTimeout(() => setRaisedUser(""), 10000);
    };

    const handleScreenShareUser = (user) => {
      setSharingUser(user || "");
    };

    socket.on("peer-users-update", handlePeerUsers);
    socket.on("user-connected", handleUserConnected);
    socket.on("hand-raised", handleRaisedHand);
    socket.on("screen-share-user", handleScreenShareUser);

    const startCall = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (disposed || callEndedRef.current) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = localStream;
        setStream(localStream);

        if (myVideo.current) {
          myVideo.current.srcObject = localStream;
        }

        const peer = new Peer(undefined, {
  host: "collab-platform-backend-31r8.onrender.com",
  secure: true,
  path: "/peerjs",
});
        peerRef.current = peer;

        peer.on("open", (peerId) => {
          socket.emit("peer-id", {
            roomId,
            peerId,
            user: localStorage.getItem("user"),
          });
        });

        peer.on("call", (call) => {
          call.answer(localStream);
          addCall(
            call,
            peerUsersRef.current[call.peer] || "Participant",
          );
        });
      } catch (error) {
        if (!disposed) {
          setCallError(
            error instanceof Error
              ? error.message
              : "Unable to start the video call.",
          );
        }
      }
    };

    startCall();

    return () => {
      disposed = true;
      callEndedRef.current = true;
      socket.off("peer-users-update", handlePeerUsers);
      socket.off("user-connected", handleUserConnected);
      socket.off("hand-raised", handleRaisedHand);
      socket.off("screen-share-user", handleScreenShareUser);
      callsRef.current.forEach((call) => call.close());
      callsRef.current = [];
      peerRef.current?.destroy();
      peerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      screenStreamRef.current = null;
    };
  }, [roomId]);

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setCameraOn(videoTrack.enabled);
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setMicOn(audioTrack.enabled);
  };

  const stopScreenShare = () => {
    const cameraTrack = streamRef.current?.getVideoTracks()[0];
    const screenStream = screenStreamRef.current;

    if (cameraTrack) {
      callsRef.current.forEach((call) => {
        const sender = call.peerConnection
          ?.getSenders()
          .find((item) => item.track?.kind === "video");
        sender?.replaceTrack(cameraTrack);
      });
    }

    if (myVideo.current && streamRef.current) {
      myVideo.current.srcObject = streamRef.current;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      screenStreamRef.current = null;
    }

    setScreenSharing(false);
    setCanShare(true);
    socket.emit("screen-share-stop", {
      roomId,
      user: localStorage.getItem("user"),
    });
  };

  const startScreenShare = () => {
    socket.emit(
      "request-screen-share",
      {
        roomId,
        user: localStorage.getItem("user"),
      },
      async (response) => {
        if (callEndedRef.current) {
          socket.emit("screen-share-stop", {
            roomId,
            user: localStorage.getItem("user"),
          });
          return;
        }

        if (!response?.allowed) {
          setCallError(response?.message || "Screen sharing is unavailable.");
          return;
        }

        try {
          const screenStream =
            await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (callEndedRef.current) {
            screenStream.getTracks().forEach((track) => track.stop());
            socket.emit("screen-share-stop", {
              roomId,
              user: localStorage.getItem("user"),
            });
            return;
          }

          const screenTrack = screenStream.getVideoTracks()[0];
          screenStreamRef.current = screenStream;

          callsRef.current.forEach((call) => {
            const sender = call.peerConnection
              ?.getSenders()
              .find((item) => item.track?.kind === "video");
            sender?.replaceTrack(screenTrack);
          });

          if (myVideo.current) {
            myVideo.current.srcObject = screenStream;
          }

          setCallError("");
          setScreenSharing(true);
          setCanShare(false);
          screenTrack.onended = stopScreenShare;
        } catch (error) {
          if (callEndedRef.current) return;
          setCallError(
            error instanceof Error
              ? error.message
              : "Unable to share your screen.",
          );
          socket.emit("screen-share-stop", {
            roomId,
            user: localStorage.getItem("user"),
          });
        }
      },
    );
  };

  const endCall = () => {
    callEndedRef.current = true;
    if (screenSharing) {
      socket.emit("screen-share-stop", {
        roomId,
        user: localStorage.getItem("user"),
      });
    }

    callsRef.current.forEach((call) => call.close());
    callsRef.current = [];
    peerRef.current?.destroy();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenStreamRef.current = null;
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    setStream(null);
    setRemoteStreams([]);
    setCameraOn(false);
    setMicOn(false);
    setScreenSharing(false);
    setCanShare(true);
    setCallEnded(true);
  };

  return (
    <section className="video-call">
      {(sharingUser || raisedUser) && (
        <div className="video-call-notices">
          {sharingUser && <p>🖥 {sharingUser} is sharing a screen</p>}
          {raisedUser && <p>✋ {raisedUser} raised their hand</p>}
        </div>
      )}

      {callError && <p className="video-call-error" role="status">{callError}</p>}
      {callEnded && (
        <p className="video-call-status" role="status">
          Call ended. Close and reopen Video to start another call.
        </p>
      )}

      <div className="video-call-grid">
        <div className="video-tile">
          <video
            ref={myVideo}
            autoPlay
            muted
            playsInline
            className="video-feed"
          />
          <span className="video-tile-label">You</span>
        </div>

        {remoteStreams.map((item) => (
          <RemoteVideo
            key={item.stream.id}
            stream={item.stream}
            user={item.user}
          />
        ))}
      </div>

      <div className="video-call-controls">
        <button
          type="button"
          className="video-control-button"
          onClick={toggleCamera}
          disabled={callEnded || !stream}
        >
          {cameraOn ? "Turn camera off" : "Turn camera on"}
        </button>
        <button
          type="button"
          className="video-control-button"
          onClick={toggleMic}
          disabled={callEnded || !stream}
        >
          {micOn ? "Mute mic" : "Unmute mic"}
        </button>
        <button
          type="button"
          className="video-control-button"
          onClick={screenSharing ? stopScreenShare : startScreenShare}
          disabled={callEnded || (!canShare && !screenSharing)}
        >
          {screenSharing ? "Stop sharing" : "Share screen"}
        </button>
        <button
          type="button"
          className="video-control-button"
          onClick={() =>
            socket.emit("raise-hand", {
              roomId,
              user: localStorage.getItem("user"),
            })
          }
          disabled={callEnded}
        >
          Raise hand
        </button>
        <button
          type="button"
          className="video-control-button video-end-call"
          onClick={endCall}
          disabled={callEnded}
        >
          End call
        </button>
      </div>
    </section>
  );
}

export default VideoCall;
