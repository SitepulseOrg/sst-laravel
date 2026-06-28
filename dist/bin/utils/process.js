export const resolveBin = (command) => {
    if (process.platform !== 'win32') {
        return command;
    }
    return command === 'npm' || command === 'npx' ? `${command}.cmd` : command;
};
//# sourceMappingURL=process.js.map