import { ECSClient, Task } from '@aws-sdk/client-ecs';
export interface EcsTaskResult {
    task: Task;
    clusterArn: string;
}
export declare function findClusterArn(ecsClient: ECSClient, stage: string, clusterOption?: string): Promise<string>;
export declare function findTask(ecsClient: ECSClient, clusterArn: string, service?: string, selectPrompt?: string): Promise<Task>;
