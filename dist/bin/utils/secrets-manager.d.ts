/**
 * Get the secret path for a given app and stage.
 * Format: /{app-name}/{stage}/env
 */
export declare function getSecretPath(appName: string, stage: string): string;
/**
 * List available stages for an app by inspecting Secrets Manager paths.
 */
export declare function listAvailableStages(appName: string, region?: string): Promise<string[]>;
/**
 * Parse an .env file content into a key-value object.
 */
export declare function parseEnvFile(content: string): Record<string, string>;
/**
 * Convert a key-value object to .env file content.
 */
export declare function toEnvFileContent(vars: Record<string, string>): string;
/**
 * Split variables into chunks that fit within the AWS Secrets Manager limit.
 */
export declare function splitIntoChunks(vars: Record<string, string>): Record<string, string>[];
/**
 * Check if variables need to be chunked.
 */
export declare function needsChunking(vars: Record<string, string>): boolean;
/**
 * Pull environment variables from AWS Secrets Manager.
 * Handles both legacy single secrets and chunked secrets.
 */
export declare function pullSecrets(secretPath: string, region?: string): Promise<Record<string, string> | null>;
/**
 * Get a deterministic fingerprint for the current secret contents.
 */
export declare function getSecretsFingerprint(secretPath: string, region?: string): Promise<string>;
/**
 * Check if a secret exists in AWS Secrets Manager.
 */
export declare function secretExists(secretPath: string, region?: string): Promise<boolean>;
/**
 * Push environment variables to AWS Secrets Manager.
 * Automatically handles chunking for large env files.
 */
export declare function pushSecrets(secretPath: string, vars: Record<string, string>, region?: string): Promise<{
    chunked: boolean;
    chunks: number;
}>;
/**
 * Get info about the current secret structure.
 */
export declare function getSecretInfo(secretPath: string, region?: string): Promise<{
    exists: boolean;
    chunked: boolean;
    chunks: number;
    totalKeys: number;
} | null>;
