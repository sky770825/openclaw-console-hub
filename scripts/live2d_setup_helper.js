/**
 * OpenClaw Live2D Integration Helper
 * This script provides the initialization template for integration.
 */

import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display/cubism4';

window.PIXI = PIXI; // Required for pixi-live2d-display

export async function initStarshipAI(canvasId, modelPath) {
    const app = new PIXI.Application({
        view: document.getElementById(canvasId),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window
    });

    const model = await Live2DModel.from(modelPath);
    app.stage.addChild(model);

    // Apply Starship Theme Scales
    model.scale.set(0.2);
    model.x = 100;

    // Implementation of "Busy Scenario" logic
    function setBusyState(isBusy) {
        if (isBusy) {
            model.internalModel.motionManager.stopAllMotions();
            // Assuming "motion_busy" exists in model3.json
            model.motion('busy'); 
            model.tint = 0xFF0000; // Red alert tint
        } else {
            model.tint = 0xFFFFFF;
            model.motion('idle');
        }
    }

    return { app, model, setBusyState };
}
