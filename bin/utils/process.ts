export const resolveBin = (command: string): string => {
  if (process.platform !== 'win32') {
    return command;
  }

  return command === 'npm' || command === 'npx' ? `${command}.cmd` : command;
};
