<?php

namespace Kirschbaum\SST\Console\Commands;

class InitCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:init';

    protected $description = 'Initialize SST and SST Laravel, creating a new sst.config.ts file to deploy your Laravel application';

    protected function subcommand(): string
    {
        return 'init';
    }
}
