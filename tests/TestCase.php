<?php

namespace MuenchDev\StatamicAiWriter\Tests;

use MuenchDev\StatamicAiWriter\ServiceProvider;
use Statamic\Testing\AddonTestCase;

abstract class TestCase extends AddonTestCase
{
    protected string $addonServiceProvider = ServiceProvider::class;
}
