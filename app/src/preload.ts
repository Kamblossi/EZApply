import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipc: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    on: (channel: string, func: (event: any, ...args: any[]) => void) =>
      ipcRenderer.on(channel, (event, ...args) => func(event, ...args))
  }
});
