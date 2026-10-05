import { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function AttendanceReport({ roomId }) {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    fetchAttendance();
  }, [roomId]);

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(
        `https://collab-platform-backend-31r8.onrender.com
/api/attendance/${roomId}`
      );

      setAttendance(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h}h ${m}m ${s}s`;
  };

  const downloadPDF = () => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Attendance Report", 14, 20);

  doc.setFontSize(12);
  doc.text(`Room ID: ${roomId}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

  // Table Data
  const rows = attendance.map((a) => [
    a.user,
    new Date(a.joinTime).toLocaleTimeString(),
    a.leaveTime
      ? new Date(a.leaveTime).toLocaleTimeString()
      : "Still in Room",
    a.leaveTime
      ? formatDuration(a.duration)
      : "--",
  ]);

  autoTable(doc, {
    head: [["User", "Joined", "Left", "Duration"]],
    body: rows,
    startY: 48,
  });

  doc.save(`Attendance_${roomId}.pdf`);
};

  return (
    <div>
      <h3>📊 Attendance Report</h3>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>User</th>
            <th>Joined</th>
            <th>Left</th>
            <th>Duration</th>
          </tr>
        </thead>

        <tbody>
          {attendance.map((a) => (
            <tr key={a._id}>
              <td>{a.user}</td>

              <td>
                {new Date(a.joinTime).toLocaleTimeString()}
              </td>

              <td>
                {a.leaveTime
                  ? new Date(
                      a.leaveTime
                    ).toLocaleTimeString()
                  : "Still in Room"}
              </td>

              <td>
                {a.leaveTime
                  ? formatDuration(a.duration)
                  : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
  style={{
    marginTop: "20px",
    textAlign: "center",
  }}
>
  <button
    onClick={downloadPDF}
    style={{
      background: "#2563eb",
      color: "white",
      padding: "10px 20px",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    ⬇ Download Attendance PDF
  </button>
</div>
    </div>
  );
}

export default AttendanceReport;
