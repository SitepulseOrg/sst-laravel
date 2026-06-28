<?php

namespace Sitepulse\SST\Console\Commands;

class InstallCommand extends SstLaravelCommand
{
    protected $signature = 'sst-laravel:install';

    protected $description = 'Run SST install, handling existing .sst folder by temporarily renaming sst.config.ts';

    protected function subcommand(): string
    {
        return 'install';
    }
}
