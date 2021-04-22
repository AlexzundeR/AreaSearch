import {Component, Input, OnChanges, SimpleChanges, ViewChild} from '@angular/core';
import {MapData, MapDataPoint} from '../../models/map-data.model';
import {} from '@types/googlemaps';
import {MapService} from '../../services/map.service';
import {DxListComponent} from 'devextreme-angular/ui/list';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import {DxMapComponent} from 'devextreme-angular/ui/map';
//import { forEach } from '@angular/router/src/utils/collection';

import {StateService} from '../../services/state.service';
import {MapMarker} from '../../models/map-marker.type';
import {ChangeDetectorRef} from '@angular/core';
import {RouteService} from "../../services/route.service";
import {Route, RoutePoint} from "../../models/route.type";
import {RouteDrawingService} from "../../services/routeDrawing.service";
import {Observable} from "rxjs/Observable";


@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css']
})
export class MapComponent implements OnChanges {
    mapData: MapData[] = [];
    mapDataSource: MapData[] = [];
    allTypes: string[] = [];
    @Input() searchString: string = "";
    // @Input() typeString: string = "";
    // @Input() ignoreTypeString: string = "";
    selectedTypes: string[] = [];
    ignoredTypes: string[] = [];
    mapMarkers: MapMarker[] = [];

    routeDataSource: Observable<RoutePoint[]>;

    defaultCenter = [55.7558, 37.6173];
    @Input() useMapBounds: boolean = true;
    @Input() showCurrentPosition: boolean = false;
    @Input() showRoute: boolean = true;
    @Input() selectedMapData: MapData[] = [];
    @Input() selectedPoints: RoutePoint[] = [];
    @ViewChild('routeList') routeList: DxListComponent;
    @ViewChild('dataList') dataList: DxListComponent;
    @ViewChild('map') mapControl: DxMapComponent;
    map: google.maps.Map;
    mapCenter: any;
    mapZoom: any;

    constructor(
        private mapService: MapService,
        private stateService: StateService,
        private routeService: RouteService,
        private routeDrawingService: RouteDrawingService,
        private changesDetector: ChangeDetectorRef) {

        this.mapChanged = this.mapChanged.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener("resize", this.onWindowResize);

        this.mapService.allTypesObs.subscribe((types) => {
            this.allTypes = types.sort();
        });
        this.routeDataSource = this.routeService.$routePoints.map(p=>p);
    }

    onWindowResize() {
        if (this.map && window.innerWidth < 769) {
            this.map.setOptions({gestureHandling: 'cooperative'});
        } else {
            this.map.setOptions({gestureHandling: 'greedy'});
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('showRoute' in changes) {
            this.redrawRoute();
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
                try {
                    this.selectedTypes = JSON.parse(state.typeString);
                } catch (e) {
                    this.selectedTypes = [];
                }
            }
            if (state.ignoreTypeString) {
                try {
                    this.ignoredTypes = JSON.parse(state.ignoreTypeString);
                } catch (e) {
                    this.ignoredTypes = [];
                }
            }
            if (state.useBoundaries) {
                this.useMapBounds = state.useBoundaries;
            }
            if (state.selectedMapData) {
                this.selectedMapData = state.selectedMapData.map((e: any) => this.mapData.find(d => d.id == e.id));
            }
        }
        this.redrawRoute();
        this.updateDataSource();
    }


    typeSelectionChanged() {
        //this.typeString = this.selectedTypes.join(' ');
    }

    ignoredTypeSelectionChanged() {
        //this.ignoreTypeString = this.ignoredTypes.join(' ');
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

        this.routeDrawingService.setMap(this.map);
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
            return new MapMarker(p.point, {text: `${p.d.name} ${p.p.bigType}|${p.p.type}`});
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
            this.mapService.mapDataQuery(this.searchString, this.selectedTypes, this.ignoredTypes, {ne: ne, sw: sw})
                .then((data) => {
                    this.mapData = data;
                    this.updateDataSource();
                    this.listIndicateLoading(false);
                    this.updateState();
                });
        } else {
            this.mapService.mapDataQuery(this.searchString, this.selectedTypes, this.ignoredTypes)
                .then((data) => {
                    this.mapData = data;
                    this.updateDataSource();
                    this.listIndicateLoading(false);
                    this.updateState();
                });

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
            typeString: JSON.stringify(this.selectedTypes),
            ignoreTypeString: JSON.stringify(this.ignoredTypes),
            useBoundaries: this.useMapBounds,
            selectedMapData: this.selectedMapData
        })
    }

    onAddRoutePointClick() {
        const center = this.map ? this.map.getCenter() : new google.maps.LatLng(55.7558, 37.613);

        const newPoint = {
            name: '',
            coordinates: {
                lng: center.lng(),
                lat: center.lat()
            },
            routeId: this.routeService.route.routeId
        } as RoutePoint;

        this.routeService.addPoint(newPoint);
    }

    onDeleteRoutePointsClick() {
        this.routeService.deletePoints(this.selectedPoints).then(() => {
            this.selectedPoints = [];
        });
    }

    selectedPointsChanged(e: any) {
        var newData = this.selectedPoints.filter(d => (e.removedItems as RoutePoint[]).every(p => p.pointId != d.pointId));
        (e.addedItems as RoutePoint[]).filter(d => newData.every(p => p.pointId != d.pointId)).forEach(e => {
            newData.push(e);
        });
        //this.changesDetector.detectChanges();
        this.selectedPoints = newData;
    }

    redrawRoute() {
        if (this.showRoute) {
            this.routeService.getRoute(1).then();
        }
        this.routeDrawingService.setEnabled(this.showRoute);
    }

    onShowCurrentPositionChanged(){
        this.routeDrawingService.setCurrentPositionShowEnabled(this.showCurrentPosition);
    }

    onRoutePointsReordered(e: { itemData: RoutePoint, fromIndex: number, toIndex: number }) {
        this.routeService.replacePoint(e.itemData, e.fromIndex, e.toIndex);
    }

    pointNameChanged($event: any, point: RoutePoint) {
        const newValue = $event.target.value;
        if (point.name === newValue) {
            return;
        }
        this.routeService.setPoint(point, {name: newValue} as RoutePoint);
    }

    pointDescriptionChanged($event: any, point: RoutePoint) {
        const newValue = $event.target.value;
        if (point.description === newValue) {
            return;
        }
        this.routeService.setPoint(point, {description: newValue} as RoutePoint);
    }
}
