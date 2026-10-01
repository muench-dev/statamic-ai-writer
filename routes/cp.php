<?php

use Illuminate\Support\Facades\Route;
use MuenchDev\StatamicAiWriter\Http\Controllers\AiWriterController;

Route::prefix('ai-writer')->name('ai-writer.')->group(function () {
    Route::post('process', [AiWriterController::class, 'process'])->name('process');
    Route::post('classify', [AiWriterController::class, 'classify'])->name('classify');
    Route::post('titles', [AiWriterController::class, 'titles'])->name('titles');
    Route::get('settings', [AiWriterController::class, 'settings'])->name('settings');
});
