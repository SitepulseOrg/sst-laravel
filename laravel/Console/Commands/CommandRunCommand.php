<?php

namespace Sitepulse\SST\Console\Commands;

class CommandRunCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:command:run';

    protected $description = 'Run a command in a running ECS task';

    protected function subcommand(): string
    {
        return 'command:run';
    }
}
