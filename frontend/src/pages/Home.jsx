import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const userName = localStorage.getItem("user") || "User";

  const createRoom = () => {
    const randomRoom = "ROOM-" + Math.floor(1000 + Math.random() * 9000);
    navigate(`/room/${randomRoom}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) {
      alert("Please enter a valid Room ID");
      return;
    }
    navigate(`/room/${roomId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <div>
          <h1>Welcome, {userName}! 👋</h1>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="home-content">
        <div className="home-card">
          <h2>Start Collaborating</h2>
          <div className="room-actions">
            <div className="action-group">
              <button className="btn-primary" style={{flex: 1}} onClick={createRoom}>
                ✨ Create New Room
              </button>
            </div>

            <div style={{ textAlign: "center", color: "var(--text-lighter)" }}>
              or
            </div>

            <div className="action-group">
              <input
                type="text"
                placeholder="Enter Room ID (e.g., ROOM-1234)"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <button className="btn-secondary" onClick={joinRoom}>
                Join Room
              </button>
            </div>
          </div>

          <div className="room-info">
            <p>
              <strong>💡 Tip:</strong> You can create a new room or join an existing one using its Room ID.
            </p>
            <p>
              <strong>🚀 Features:</strong> Code editor, whiteboard, and real-time chat for seamless collaboration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
