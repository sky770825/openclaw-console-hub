# Live2D Best Practices for OpenClaw
1. Always use requestAnimationFrame for the render loop.
2. Initialize Live2D only after the user interaction to satisfy AudioContext policies.
3. Use 'low-power' powerPreference for WebGL context on mobile devices.
