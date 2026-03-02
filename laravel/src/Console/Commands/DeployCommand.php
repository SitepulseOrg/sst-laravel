<?php

namespace Kirschbaum\SST\Console\Commands;

class DeployCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:deploy';

    protected $description = 'Deploy the application using SST';

    protected function subcommand(): string
    {
        return 'deploy';
    }
}
