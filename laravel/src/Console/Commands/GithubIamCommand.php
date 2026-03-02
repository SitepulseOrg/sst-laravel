<?php

namespace Kirschbaum\SST\Console\Commands;

class GithubIamCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:github-iam';

    protected $description = 'Create an IAM Role on AWS for GitHub Actions OIDC authentication for deployments';

    protected function subcommand(): string
    {
        return 'github-iam';
    }
}
