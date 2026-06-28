/**
 * Find the package root directory by looking for package.json
 * This works whether running from source (bin/utils/) or compiled (dist/bin/utils/)
 */
export declare function getPackageRoot(): string;
/**
 * Get the path to a template file
 */
export declare function getTemplatePath(templateName: string): string;
export declare function findSstConfig(): string | null;
export declare function extractSstProjectName(configPath: string): string | null;
export declare function extractLaravelComponents(configPath: string): string[];
export declare function extractEnvironmentFile(configPath: string, stage: string): string | null;
export declare function validateDeployment(stage: string): void;
/**
 * Extract RemoteEnvVault secrets configuration from SST config
 * Returns the custom path if specified, or null if no RemoteEnvVault is used
 */
export declare function extractSecretsConfig(configPath: string): {
    path?: string;
} | null;
