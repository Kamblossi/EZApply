"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAutomationWorker = initializeAutomationWorker;
exports.getAutomationWorker = getAutomationWorker;
const automationWorker_1 = require("./automationWorker");
let workerInstance = null;
function initializeAutomationWorker(io) {
    if (!workerInstance) {
        workerInstance = new automationWorker_1.AutomationWorker(io);
    }
    return workerInstance;
}
function getAutomationWorker() {
    return workerInstance;
}
