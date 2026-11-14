# physics-rope

> 日本語のREADMEはこちらです: [README.ja.md](README.ja.md)

A physics-based rope simulation using Verlet integration, rendered on an HTML Canvas with pure JavaScript.

This project is a fork of [Physics Rope](https://codepen.io/guerrillacontra/pen/XPZeww) by [James](https://codepen.io/guerrillacontra).

## Demos

Move your mouse to interact with the rope's anchor point in both demos.

-   [**Single Rope Demo**](https://code4fukui.github.io/physics-rope/)
-   [**Multi-Rope Demo**](https://code4fukui.github.io/physics-rope/multi.html)

## Features

-   **Realistic Physics**: Implements Verlet integration for stable and believable rope movement.
-   **Interactive**: The first anchor point of each rope is attached to the mouse cursor.
-   **Configurable**: Easily adjust parameters like gravity, mass, damping, and segment resolution.
-   **Pure JavaScript**: No external libraries or dependencies.
-   **Multi-Rope Support**: The `multi.html` demo showcases two ropes with different physical properties (e.g., damping) interacting with the same controls.

## Getting Started

1.  Clone the repository:
    ```bash
    git clone https://github.com/code4fukui/physics-rope.git
    ```
2.  Navigate to the directory:
    ```bash
    cd physics-rope
    ```
3.  Open `index.html` or `multi.html` in a modern web browser that supports ES6 modules.

## Programmatic Usage

The core logic is modular and can be integrated into any project. Here is a basic example of how to create and render a rope, adapted from `index.html`.

```javascript
import { App } from "./App.js";
import { Rope } from "./Rope.js";

// Get canvas and context
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

// Define rope properties
const args = {
  start: { x: 100, y: canvas.height / 2 },
  end: { x: canvas.width - 100, y: canvas.height / 2 },
  resolution: 8, // The distance between points on the rope
  mass: 0.88,
  damping: 0.95,
  gravity: { x: 0, y: 3000 },
  solverIterations: 500, // Higher values increase stiffness and stability
};

// 1. Generate the points for the rope
const points = Rope.generate(
  args.start,
  args.end,
  args.resolution,
  args.mass,
  args.damping
);

// 2. Create a new Rope instance
const rope = new Rope(points, args.solverIterations);

// 3. Update the rope physics in each animation frame
const tick = dt => {
  rope.update(args.gravity, dt);
};

// 4. Draw the rope on the canvas
const draw = (canvas, context, dt) => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.lineWidth = 4;
  context.strokeStyle = "white";
  
  const p = points[0];
  context.moveTo(p.pos.x, p.pos.y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].pos.x, points[i].pos.y);
  }
  context.stroke();
};

// 5. Start the application loop
const app = new App(window, canvas, context, tick, draw, 60);
app.start();

// (Optional) Add mouse interactivity
app.onMouseMoveHandler = (x, y) => {
  const firstPoint = rope.getPoint(0);
  firstPoint.pos.x = x;
  firstPoint.pos.y = y;
};
```

## How It Works

The simulation is composed of a series of points (`RopePoint`) connected by distance constraints.

1.  **Integration**: In each frame, the position of each point is updated based on its previous position, velocity, and external forces like gravity. This is handled by a high-precision variant of Störmer-Verlet integration in `RopePoint.integrate`.
2.  **Constraint Solving**: After the points are moved, their constraints are enforced. The simulation iterates multiple times (`solverIterations`) to correct the distance between adjacent points, ensuring the rope segments do not stretch. This is handled in `RopePoint.constrain`.

## Core Files

-   `Rope.js`: Contains the primary `Rope` and `RopePoint` classes that manage the simulation logic.
-   `Vector2.js`: A simple utility class for 2D vector operations.
-   `App.js`: A lightweight wrapper to manage the canvas, context, and `requestAnimationFrame` loop.
-   `index.html` / `multi.html`: Standalone examples demonstrating the library's usage.

## License

[MIT](LICENSE)