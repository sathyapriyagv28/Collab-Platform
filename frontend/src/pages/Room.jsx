import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import socket from "../socket";
import ChatBox from "../components/ChatBox";
import CodeEditor from "../components/CodeEditor";
import Whiteboard from "../components/Whiteboard";
import OnlineUsers from "../components/OnlineUsers";
import ScreenShare from "../components/ScreenShare";
import VideoCall from "../components/VideoCall";
import "../styles/room.css";
import "../styles/components.css";
import FileShare from "../components/FileShare";
import AttendanceReport from "../components/AttendanceReport";

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState(null);
  const [showReactionPicker, setShowReactionPicker] =
  useState(false);

const [floatingReactions, setFloatingReactions] =
  useState([]);
  const reactionIdRef = useRef(0);
  const reactionTimeoutsRef = useRef(new Set());

const [notifications, setNotifications] = useState([]);

const [seconds, setSeconds] =
  useState(0);

const formattedTime =
  new Date(seconds * 1000)
    .toISOString()
    .substring(11, 19);

  const [position, setPosition] = useState(null);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    socket.disconnect();
    navigate("/");
  };

  const showNotification = (text) => {
    const id = Date.now();

    setNotifications((prev) => [
      ...prev,
      { id, text },
    ]);

    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      );
    }, 3000);
  };

useEffect(() => {
  const reactionTimeouts = reactionTimeoutsRef.current;
  const user = localStorage.getItem("user");

  socket.emit("join-room", {
    roomId,
    user,
  });

  socket.on(
    "show-reaction",
    (data) => {
      const id = ++reactionIdRef.current;
      const reaction = {
        id,
        emoji: data.emoji,
        user: data.user,
      };

      setFloatingReactions(
        (prev) => [
          ...prev,
          reaction,
        ]
      );

      const timeoutId = setTimeout(() => {
        setFloatingReactions(
          (prev) =>
            prev.filter(
              (r) =>
                r.id !== id
            )
        );
        reactionTimeoutsRef.current.delete(timeoutId);
      }, 3000);
      reactionTimeoutsRef.current.add(timeoutId);
    }
  );

 socket.on("room-notification", (msg) => {
  showNotification(msg);
});

socket.on("receive-message", (data) => {
  const currentUser = localStorage.getItem("user");

  if (data.user !== currentUser) {
    showNotification(`💬 ${data.user} sent a message`);
  }
});



  return () => {
    reactionTimeouts.forEach(clearTimeout);
    reactionTimeouts.clear();
    socket.off("users-update");
    socket.off("show-reaction");
     socket.off("room-notification");
     socket.off("receive-message");
     socket.off("chat-notification");
  };
}, [roomId]);

useEffect(() => {
  const timer = setInterval(() => {
    setSeconds((prev) => prev + 1);
  }, 1000);

  return () => clearInterval(timer);
}, []);


  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);

    alert("Room ID copied!");
  };

  const closePanel = () => setActivePanel(null);

  const panelContent = () => {
    switch (activePanel) {
      case "chat":
        return <ChatBox roomId={roomId} />;
      case "video":
        return <VideoCall roomId={roomId} />;
      case "files":
        return <FileShare roomId={roomId} />;
      case "users":
        return (
          <div>
            <h2>TEST USERS PANEL</h2>
            <OnlineUsers />
          </div>
        );
      case "screen":
        return <ScreenShare />;

      case "attendance":
  return (
    <AttendanceReport roomId={roomId} />
  );
      default:
        return null;
    }
  };

  const panelTitle = {
    chat: "Chat",
    video: "Video Call",
    files: "File Sharing",
    users: "Online Users",
    screen: "Screen Share",
    attendance: "Attendance Report",
  };

  const startDrag = (e) => {
    e.preventDefault();

    const bounds =
      e.currentTarget.parentElement.getBoundingClientRect();
    const startX = e.clientX - bounds.left;
    const startY = e.clientY - bounds.top;

    const move = (event) => {
      setPosition({
        x: event.clientX - startX,
        y: event.clientY - startY,
      });
    };

    const stop = () => {
      document.removeEventListener(
        "mousemove",
        move
      );

      document.removeEventListener(
        "mouseup",
        stop
      );
    };

    document.addEventListener(
      "mousemove",
      move
    );

    document.addEventListener(
      "mouseup",
      stop
    );
  };

  return (
    <div className="room-container">
      <header className="room-header">

  <div className="header-left">

    <h1>🚀 Team Collaboration Workspace</h1>

    <p>
      Real-time coding, whiteboard and team collaboration
    </p>

  </div>

  <div className="header-right">

    <div className="room-id-box">

    <span>
        📌 {roomId}
    </span>

    <button
        className="copy-room-btn"
        onClick={copyRoomId}
    >
        📋
    </button>

</div>

    <div className="room-chip">
      ⏱ {formattedTime}
    </div>

    

    <button
      className="logout-btn"
      onClick={logout}
    >
      Logout
    </button>

  </div>

</header>

      <main className="room-main">
        <div className="tool-section primary-panel">
          <div className="tool-header">💻 Code Editor</div>
          <div className="tool-body">
            <CodeEditor roomId={roomId} />
          </div>
        </div>

        <div className="tool-section primary-panel">
          <div className="tool-header">🎨 Whiteboard</div>
          <div className="tool-body">
            <Whiteboard roomId={roomId} />
          </div>
        </div>

        
      </main>

      <aside className="room-action-bar">
          <button type="button" className="action-icon" onClick={() => setActivePanel("chat")}>
            <span>💬</span>
            <small>Chat</small>
          </button>
          <button type="button" className="action-icon" onClick={() => setActivePanel("video")}>
           <span>📹</span>
            <small>Video</small>
          </button>
          <button type="button" className="action-icon" onClick={() => setActivePanel("files")}>
            <span>📁</span>
            <small>Files</small>
          </button>
          <button type="button" className="action-icon" onClick={() => setActivePanel("users")}>
            <span>👥</span>
            <small>Users</small>
          </button>
          
          <button
  type="button"
  className="action-icon"
  aria-expanded={showReactionPicker}
  aria-label="Choose a reaction"
  onClick={() =>
    setShowReactionPicker(
      !showReactionPicker
    )
  }
>
  <span>😊</span>
  <small>React</small>
</button>

<button
  type="button"
  className="action-icon"
  onClick={() => setActivePanel("attendance")}
>
  <span>📊</span>
  <small>Attendance</small>
</button>

{showReactionPicker && (
  <div className="reaction-picker" role="group" aria-label="Reactions">
    {["👍", "❤️", "😂", "👏", "🎉"].map(
      (emoji) => (
        <button
          key={emoji}
          type="button"
          className="reaction-option"
          aria-label={`Send ${emoji} reaction`}
          onClick={() => {
            socket.emit(
              "reaction",
              {
                roomId,
                user:
                  localStorage.getItem(
                    "user"
                  ),
                emoji,
              }
            );

            setShowReactionPicker(
              false
            );
          }}
        >
          {emoji}
        </button>
      )
    )}
  </div>
)}
        </aside>

      {activePanel && (
        <div className="room-modal-overlay" onClick={closePanel}>
          <div
            className="room-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={position ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              right: "auto",
            } : undefined}
          >
            <div
              className="room-modal-header"
              onMouseDown={startDrag}
              style={{
                cursor: "move",
              }}
            >
              <div>
                <h3>{panelTitle[activePanel]}</h3>
                <p>Open in-room content with a compact popup view.</p>
              </div>
              <button type="button" className="modal-close" onClick={closePanel}>
                ×
              </button>
            </div>
            <div className="room-modal-body">{panelContent()}</div>
          </div>
        </div>
      )}
      {floatingReactions.map((reaction) => (
  <div
    key={reaction.id}
    className="floating-reaction"
  >
    {reaction.emoji}
  </div>
))}

{/* {notification && (
  <div
    style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "#323232",
      color: "#fff",
      padding: "12px 18px",
      borderRadius: "10px",
      fontWeight: "500",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 99999,
      minWidth: "250px",
    }}
  >
    {notification}
  </div>
)} */}

{notifications.map((notification, index) => (
  <div
    key={notification.id}
    style={{
      position: "fixed",
      bottom: `${20 + index * 70}px`,
      right: "20px",
      background: "#323232",
      color: "#fff",
      padding: "12px 18px",
      borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 99999,
      minWidth: "260px",
      fontWeight: "500",
      transition: "all 0.3s ease",
    }}
  >
    {notification.text}
  </div>
))}


    </div>
  );
}

export default Room;
