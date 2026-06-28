<?php

namespace Sitepulse\SST;

use Illuminate\Support\ServiceProvider;
use Sitepulse\SST\Console\Commands\SshCommand;
use Sitepulse\SST\Console\Commands\InitCommand;
use Sitepulse\SST\Console\Commands\LogsCommand;
use Illuminate\Contracts\Foundation\Application;
use Sitepulse\SST\Console\Commands\DeployCommand;
use Sitepulse\SST\Console\Commands\EnvPullCommand;
use Sitepulse\SST\Console\Commands\EnvPushCommand;
use Sitepulse\SST\Console\Commands\InstallCommand;
use Sitepulse\SST\Console\Commands\GithubIamCommand;
use Sitepulse\SST\Console\Commands\CommandRunCommand;

/**
 * @property Application $app
 */
class SstLaravelServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom($this->configFile(), 'sst-laravel');
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                $this->configFile() => $this->publishedConfigPath(),
            ], 'sst-laravel-config');

            $this->commands([
                InitCommand::class,
                DeployCommand::class,
                CommandRunCommand::class,
                SshCommand::class,
                LogsCommand::class,
                GithubIamCommand::class,
                InstallCommand::class,
                EnvPullCommand::class,
                EnvPushCommand::class,
            ]);
        }
    }

    protected function configFile(): string
    {
        return __DIR__.'/../config/sst-laravel.php';
    }

    protected function publishedConfigPath(): string
    {
        if (function_exists('config_path')) {
            return \config_path('sst-laravel.php');
        }

        return $this->app->basePath('config/sst-laravel.php');
    }
}
