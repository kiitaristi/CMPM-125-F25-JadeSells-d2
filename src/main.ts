import "./style.css";

"use strict";

document.body.innerHTML = `
  <h1 style="color:black;">Title</h1>
  <canvas id="canvas" width=256 height=256 class="canvas"></canvas>
  <button id="clearbutton" class="clearbutton">Clear</button>
`;

type Point = { x: number; y: number };
type Line = Point[];

const lines: Line[] = [];

let currLine: Line | null = null;

const cursor = { active: false, x: 0, y: 0 };

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
if (!ctx) throw new Error("Failed to get canvas context");

const redrawEvent = new Event("drawing-changed");

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  currLine = [];
  currLine.push({ x: cursor.x, y: cursor.x });
  currLine.shift();
  lines.push(currLine);

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mousemove", (e) => {
  if (!cursor.active || !currLine) return;

  cursor.x = e.offsetX;
  cursor.y = e.offsetY;
  currLine.push({ x: cursor.x, y: cursor.y });

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currLine = null;

  canvas.dispatchEvent(redrawEvent);
});

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of lines) {
    if (line.length > 1) {
      ctx.beginPath();
      const { x, y } = line[0];
      ctx.moveTo(x, y);
      for (const { x, y } of line) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

canvas.addEventListener("drawing-changed", redraw);

const clearButton = document.getElementById("clearbutton")!;

clearButton.addEventListener("click", () => {
  lines.splice(0, lines.length);
  redraw();
});
