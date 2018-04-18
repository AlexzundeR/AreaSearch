import { Component, Input, ViewChild } from '@angular/core';
import { MapData, MapDataPoint } from '../../models/map-data.model';
import { } from '@types/googlemaps';
import { MapService } from '../../services/map.service';
import { DxListComponent } from 'devextreme-angular/ui/list';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import { DxMapComponent } from 'devextreme-angular/ui/map';
//import { forEach } from '@angular/router/src/utils/collection';

import { StateService } from '../../services/state.service';
import { MapMarker } from '../../models/map-marker.type';
import { ChangeDetectorRef } from '@angular/core';



@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css']
})
export class MapComponent {
    mapData: MapData[] = [];
    mapDataSource: MapData[] = [];
    @Input() searchString: string = "";
    @Input() typeString: string = "";
    @Input() ignoreTypeString: string = "";
    mapMarkers: MapMarker[] = [];

    defaultCenter = [55.7558, 37.6173];
    @Input() useMapBounds: boolean = true;
    @Input() selectedMapData: MapData[] = [];
    @ViewChild('dataList') dataList: DxListComponent;
    @ViewChild('map') mapControl: DxMapComponent;
    map: any;
    mapCenter: any;
    mapZoom: any;

    constructor(
        private mapService: MapService,
        private stateService: StateService,
        private changesDetector: ChangeDetectorRef) {

        this.mapChanged = this.mapChanged.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener("resize", this.onWindowResize);
    }

    onWindowResize() {
        if (this.map && window.innerWidth < 769) {
            this.map.setOptions({ gestureHandling: 'cooperative' });
        } else {
            this.map.setOptions({ gestureHandling: 'greedy' });
        }
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
                this.selectedMapData = state.selectedMapData.map((e: any) => this.mapData.find(d => d.id == e.id));
            }
        }

        this.updateDataSource();
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
        this.onWindowResize();   
    }


    mapChanged() {
        this.mapCenter = (this.map as google.maps.Map).getCenter();
        this.mapZoom = (this.map as google.maps.Map).getZoom();
        this.updateState();
    }

    selectedMapDataChanged(e: any) {
        var newData = this.selectedMapData.filter(d => (e.removedItems as MapData[]).every(p => p.id != d.id));
        (e.addedItems as MapData[]).filter(d => newData.every(p => p.id != d.id)).forEach(e => {
            newData.push(e);
        });
        //this.changesDetector.detectChanges();
        this.selectedMapData = newData;
        this.updateState();
    }

    onShowOnMapClick() {
        var points = new Array<{ d: MapData, p: MapDataPoint, point: number[] }>();
        this.mapMarkers.forEach((sm: MapMarker) => {
            sm.toggleInfoWindow(false);
        });
        this.selectedMapData.forEach(d => {
            d.data && d.data.forEach(dp => {
                dp.points && dp.points.forEach(p => {
                    points.push({
                        d: d,
                        p: dp,
                        point: p
                    });
                });
            });
        });

        this.mapMarkers = points.map(p => {
            return new MapMarker(p.point, { text: `${p.d.name} ${p.p.bigType}|${p.p.type}` });
        });
    }

    markerAdded(event: any) {
        google.maps.event.clearInstanceListeners(event.originalMarker);
        event.options.originalMarker = event.originalMarker;
        google.maps.event.addListener(event.originalMarker, "click", function (args: any) {
            event.options.toggleInfoWindow();
            console.log(event);
        });
        var that = this;
        google.maps.event.addListener(event.originalMarker, "dblclick", function (args: any) {

        });
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
                    this.updateDataSource();
                    this.listIndicateLoading(false);
                    this.updateState();
                });
        } else {
            this.mapService.mapDataQuery(this.searchString, this.typeString, this.ignoreTypeString)
                .then((data) => {
                    this.mapData = data;
                    this.updateDataSource();
                    this.listIndicateLoading(false);
                    this.updateState();
                });;
        }
    }

    updateDataSource() {
        this.mapDataSource = this.mapData;
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
