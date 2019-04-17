import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { DxMapModule } from 'devextreme-angular/ui/map';
import { DxSelectBoxModule } from 'devextreme-angular/ui/select-box';
import { DxTagBoxModule } from 'devextreme-angular/ui/tag-box';
import { DxListModule  } from 'devextreme-angular/ui/list';
import { DxTextBoxModule } from 'devextreme-angular/ui/text-box';

import { AppComponent } from './components/app/app.component';
import { MapService } from './services/map.service';
import { MapComponent } from './components/map/map.component';
import { StateService } from './services/state.service';

@NgModule({
    declarations: [
        AppComponent,
        MapComponent
    ],
    imports: [
        CommonModule,
        HttpModule,
        FormsModule,
        RouterModule.forRoot([
            { path: '', component: MapComponent, pathMatch: 'full' },
            { path: 'map', component: MapComponent },
            { path: '**', redirectTo: '/map' }
        ])
        , DxMapModule, DxSelectBoxModule, DxListModule, DxTagBoxModule, DxTextBoxModule
    ],
    providers: [
        MapService,
        StateService
    ]
})
export class AppModuleShared {
}
