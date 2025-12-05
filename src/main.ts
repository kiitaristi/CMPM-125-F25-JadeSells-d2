import "./style.css";

"use strict";

document.body.innerHTML = `
  <h1 style="color:black;">Title</h1>
  <canvas id="canvas" width=256 height=256 class="canvas"></canvas>
  <div>
    <button id="clearbutton" class="stateButton">Clear</button>
    <button id="undobutton" class="stateButton">Undo</button>
    <button id="redobutton" class="stateButton">Redo</button>
  </div>
  <div class="toolbar" style="text-align:center; margin-bottom:10px;"></div>
  <div>
    <button id="exportbutton">Export PNG</button>
`;

// ---------------------
// VARIABLE DECLARATIONS
// ---------------------
interface Function {
  draw?(x: number, y: number): void;
  display(ctx: CanvasRenderingContext2D): void;
}

const canvasElems: Function[] = [];
const redoFunc: Function[] = [];
const exportFunc: Function[] = [];

type ToolType = "thin" | "thick" | "sticker";
let toolCursor: ToolPreview | null = null;

let currFunc: Function | null = null;
let currSticker: string | null = null;
let currTool: ToolType = "thin";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Failed to get canvas context");
const toolBar = document.querySelector(".toolbar")! as HTMLDivElement;

type StickerKey = { label: string; sticker: string };
const stickers: StickerKey[] = [
  { label: "Heart", sticker: "❤️" },
  { label: "Smiley", sticker: "😂" },
  { label: "Exclamation", sticker: "❗❗" },
];

const redrawEvent = new Event("drawing-changed");
const toolEvent = new Event("tool-moved");

const clearButton = document.getElementById("clearbutton")!;
const undoButton = document.getElementById("undobutton")!;
const redoButton = document.getElementById("redobutton")!;

/*
const thinButton = document.getElementById("thinmarkerbutton")!;
thinButton.classList.add("selectedTool");

const thickButton = document.getElementById("thickmarkerbutton")!;
*/

// ----------------------------------
// CLASS AND CLASS METHOD DEFINITIONS
// ----------------------------------
class Marker implements Function {
  private pointData: { x: number; y: number }[] = [];
  private lineWeight: number;

  constructor(weight: number) {
    this.lineWeight = weight;
  }

  draw(x: number, y: number) {
    this.pointData.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = this.lineWeight;
    if (this.pointData.length > 1) {
      ctx.beginPath();
      const { x, y } = this.pointData[0];
      ctx.moveTo(x, y);
      for (const p of this.pointData) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
}

class Sticker implements Function {
  x: number;
  y: number;
  sticker: string;
  constructor(xArg: number, yArg: number, stickerArg: string) {
    this.x = xArg;
    this.y = yArg;
    this.sticker = stickerArg;
  }

  draw(xPos: number, yPos: number) {
    this.x = xPos;
    this.y = yPos;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.sticker, this.x, this.y);
  }
}

class ToolPreview implements Function {
  x: number;
  y: number;

  constructor(xArg: number, yArg: number) {
    this.x = xArg;
    this.y = yArg;
  }

  updatePosition(xPos: number, yPos: number) {
    this.x = xPos;
    this.y = yPos;
  }

  display(ctx: CanvasRenderingContext2D) {
    if (currTool === "sticker" && currSticker) {
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currSticker, this.x, this.y);
    } else {
      ctx.beginPath();
      const radius = currTool === "thin" ? 2 : 5;
      ctx.arc(this.x, this.y, radius / 4, 0, Math.PI * 2);
      ctx.strokeStyle = "black";
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ----------------
// HELPER FUNCTIONS
// ----------------
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const elem of canvasElems) elem.display(ctx);

  if (toolCursor) toolCursor.display(ctx);
}

function createButton(
  label: string,
  onClick: () => void,
  cssClass = "toolButton",
) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = cssClass;
  btn.addEventListener("click", onClick);
  toolBar.appendChild(btn);
  return btn;
}

const thinButton = createButton("Thin", () => selectTool("thin"));
const thickButton = createButton("Thick", () => selectTool("thick"));

function refreshStickerButtons() {
  const oldStickerButtons = toolBar.querySelectorAll(".stickerButton");
  oldStickerButtons.forEach((b) => b.remove());

  for (const sticker of stickers) {
    const _btn = createButton(
      sticker.sticker,
      () => selectSticker(sticker.sticker),
      "stickerButton",
    );
  }

  createButton("Create Custom Button", addCustomSticker, "stickerButton");
}
refreshStickerButtons();

function addCustomSticker() {
  const newSticker = prompt(
    "Enter a new sticker (e.g. emoji character):",
    "🌟",
  );
  if (newSticker && newSticker.trim() !== "") {
    stickers.push({ label: "Custom", sticker: newSticker.trim() });
    refreshStickerButtons();
  }
}

function selectTool(tool: ToolType) {
  currTool = tool;
  currSticker = null;
  updateSelect();
}

function selectSticker(sticker: string) {
  currTool = "sticker";
  currSticker = sticker;
  updateSelect();
}

function updateSelect() {
  const allButtons = toolBar.querySelectorAll("button");
  allButtons.forEach((b) => b.classList.remove("selectedTool"));

  if (currTool === "thin") thinButton.classList.add("selectedTool");
  else if (currTool === "thick") thickButton.classList.add("selectedTool");
  else {
    const stickerButtons = toolBar.querySelectorAll(".stickerButton");
    stickerButtons.forEach((b) => {
      if (b.textContent === currSticker) b.classList.add("selectedTool");
    });
  }
}

// ----------------------
// CANVAS EVENT LISTENERS
// ----------------------
canvas.addEventListener("mouseleave", () => {
  toolCursor = null;
  canvas.dispatchEvent(toolEvent);
});

canvas.addEventListener("mouseenter", (e) => {
  toolCursor = new ToolPreview(
    e.offsetX,
    e.offsetY,
  );
  canvas.dispatchEvent(toolEvent);
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX, offsetY } = e;

  if (currFunc && currTool !== "sticker") {
    currFunc.draw!(offsetX, offsetY);
  } else if (!currFunc) {
    toolCursor = new ToolPreview(offsetX, offsetY);
  }

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mousedown", (e) => {
  const { offsetX, offsetY } = e;

  toolCursor = null;

  if (currTool === "sticker" && currSticker) {
    currFunc = new Sticker(offsetX, offsetY, currSticker);
  } else {
    const lineWeight = currTool === "thin" ? 2 : 5;
    currFunc = new Marker(lineWeight);
  }

  if (currFunc) {
    redoFunc.splice(0, redoFunc.length);
    canvasElems.push(currFunc);
    exportFunc.push(currFunc);
  }

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mouseup", () => {
  currFunc = null;

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

// ----------------------
// BUTTON EVENT LISTENERS
// ----------------------
clearButton.addEventListener("click", () => {
  canvasElems.splice(0, canvasElems.length);
  redoFunc.splice(0, redoFunc.length);
  exportFunc.splice(0, exportFunc.length);
  canvas.dispatchEvent(redrawEvent);
});

undoButton.addEventListener("click", () => {
  if (canvasElems.length > 0) redoFunc.push(canvasElems.pop()!);
  if (exportFunc.length > 0) redoFunc.push(exportFunc.pop()!);

  canvas.dispatchEvent(redrawEvent);
});

redoButton.addEventListener("click", () => {
  if (redoFunc.length > 0) {
    canvasElems.push(redoFunc.pop()!);
    exportFunc.push(redoFunc.pop()!);
  }

  canvas.dispatchEvent(redrawEvent);
});

const exportButton = document.getElementById("exportbutton")!;
document.body.appendChild(exportButton);

exportButton.innerHTML = "Export PNG";
exportButton.addEventListener("click", () => {
  document.body.className += " disabled";
  const tempCanvas: HTMLCanvasElement = document.createElement("canvas");
  tempCanvas.width = canvas.height * 4;
  tempCanvas.height = canvas.width * 4;
  canvas.replaceWith(tempCanvas);
  const tempCTX: CanvasRenderingContext2D | null = tempCanvas.getContext("2d");

  if (tempCTX) {
    tempCTX.scale(4, 4);
    tempCTX.fillStyle = "white";
    tempCTX.fillRect(0, 0, tempCanvas.height, tempCanvas.width);
    tempCTX.lineCap = "round";
    for (let i: number = 0; i < canvasElems.length; ++i) {
      canvasElems[i].display(
        tempCTX,
      );
    }
    const anchor = document.createElement("a");
    anchor.href = tempCanvas.toDataURL("image/png");
    anchor.download = "sketchpad.png";
    anchor.click();
  }

  tempCanvas.replaceWith(canvas);
  document.body.className = "";
});
