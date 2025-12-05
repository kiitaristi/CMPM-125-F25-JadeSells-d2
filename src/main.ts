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
  <div>
    <button id="heartbutton" class="stateButton">❤️</button>
    <button id="smileybutton" class="stateButton">😂</button>
    <button id="exclaimbutton" class="stateButton">❗❗</button>
  </div>
  <div id="weightbuttons">
    <button id="thinmarkerbutton" class="toolButton">Thin Marker</button>
    <button id="thickmarkerbutton" class="toolButton">Thick Marker</button>
  </div>
`;

interface Function {
  draw?(x: number, y: number): void;
  display(ctx: CanvasRenderingContext2D): void;
}

class Marker implements Function {
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
  weight: number;
  sticker?: string | null;

  constructor(
    xArg: number,
    yArg: number,
    weightArg: number,
    stickerArg?: string | null,
  ) {
    this.x = xArg;
    this.y = yArg;
    this.weight = weightArg;
    this.sticker = stickerArg ?? null;
  }

  updatePosition(xPos: number, yPos: number) {
    this.x = xPos;
    this.y = yPos;
  }

  updateProperties(weightArg: number, stickerArg?: string | null) {
    this.weight = weightArg;
    this.sticker = stickerArg ?? null;
  }

  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.sticker != null) {
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.5;
      ctx.fillText(this.sticker, this.x, this.y);
    } else {
      ctx.beginPath();
      ctx.strokeStyle = "black";
      ctx.lineWidth = this.weight;
      ctx.arc(this.x, this.y, this.weight / 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const lines: Function[] = [];
const redoFunc: Function[] = [];

let currFunc: Function | null = null;
let currWeight: number = 2;
let currSticker: string | null = null;

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
  toolCursor = new ToolPreview(
    e.offsetX,
    e.offsetY,
    currWeight,
    currSticker,
  );
  canvas.dispatchEvent(toolEvent);
});

canvas.addEventListener("mousemove", (e) => {
  const { offsetX, offsetY } = e;

  if (!toolCursor) {
    toolCursor = new ToolPreview(offsetX, offsetY, currWeight, currSticker);
  } else {
    toolCursor.updatePosition(offsetX, offsetY);
    toolCursor.updateProperties(currWeight, currSticker);
  }
  canvas.dispatchEvent(toolEvent);

  if (mouseDown && currFunc && currFunc.draw) currFunc.draw(offsetX, offsetY);

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mousedown", (e) => {
  mouseDown = true;
  const { offsetX, offsetY } = e;

  if (!currSticker) currFunc = new Marker(offsetX, offsetY, currWeight);
  else currFunc = new Sticker(offsetX, offsetY, currSticker);

  if (currFunc) {
    redoFunc.splice(0, redoFunc.length);
    lines.push(currFunc);
  }

  canvas.dispatchEvent(redrawEvent);
});

canvas.addEventListener("mouseup", () => {
  mouseDown = false;
  currFunc = null;

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
  redoFunc.splice(0, redoFunc.length);
  canvas.dispatchEvent(redrawEvent);
});

const undoButton = document.getElementById("undobutton")!;

undoButton.addEventListener("click", () => {
  if (lines.length > 0) {
    redoFunc.push(lines.pop()!);
    canvas.dispatchEvent(redrawEvent);
  }
});

const redoButton = document.getElementById("redobutton")!;

redoButton.addEventListener("click", () => {
  if (redoFunc.length > 0) {
    lines.push(redoFunc.pop()!);
    canvas.dispatchEvent(redrawEvent);
  }
});

const thinButton = document.getElementById("thinmarkerbutton")!;
thinButton.classList.add("selectedTool");

const thickButton = document.getElementById("thickmarkerbutton")!;
const heartButton = document.getElementById("heartbutton")!;
const smileyButton = document.getElementById("smileybutton")!;
const exclaimButton = document.getElementById("exclaimbutton")!;

function selectTool(
  weight: number,
  button: HTMLElement,
  emoji?: string | null,
) {
  currWeight = weight;

  if (emoji) currSticker = emoji;
  else currSticker = null;

  thinButton.classList.remove("selectedTool");
  thickButton.classList.remove("selectedTool");
  heartButton.classList.remove("selectedTool");
  smileyButton.classList.remove("selectedTool");
  exclaimButton.classList.remove("selectedTool");
  button.classList.add("selectedTool");

  if (toolCursor) toolCursor.updateProperties(currWeight, currSticker);
}

thinButton.addEventListener("click", () => selectTool(3, thinButton));
thickButton.addEventListener("click", () => selectTool(6, thickButton));
heartButton.addEventListener(
  "click",
  () => selectTool(0, heartButton, heartButton.textContent),
);
smileyButton.addEventListener(
  "click",
  () => selectTool(0, smileyButton, smileyButton.textContent),
);
exclaimButton.addEventListener(
  "click",
  () => selectTool(0, exclaimButton, exclaimButton.textContent),
);
