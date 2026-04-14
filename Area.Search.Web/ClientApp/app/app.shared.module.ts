import { NgModule, APP_INITIALIZER } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GoogleMapsModule } from '@angular/google-maps';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { TabsModule } from 'primeng/tabs';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ListboxModule } from 'primeng/listbox';
import { OrderListModule } from 'primeng/orderlist';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AppComponent } from './components/app/app.component';
import { MapService } from './services/map.service';
import { MapComponent } from './components/map/map.component';
import { StateService } from './services/state.service';
import {RouteService} from "./services/route.service";
import {RouteDrawingService} from "./services/routeDrawing.service";

export function loadGoogleMaps() {
    return () => {
        return new Promise<void>((resolve) => {
            if (typeof google !== 'undefined' && google.maps) {
                resolve();
            } else {
                const script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDOnmIpJ7OEmDsEZ8KoFeB-t53MsAmva8Y';
                script.onload = () => resolve();
                document.head.appendChild(script);
            }
        });
    };
}

@NgModule({
    declarations: [
        AppComponent,
        MapComponent
    ],
    imports: [
        CommonModule,
        HttpClientModule,
        FormsModule,
        RouterModule.forRoot([
            {path: '', component: MapComponent, pathMatch: 'full'},
            {path: 'map', component: MapComponent},
            {path: '**', redirectTo: '/map'}
        ]),
        TabsModule,
        MultiSelectModule,
        SelectModule,
        ListboxModule,
        OrderListModule,
        TableModule,
        InputTextModule,
        Checkbox,
        ButtonModule,
        GoogleMapsModule,
        ToastModule
    ],
    providers: [
        provideAnimations(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        { provide: APP_INITIALIZER, useFactory: loadGoogleMaps, multi: true },
        MapService,
        StateService,
        RouteService,
        RouteDrawingService,
        MessageService
    ]
})
export class AppModuleShared {
}