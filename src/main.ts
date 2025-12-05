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
  <div id="weightbuttons">
    <button id="thinmarkerbutton" class="toolButton">Thin Marker</button>
    <button id="thickmarkerbutton" class="toolButton">Thick Marker</button>
  </div>
`;

class Marker {
  private pointData: { x: number; y: number }[] = [];
  private lineWeight: number;

  constructor(xStart: number, yStart: number, weight: number) {
    this.pointData.push({ x: xStart, y: yStart });
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

class ToolPreview {
  x: number;
  y: number;
  weight: number;

  constructor(xArg: number, yArg: number, weightArg: number) {
    this.x = xArg;
    this.y = yArg;
    this.weight = weightArg;
  }

  updatePosition(xPos: number, yPos: number) {
    this.x = xPos;
    this.y = yPos;
  }

  updateWeight(weightArg: number) {
    this.weight = weightArg;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = this.weight;
    ctx.arc(this.x, this.y, this.weight / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const lines: Marker[] = [];
const redoLines: Marker[] = [];

let currLine: Marker | null = null;
let currWeight: number = 2;

let toolCursor: ToolPreview | null = null;
let mouseDown: boolean = false;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Failed to get canvas context");

const redrawEvent = new Event("drawing-changed");
const toolEvent = new Event("tool-moved");

canvas.addEventListener("mouseleave", () => {
  toolCursor = null;
  canvas.dispatchEvent(toolEvent);
});

canvas.addEventListener("mouseenter", (e) => {
  toolCursor = new ToolPreview(e.offsetX, e.offsetY, currWeight);
  canvas.dispatchEvent(toolEvent);
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX, offsetY } = e;

  if (!toolCursor) toolCursor = new ToolPreview(offsetX, offsetY, currWeight);
  else {
    toolCursor.updatePosition(offsetX, offsetY);
    toolCursor.updateWeight(currWeight);
  }
  canvas.dispatchEvent(toolEvent);

  if (mouseDown && currLine) currLine.draw(offsetX, offsetY);

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mousedown", (e) => {
  mouseDown = true;
  const { offsetX, offsetY } = e;

  currLine = new Marker(offsetX, offsetY, currWeight);
  redoLines.splice(0, redoLines.length);
  lines.push(currLine);

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mouseup", () => {
  mouseDown = false;
  currLine = null;

  canvas.dispatchEvent(redrawEvent);
});

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of lines) line.display(ctx);

  if (toolCursor) toolCursor.display(ctx);
}

canvas.addEventListener("drawing-changed", redraw);
canvas.addEventListener("tool-moved", redraw);

const clearButton = document.getElementById("clearbutton")!;

clearButton.addEventListener("click", () => {
  lines.splice(0, lines.length);
  redoLines.splice(0, redoLines.length);
  canvas.dispatchEvent(redrawEvent);
});

const undoButton = document.getElementById("undobutton")!;

undoButton.addEventListener("click", () => {
  if (lines.length > 0) {
    redoLines.push(lines.pop()!);
    canvas.dispatchEvent(redrawEvent);
  }
});

const redoButton = document.getElementById("redobutton")!;

redoButton.addEventListener("click", () => {
  if (redoLines.length > 0) {
    lines.push(redoLines.pop()!);
    canvas.dispatchEvent(redrawEvent);
  }
});

const thinButton = document.getElementById("thinmarkerbutton")!;
thinButton.classList.add("selectedTool");

const thickButton = document.getElementById("thickmarkerbutton")!;

function selectTool(weight: number, button: HTMLElement) {
  currWeight = weight;

  thinButton.classList.remove("selectedTool");
  thickButton.classList.remove("selectedTool");
  button.classList.add("selectedTool");
  if (toolCursor) toolCursor.updateWeight(currWeight);
}

thinButton.addEventListener("click", () => selectTool(3, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));
