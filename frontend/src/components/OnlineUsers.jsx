import { useEffect, useState } from "react";
import socket from "../socket";

function OnlineUsers() {
  console.log("OnlineUsers Rendered");
  const [users, setUsers] = useState([]);

 useEffect(() => {
  const roomId =
    window.location.pathname.split("/").pop();

  socket.emit(
    "get-users",
    roomId
  );

  socket.on(
    "users-update",
    (userList) => {
      console.log(
        "USERS RECEIVED:",
        userList
      );

      setUsers(userList || []);
    }
  );

  return () => {
    socket.off(
      "users-update"
    );
  };
}, []);

  return (
    <div className="users-list">
      {users.length === 0 ? (
        <div
          style={{
            padding: "12px",
            textAlign: "center",
          }}
        >
          No users online
        </div>
      ) : (
        <>
          <div
            style={{
              padding: "10px",
              fontWeight: "bold",
            }}
          >
            {users.length} Users Online
          </div>

          {users.map((user, index) => (
            <div
              key={index}
              className="user-item"
            >
              🟢 {user}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default OnlineUsers;
