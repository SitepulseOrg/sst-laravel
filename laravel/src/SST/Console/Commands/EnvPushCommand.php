<?php

namespace Kirschbaum\SST\Console\Commands;

class EnvPushCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:env:push';

    protected $description = 'Push environment variables to AWS Secrets Manager';

    protected function subcommand(): string
    {
        return 'env:push';
    }
}
