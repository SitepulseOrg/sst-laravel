<?php

namespace Kirschbaum\SST\Console\Commands;

class SshCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:ssh';

    protected $description = 'SSH into a running ECS task';

    protected function subcommand(): string
    {
        return 'ssh';
    }
}
