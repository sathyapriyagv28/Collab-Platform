import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import socket from "../socket";
import axios from "axios";

function Whiteboard({ roomId }) {
  const canvasRef = useRef(null);

  const [canvasObj, setCanvasObj] = useState(null);
  const [drawMode, setDrawMode] = useState(false);

  const [brushColor, setBrushColor] =
    useState("#000000");

  const [brushSize, setBrushSize] =
    useState(3);

  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    const container =
      canvasRef.current?.parentElement;

    const width =
      container?.offsetWidth || 800;

    const height =
      container?.offsetHeight || 500;

    const canvas =
      new fabric.Canvas(
        canvasRef.current,
        {
          width,
          height,
          backgroundColor: "white",
          isDrawingMode: false,
        }
      );

    setCanvasObj(canvas);

    const loadBoard =
      async () => {
        try {
          const res =
            await axios.get(
              `https://collab-platform-backend-31r8.onrender.com
/api/whiteboard/${roomId}`
            );

          if (
            res.data?.canvasData
          ) {
            canvas.loadFromJSON(
              res.data.canvasData,
              () => {
                canvas.renderAll();
              }
            );
          }
        } catch (err) {
          console.log(err);
        }
      };

    loadBoard();

    const syncBoard = () => {
      if (
        isRemoteUpdate.current
      )
        return;

      socket.emit(
        "whiteboard-update",
        {
          roomId,
          canvasData:
            canvas.toJSON(),
        }
      );
    };

    canvas.on(
      "object:modified",
      syncBoard
    );

    canvas.on(
      "object:added",
      syncBoard
    );

    canvas.on(
      "path:created",
      syncBoard
    );

    socket.on(
      "whiteboard-sync",
      (canvasData) => {
        if (!canvasData)
          return;

        isRemoteUpdate.current =
          true;

        canvas.loadFromJSON(
          canvasData,
          () => {
            canvas.renderAll();

            isRemoteUpdate.current =
              false;
          }
        );
      }
    );

    const handleDeleteKey =
      (e) => {
        if (
          e.key === "Delete" ||
          e.key === "Backspace"
        ) {
          const activeObject =
            canvas.getActiveObject();

          if (
            activeObject
          ) {
            canvas.remove(
              activeObject
            );

            canvas.renderAll();

            socket.emit(
              "whiteboard-update",
              {
                roomId,
                canvasData:
                  canvas.toJSON(),
              }
            );
          }
        }
      };

    window.addEventListener(
      "keydown",
      handleDeleteKey
    );

    return () => {
      socket.off(
        "whiteboard-sync"
      );

      window.removeEventListener(
        "keydown",
        handleDeleteKey
      );

      canvas.dispose();
    };
  }, [roomId]);

  const syncCanvas = () => {
    if (!canvasObj)
      return;

    socket.emit(
      "whiteboard-update",
      {
        roomId,
        canvasData:
          canvasObj.toJSON(),
      }
    );
  };

 const disableDrawing = () => {
  if (!canvasObj) return;

  canvasObj.isDrawingMode = false;
  setDrawMode(false);
};

  const toggleDrawMode =
    () => {
      if (!canvasObj)
        return;

      canvasObj.isDrawingMode =
        !drawMode;

      if (
        !drawMode
      ) {
        const brush =
          new fabric.PencilBrush(
            canvasObj
          );

        brush.color =
          brushColor;

        brush.width =
          brushSize;

        canvasObj.freeDrawingBrush =
          brush;
      }

      setDrawMode(
        !drawMode
      );
    };


const addRectangle = () => {
  if (!canvasObj) return;

  disableDrawing();

  const rect = new fabric.Rect({
    left: 100,
    top: 100,
    width: 120,
    height: 80,
    fill: "#818cf8",
  });

  canvasObj.add(rect);
  canvasObj.setActiveObject(rect);
  canvasObj.renderAll();

  syncCanvas();
};



const addCircle = () => {
  if (!canvasObj) return;

  disableDrawing();

  const circle = new fabric.Circle({
    left: 100,
    top: 100,
    radius: 50,
    fill: "#ec4899",
  });

  canvasObj.add(circle);
  canvasObj.setActiveObject(circle);
  canvasObj.renderAll();

  syncCanvas();
};

 

const addText = () => {
  if (!canvasObj) return;

  disableDrawing();

  const text = new fabric.IText(
    "Double Click To Edit",
    {
      left: 100,
      top: 100,
      fontSize: 18,
    }
  );

  canvasObj.add(text);
  canvasObj.setActiveObject(text);
  canvasObj.renderAll();

  syncCanvas();
};



  const deleteSelected =
    () => {
      if (!canvasObj)
        return;

      disableDrawing();

      const activeObject =
        canvasObj.getActiveObject();

      if (
        !activeObject
      ) {
        alert(
          "Select an object first"
        );

        return;
      }

      canvasObj.remove(
        activeObject
      );

      canvasObj.discardActiveObject();

      canvasObj.renderAll();

      syncCanvas();
    };



  const clearBoard =
    () => {
      if (!canvasObj)
        return;

      disableDrawing();

      if (
        window.confirm(
          "Clear board?"
        )
      ) {
        canvasObj.clear();

        canvasObj.backgroundColor =
          "white";

        canvasObj.renderAll();

        syncCanvas();
      }
    };


  const downloadBoard =
    () => {
      if (!canvasObj)
        return;

      disableDrawing();

      const dataURL =
        canvasObj.toDataURL({
          format: "png",
        });

      const link =
        document.createElement(
          "a"
        );

      link.href =
        dataURL;

      link.download =
        `whiteboard-${roomId}.png`;

      link.click();
    };

  const enableEraser = () => {
  if (!canvasObj) return;

  canvasObj.isDrawingMode = true;

  const brush =
    new fabric.PencilBrush(canvasObj);

  brush.color = "#ffffff";
  brush.width = brushSize;

  canvasObj.freeDrawingBrush =
    brush;

  setDrawMode(true);
};

  return (
    <div className="whiteboard-container">

      <div
        className="whiteboard-toolbar"
      >
        <button
          onClick={
            toggleDrawMode
          }
        >
          ✏️ Draw
        </button>

        <button
          onClick={
            enableEraser
          }
        >
          🧽 Eraser
        </button>

        <input
          type="color"
          value={
            brushColor
          }
         onChange={(e) => {
  setBrushColor(e.target.value);

  if (
    canvasObj &&
    canvasObj.freeDrawingBrush
  ) {
    canvasObj.freeDrawingBrush.color =
      e.target.value;
  }
}}
        />

        <select
          value={
            brushSize
          }
          onChange={(e) => {
  const size =
    Number(e.target.value);

  setBrushSize(size);

  if (
    canvasObj &&
    canvasObj.freeDrawingBrush
  ) {
    canvasObj.freeDrawingBrush.width =
      size;
  }
}}
        >
          <option value="2">
            Thin
          </option>

          <option value="5">
            Medium
          </option>

          <option value="10">
            Thick
          </option>
        </select>

        <button
          onClick={
            addRectangle
          }
        >
          📦 Rectangle
        </button>

        <button
          onClick={
            addCircle
          }
        >
          ⭕ Circle
        </button>

        <button
          onClick={
            addText
          }
        >
          📝 Text
        </button>

        <button
          onClick={
            deleteSelected
          }
        >
          🗑 Delete
        </button>

        <button
          onClick={
            clearBoard
          }
        >
          🧹 Clear
        </button>

        <button
          onClick={
            downloadBoard
          }
        >
          ⬇ Download
        </button>
      </div>

      <div
        className="whiteboard-canvas"
      >
        <canvas
          ref={canvasRef}
        />
      </div>
    </div>
  );
}

export default Whiteboard;
