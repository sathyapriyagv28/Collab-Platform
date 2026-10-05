import Editor from "@monaco-editor/react";
import { useState, useEffect } from "react";
import socket from "../socket";
import axios from "axios";

function CodeEditor({ roomId }) {
  const [code, setCode] = useState(
`console.log("Hello World");`
);
  const [language, setLanguage] = useState("javascript");
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState("");

  // LOAD SAVED CODE FROM DATABASE
  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await axios.get(
          `https://collab-platform-backend-31r8.onrender.com
/api/code/${roomId}`
        );

        if (res.data?.code) {
          setCode(res.data.code);
        }

        if (res.data?.language) {
          setLanguage(res.data.language);
        }
      } catch (err) {
        console.log("Failed to load code:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [roomId]);

  const handleChange = (value) => {
    setCode(value || "");

    socket.emit("code-change", {
      roomId,
      code: value || "",
      language,
    });
  };

  const runCode = () => {
    const logs = [];
    const originalLog = console.log;
    let nextOutput;

    try {
      console.log = (...args) => {
        logs.push(
          args
            .map((value) => {
              if (typeof value === "string") return value;
              try {
                return JSON.stringify(value) ?? String(value);
              } catch {
                return String(value);
              }
            })
            .join(" ")
        );
      };

      eval(code);

      nextOutput =
        logs.length
          ? logs.join("\n")
          : "Code executed successfully";
    } catch (err) {
      nextOutput = "Error: " + err.message;
    } finally {
      console.log = originalLog;
    }

    setOutput(nextOutput);
    socket.emit("code-output", { roomId, output: nextOutput });
  };

  // REAL-TIME CODE SYNC
  useEffect(() => {
    const handleCodeUpdate = (newCode) => {
      setCode(newCode);
    };
    const handleCodeOutput = (data) => {
      if (data.roomId !== roomId) return;
      setOutput(data.output);
    };

    socket.on("code-update", handleCodeUpdate);
    socket.on("code-output", handleCodeOutput);

    return () => {
      socket.off("code-update", handleCodeUpdate);
      socket.off("code-output", handleCodeOutput);
    };
  }, [roomId]);

  return (
    <div className="code-editor-container">
      <div className="code-editor-toolbar">
        <label htmlFor="language-select">Language:</label>
        <span
          style={{
            fontWeight: "bold",
            color: "#2563eb",
          }}
        >
          JavaScript
        </span>

        <button
  onClick={runCode}
  style={{
    marginLeft: "10px",
    padding: "6px 12px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  }}
>
  ▶ Run
</button>
      </div>

      <div className="code-editor-content">
        {loading ? (
          <div
            style={{
              flex: 1,
              padding: "20px",
              textAlign: "center",
            }}
          >
            Loading editor...
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleChange}
              theme="vs-light"
              options={{
                minimap: {
                  enabled: false,
                },
                wordWrap: "on",
                fontSize: 14,
              }}
            />
          </div>
        )}

        <div className="code-editor-output">
          <div className="code-editor-output-title">Console Output</div>
          <pre>{output || "Run your code to see output here."}</pre>
        </div>
      </div>
    </div>
  );
}

export default CodeEditor;
