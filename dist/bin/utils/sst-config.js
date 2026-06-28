import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Find the package root directory by looking for package.json
 * This works whether running from source (bin/utils/) or compiled (dist/bin/utils/)
 */
export function getPackageRoot() {
    let dir = __dirname;
    // Traverse up until we find package.json
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'package.json'))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    throw new Error('Could not find package root (package.json not found)');
}
/**
 * Get the path to a template file
 */
export function getTemplatePath(templateName) {
    const packageRoot = getPackageRoot();
    return path.join(packageRoot, 'templates', templateName);
}
export function findSstConfig() {
    const cwd = process.cwd();
    const possiblePaths = [
        path.join(cwd, 'sst.config.ts'),
        path.join(cwd, 'sst.config.js'),
    ];
    for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
            return configPath;
        }
    }
    return null;
}
export function extractSstProjectName(configPath) {
    const content = fs.readFileSync(configPath, 'utf-8');
    const match = content.match(/name\s*:\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
}
function findLaravelComponentsInContent(content) {
    const regex = /new\s+LaravelService\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const components = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        components.push(match[1]);
    }
    return components;
}
function resolveImportedFiles(content, sourceDir) {
    const importRegex = /(?:await\s+)?import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    const resolvedFiles = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        // Only resolve relative imports
        if (!importPath.startsWith('.')) {
            continue;
        }
        const resolved = resolveToFile(path.resolve(sourceDir, importPath));
        if (resolved) {
            resolvedFiles.push(resolved);
        }
    }
    return resolvedFiles;
}
function resolveToFile(filePath) {
    // Try the path as-is (already has extension)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return filePath;
    }
    // Try adding extensions
    for (const ext of ['.ts', '.js']) {
        const withExt = filePath + ext;
        if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
            return withExt;
        }
    }
    // Try as directory with index file
    for (const ext of ['.ts', '.js']) {
        const indexFile = path.join(filePath, `index${ext}`);
        if (fs.existsSync(indexFile)) {
            return indexFile;
        }
    }
    return null;
}
function collectComponentsRecursively(filePath, visited) {
    const resolved = path.resolve(filePath);
    if (visited.has(resolved)) {
        return [];
    }
    visited.add(resolved);
    const content = fs.readFileSync(resolved, 'utf-8');
    const components = findLaravelComponentsInContent(content);
    const importedFiles = resolveImportedFiles(content, path.dirname(resolved));
    for (const importedFile of importedFiles) {
        components.push(...collectComponentsRecursively(importedFile, visited));
    }
    return components;
}
export function extractLaravelComponents(configPath) {
    const content = fs.readFileSync(configPath, 'utf-8');
    const components = findLaravelComponentsInContent(content);
    // Fast path: components found directly in the main config
    if (components.length > 0) {
        return components;
    }
    // Follow dynamic imports to find LaravelService in sub-files
    const visited = new Set([path.resolve(configPath)]);
    const importedFiles = resolveImportedFiles(content, path.dirname(configPath));
    for (const importedFile of importedFiles) {
        components.push(...collectComponentsRecursively(importedFile, visited));
    }
    return [...new Set(components)];
}
export function extractEnvironmentFile(configPath, stage) {
    const content = fs.readFileSync(configPath, 'utf-8');
    // Find the start of environment block
    const envMatch = content.match(/\benvironment\s*:\s*\{/);
    if (!envMatch || envMatch.index === undefined) {
        return null;
    }
    // Extract the environment block by counting braces
    const startIndex = envMatch.index + envMatch[0].length;
    let braceCount = 1;
    let endIndex = startIndex;
    for (let i = startIndex; i < content.length && braceCount > 0; i++) {
        if (content[i] === '{')
            braceCount++;
        if (content[i] === '}')
            braceCount--;
        endIndex = i;
    }
    const envBlock = content.substring(startIndex, endIndex);
    // Now find the file property within the environment block
    const fileMatch = envBlock.match(/\bfile\s*:\s*[`'"]([^`'"]+)[`'"]/);
    if (!fileMatch) {
        return null;
    }
    let envFile = fileMatch[1];
    // Replace ${$app.stage} with actual stage value
    envFile = envFile.replace(/\$\{?\$app\.stage\}?/g, stage);
    return envFile;
}
export function validateDeployment(stage) {
    const configPath = findSstConfig();
    if (!configPath) {
        throw new Error('Could not find sst.config.ts or sst.config.js in current directory.');
    }
    const envFile = extractEnvironmentFile(configPath, stage);
    const secretsConfig = extractSecretsConfig(configPath);
    // Only validate env file if secrets are not configured
    if (envFile && !secretsConfig) {
        const cwd = process.cwd();
        const envFilePath = path.join(cwd, envFile);
        if (!fs.existsSync(envFilePath)) {
            throw new Error(`Environment file "${envFile}" not found. Please create the file or update your sst.config.ts configuration.`);
        }
    }
}
/**
 * Extract RemoteEnvVault secrets configuration from SST config
 * Returns the custom path if specified, or null if no RemoteEnvVault is used
 */
export function extractSecretsConfig(configPath) {
    const content = fs.readFileSync(configPath, 'utf-8');
    // Check if RemoteEnvVault is used
    const laravelEnvMatch = content.match(/new\s+RemoteEnvVault\s*\(/);
    if (!laravelEnvMatch) {
        return null;
    }
    // Check if secrets is configured in environment
    const secretsMatch = content.match(/secrets\s*:\s*(\w+)/);
    if (!secretsMatch) {
        return null;
    }
    // Try to extract custom path from RemoteEnvVault constructor
    const pathMatch = content.match(/new\s+RemoteEnvVault\s*\([^)]*path\s*:\s*['"`]([^'"`]+)['"`]/);
    return {
        path: pathMatch ? pathMatch[1] : undefined,
    };
}
//# sourceMappingURL=sst-config.js.map