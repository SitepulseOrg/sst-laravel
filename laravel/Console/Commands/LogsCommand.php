<?php

namespace Sitepulse\SST\Console\Commands;

class LogsCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:logs';

    protected $description = 'Stream CloudWatch logs from a running ECS task';

    protected function subcommand(): string
    {
        return 'logs';
    }
}
