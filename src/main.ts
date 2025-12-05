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
  <div style="color: black; font-size: 50; margin: 10px;">Current line weight: <span id="weight">Thin Marker</span>
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

const lines: Marker[] = [];
const redoLines: Marker[] = [];

let currLine: Marker | null = null;
let currWeight: number = 2;

const cursor = { active: false, x: 0, y: 0 };

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Failed to get canvas context");

const weightDesc = document.getElementById("weight")!;

const thinButton = document.getElementById("thinmarkerbutton")!;
thinButton.classList.add("selectedTool");

const thickButton = document.getElementById("thickmarkerbutton")!;

function selectTool(weight: number, button: HTMLElement) {
  currWeight = weight;

  thinButton.classList.remove("selectedTool");
  thickButton.classList.remove("selectedTool");
  button.classList.add("selectedTool");

  weightDesc.textContent = button.textContent;
}

thinButton.addEventListener("click", () => selectTool(2, thinButton));
thickButton.addEventListener("click", () => selectTool(5, thickButton));

const redrawEvent = new Event("drawing-changed");

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  currLine = new Marker(cursor.x, cursor.y, currWeight);
  redoLines.splice(0, redoLines.length);
  lines.push(currLine);

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mousemove", (e) => {
  if (!cursor.active || !currLine) return;

  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
  currLine.draw(cursor.x, cursor.y);

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currLine = null;

  canvas.dispatchEvent(redrawEvent);
});

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of lines) line.display(ctx);
}

canvas.addEventListener("drawing-changed", redraw);

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
