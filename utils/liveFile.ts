
// Utility to handle File System Access API for Live Monitoring

export const hasFileSystemAccessSupport = (): boolean => {
  return 'showOpenFilePicker' in window;
};

export const openFileHandle = async (): Promise<FileSystemFileHandle> => {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Performance Test Results',
          accept: {
            'text/csv': ['.csv', '.jtl'],
            'application/json': ['.json']
          },
        },
      ],
      multiple: false,
    });
    return handle;
  } catch (err) {
    throw err; // Re-throw to handle user cancellation
  }
};

export const getFileFromHandle = async (handle: FileSystemFileHandle): Promise<File> => {
  return await handle.getFile();
};

export const saveProjectFile = async (content: string, suggestedName: string) => {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'PerfAnalyzer Project',
          accept: { 'application/json': ['.perf', '.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      // Fallback for browsers without File System Access API
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Failed to save file:', err);
  }
};
