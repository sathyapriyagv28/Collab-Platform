import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";
function FileShare({ roomId }) {
    const [file, setFile] = useState(null);
    const [files, setFiles] = useState([]);

    const fetchFiles = async () => {
        try {
            const res = await axios.get(
                `https://collab-platform-backend-31r8.onrender.com
/api/files/${roomId}`
            );

            setFiles(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [roomId]);

useEffect(() => {
  socket.on("file-added", () => {
    fetchFiles();
  });

  socket.on("file-deleted", () => {
    fetchFiles();
  });

  return () => {
    socket.off("file-added");
    socket.off("file-deleted");
  };
}, []);


    const uploadFile = async () => {
        if (!file) return;

        const formData = new FormData();

        formData.append("file", file);
        formData.append("roomId", roomId);

        try {
            const res = await axios.post(
                "https://collab-platform-backend-31r8.onrender.com/api/files/upload",
                formData
            );

            socket.emit("file-uploaded", {
                roomId,
                file: res.data,
            });

            setFile(null);

            fetchFiles();

            alert("File Uploaded");
        } catch (err) {
            console.log(err);
        }
    };

    const deleteFile = async (id) => {
    try {
        await axios.delete(
    `https://collab-platform-backend-31r8.onrender.com
/api/files/${id}`
);

socket.emit("file-deleted", roomId);

fetchFiles();

alert("File Deleted");
    } catch (err) {
        console.log(err);
    }
};

    return (
        <div>
            <h3>📁 File Sharing</h3>

            <input
                type="file"
                onChange={(e) =>
                    setFile(e.target.files[0])
                }
            />

            <button onClick={uploadFile}>
                Upload
            </button>

            <hr />

            <h4>Files</h4>

            {files.map((f) => (
    <div
        key={f._id}
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "8px",
        }}
    >
        <a
            href={`https://collab-platform-backend-31r8.onrender.com
/uploads/${f.filePath}`}
            target="_blank"
            rel="noreferrer"
        >
            📄 {f.fileName}
        </a>

        <button
            onClick={() => deleteFile(f._id)}
            style={{
                background: "red",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
            }}
        >
            🗑 Delete
        </button>
    </div>
))}
        </div>
    );
}

export default FileShare;
