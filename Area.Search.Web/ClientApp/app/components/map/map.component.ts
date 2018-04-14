import { Component, Input, ViewChild } from '@angular/core';
import { MapData } from '../../models/mapData.model';
import { } from '@types/googlemaps';
import { MapService } from '../../services/map.service';
import { DxListComponent } from 'devextreme-angular/ui/list';
import { StateService } from '../../services/state.service';
import { DxMapComponent } from 'devextreme-angular/ui/map';
import { forEach } from '@angular/router/src/utils/collection';



@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css']
})
export class MapComponent {
    mapData: MapData[] = [];
    @Input() searchString: string = "";
    @Input() typeString: string = "";
    @Input() ignoreTypeString: string = "";

    defaultCenter = [55.7558, 37.6173];
    @Input() useMapBounds: boolean = true;
    @Input() selectedMapData: MapData[] = [];
    @ViewChild('dataList') dataList: DxListComponent;
    @ViewChild('map') mapControl: DxMapComponent;
    map: any;
    mapCenter: any;
    mapZoom: any;

    constructor(private mapService: MapService, private stateService: StateService) {
        this.mapChanged = this.mapChanged.bind(this);
    }
    ngOnInit() {
        var state = this.stateService.loadState();
        if (state) {
            this.mapData = state.mapData;
            this.mapControl.center = state.center || this.defaultCenter;
            this.mapCenter = state.center || this.defaultCenter;
            this.mapZoom = state.zoom;
            if (state.searchString) {
                this.searchString = state.searchString;
            }
            if (state.typeString) {
                this.typeString = state.typeString;
            }
            if (state.ignoreTypeString) {
                this.ignoreTypeString = state.ignoreTypeString;
            }
            if (state.useBoundaries) {
                this.useMapBounds = state.useBoundaries;
            }
            if (state.selectedMapData) {
                this.selectedMapData = state.selectedMapData.map((e:any)=>this.mapData.find(d=>d.id==e.id));
            }
        }
    }

    mapDataSelectionChanged(event: { selectedItem: MapData }) {
        alert(event.selectedItem.name);
    }

    onMapReady(event: any) {
        this.map = event.originalMap as google.maps.Map;
        if (this.mapCenter) {
            (this.map as google.maps.Map).setCenter(this.mapCenter);
        }
        if (this.mapZoom) {
            (this.map as google.maps.Map).setZoom(this.mapZoom);
        }
        this.map.addListener('center_changed', this.mapChanged);
        this.map.addListener('zoom_changed', this.mapChanged);
    }

    mapChanged() {
        this.mapCenter = (this.map as google.maps.Map).getCenter();
        this.mapZoom = (this.map as google.maps.Map).getZoom();
        this.updateState();
    }

    selectedMapDataChanged(e: any) {
        this.updateState();
    }

    listIndicateLoading(loading: boolean) {
        if (loading) {
            (this.dataList.instance as any)._scrollView.startLoading()
            //(this.dataList.instance as any)._dataSourceLoadingChangedHandler(loading);
        } else {
            (this.dataList.instance as any)._scrollView.finishLoading()
        }
    }

    onSearchClick() {

        this.listIndicateLoading(true);
        if (this.useMapBounds) {
            var bounds = (this.map as google.maps.Map).getBounds();
            if (bounds == null) return;
            var ne = bounds.getNorthEast(); // LatLng of the north-east corner
            var sw = bounds.getSouthWest();
            this.mapService.mapDataQuery(this.searchString, this.typeString, this.ignoreTypeString, { ne: ne, sw: sw })
                .then((data) => {
                    this.mapData = data;
                    this.listIndicateLoading(false);
                    this.updateState();
                });
        } else {
            this.mapService.mapDataQuery(this.searchString, this.typeString, this.ignoreTypeString)
                .then((data) => {
                    this.mapData = data;
                    this.listIndicateLoading(false);
                    this.updateState();
                });;
        }
    }

    updateState() {
        this.stateService.saveState({
            mapData: this.mapData,
            center: this.mapCenter,
            zoom: this.mapZoom,
            searchString: this.searchString,
            typeString: this.typeString,
            ignoreTypeString: this.ignoreTypeString,
            useBoundaries: this.useMapBounds,
            selectedMapData: this.selectedMapData
        })
    }
}
