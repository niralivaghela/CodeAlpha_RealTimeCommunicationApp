const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  appVersion: '1.0.0',
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window-maximized-state', (event, isMaximized) => {
      callback(isMaximized);
    });
  },
  getDesktopSources: (options) => ipcRenderer.invoke('get-desktop-sources', options),
  showNotification: (data) => ipcRenderer.send('show-notification', data),
  onDeepLink: (callback) => {
    ipcRenderer.on('deep-link-meeting', (event, meetingId) => {
      callback(meetingId);
    });
  },
  onTriggerNewMeeting: (callback) => {
    ipcRenderer.on('trigger-new-meeting', () => callback());
  },
  onTriggerJoinMeeting: (callback) => {
    ipcRenderer.on('trigger-join-meeting', () => callback());
  },
  onTriggerSettings: (callback) => {
    ipcRenderer.on('trigger-settings', () => callback());
  },
  openExternal: (url) => ipcRenderer.send('open-external', url),
});
