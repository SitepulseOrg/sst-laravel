import { IAMClient } from '@aws-sdk/client-iam';
export declare function getAwsAccountId(iamClient: IAMClient): Promise<string>;
export declare function ensureGithubOidcProvider(iamClient: IAMClient, githubOidcUrl: string): Promise<string>;
export declare function buildTrustPolicy(oidcProviderArn: string, owner: string, repo: string, branch: string): object;
