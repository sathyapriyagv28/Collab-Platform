import { useState, useEffect, useRef } from "react";
import socket from "../socket";
import axios from "axios";

function ChatBox({ roomId }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [notifications, setNotifications] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const user = localStorage.getItem("user") || "Anonymous";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `https://collab-platform-backend-31r8.onrender.com
/api/messages/${roomId}`
        );

        setChat(res.data || []);
      } catch (err) {
        console.log("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  // receive messages
  useEffect(() => {
    socket.on("receive-message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on(
      "room-notification",
      (message) => {
        setNotifications((prev) => [
          ...prev,
          message,
        ]);
      }
    );

    return () => {
      socket.off("receive-message");
      socket.off("room-notification");
    };
  }, []);


  // send message
  const sendMessage = (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;

    socket.emit("send-message", {
      roomId,
      message: message.trim(),
      user,
    });

    setMessage("");
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">

        {notifications.map((note, index) => (
          <div
            key={`note-${index}`}
            style={{
              color: "green",
              fontWeight: "bold",
              textAlign: "center",
              margin: "5px 0",
            }}
          >
            {note}
          </div>
        ))}

        {loading ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--text-lighter)",
            }}
          >
            Loading messages...
          </div>
        ) : chat.length === 0 ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "var(--text-lighter)",
            }}
          >
            No messages yet. Start the conversation!
          </div>
        ) : (
          chat.map((c, i) => (
            <div key={i} className="chat-message">
              <div className="chat-message-user">
                {c.user}
              </div>

              <div className="chat-message-text">
                {c.message}
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />

      </div>

      <form onSubmit={sendMessage} className="chat-input-group">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatBox;
