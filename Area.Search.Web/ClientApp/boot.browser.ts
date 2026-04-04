import 'reflect-metadata';
import 'zone.js';
import 'bootstrap';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.browser.module';

enableProdMode();

platformBrowserDynamic().bootstrapModule(AppModule);
