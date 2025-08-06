import { Server as SocketIOServer } from 'socket.io';
import { AutomationWorker } from './automationWorker';

let workerInstance: AutomationWorker | null = null;

export function initializeAutomationWorker(io?: SocketIOServer): AutomationWorker {
  if (!workerInstance) {
    workerInstance = new AutomationWorker(io);
  }
  return workerInstance;
}

export function getAutomationWorker(): AutomationWorker | null {
  return workerInstance;
}
