<?php

namespace Kirschbaum\SST\Console\Commands;

class EnvPullCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:env:pull';

    protected $description = 'Pull environment variables from AWS Secrets Manager';

    protected function subcommand(): string
    {
        return 'env:pull';
    }
}
