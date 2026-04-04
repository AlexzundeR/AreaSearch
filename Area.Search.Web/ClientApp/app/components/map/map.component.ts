import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MapData, MapDataPoint } from '../../models/map-data.model';
import { MapService } from '../../services/map.service';
import { DxListModule } from 'devextreme-angular/ui/list';
import DataSource from 'devextreme/data/data_source';
import ArrayStore from 'devextreme/data/array_store';
import { DxMapModule } from 'devextreme-angular/ui/map';
import { StateService } from '../../services/state.service';
import { MapMarker } from '../../models/map-marker.type';
import { RouteService, ServiceError } from "../../services/route.service";
import { Route, RoutePoint } from "../../models/route.type";
import { RouteDrawingService } from "../../services/routeDrawing.service";
import { Observable, map } from "rxjs";

@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css']
})
export class MapComponent implements OnChanges {

    polygon: any;

    mapData: MapData[] = [];
    mapDataSource: MapData[] = [];
    allTypes: string[] = [];
    @Input() searchString: string = "";
    selectedTypes: string[] = [];
    ignoredTypes: string[] = [];
    mapMarkers: MapMarker[] = [];

    routeDataSource: Observable<RoutePoint[]>;

    defaultCenter = [55.7558, 37.6173];
    @Input() useMapPolygon: boolean = true;
    @Input() useMapBounds: boolean = true;
    @Input() showCurrentPosition: boolean = false;
    @Input() showRoute: boolean = true;
    @Input() selectedMapData: MapData[] = [];
    @Input() selectedPoints: RoutePoint[] = [];
    @ViewChild('routeList') routeList: any;
    @ViewChild('dataList') dataList: any;
    @ViewChild('map') mapControl!: any;
    map!: google.maps.Map;
    mapCenter!: any;
    mapZoom!: any;
    lastError?: ServiceError = { error: "ERROR", description: "ERROR" };
    drawingManager!: google.maps.drawing.DrawingManager;
    initialPolygonPoints: number[][] = [];

    constructor(
        private mapService: MapService,
        private stateService: StateService,
        private routeService: RouteService,
        private routeDrawingService: RouteDrawingService) {

        this.mapChanged = this.mapChanged.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener("resize", this.onWindowResize);

        this.mapService.allTypesObs.subscribe((types) => {
            this.allTypes = types.sort();
        });
        this.routeDataSource = this.routeService.$routePoints.pipe(map(p => p));

        this.routeService.$errors.subscribe((error) => {
            if (error.error === 'concurrent_access') {
                if (confirm('Кто-то уже изменил маршрут. Загрузить изменения (ваши правки будут утеряны)?')) {
                    this.routeService.getRoute(1).then();
                }
            } else {
                this.lastError = error;
            }
        });
    }

    onWindowResize() {
        if (this.map && window.innerWidth < 769) {
            this.map.setOptions({ gestureHandling: 'cooperative' });
        } else {
            this.map.setOptions({ gestureHandling: 'greedy' });
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
            if (this.mapControl) {
                this.mapControl.center = state.center || this.defaultCenter;
            }
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
            if (state.useBoundaries != null) {
                this.useMapBounds = state.useBoundaries;
            }
            if (state.selectedMapData) {
                this.selectedMapData = state.selectedMapData.filter((e: any) => e).map((e: any) => this.mapData.find(d => d.id == e.id));
            }
            if (state.usePolygon != null) {
                this.useMapPolygon = state.usePolygon;
                this.refreshDrawingTools()
            }
            if (state.polygon) {
                this.initialPolygonPoints = state.polygon;
            }
        }
        this.redrawRoute();
        this.updateDataSource();
    }

    onSearchStringChanged(e: any) {
    }

    typeSelectionChanged(e: any) {
    }

    ignoredTypeSelectionChanged(e: any) {
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

        if (google.maps.drawing) {
            this.drawingManager = new google.maps.drawing.DrawingManager({
                drawingMode: null,
                drawingControl: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: [
                        google.maps.drawing.OverlayType.POLYGON,
                    ],
                }
            })
            this.refreshDrawingTools();

            this.drawingManager.addListener('overlaycomplete', (e: any) => { this.drawingPolygonCompleted(e) });
        }

        if (this.initialPolygonPoints && this.initialPolygonPoints.length) {
            this.redrawPolygon(this.initialPolygonPoints.map((e: number[]) => { return new google.maps.LatLng(e[0], e[1]) }));
        }
    }

    refreshDrawingTools() {
        if (!this.drawingManager) {
            return;
        }

        if (this.useMapPolygon) {
            this.drawingManager.setMap(this.map);
        } else {
            this.drawingManager.setMap(null);
        }
    }

    drawingPolygonCompleted(event: any) {
        var poly = event.overlay.getPath();
        if (event.type == 'polygon') {
            event.overlay.setMap(null);

            this.redrawPolygon(event.overlay.getPath().getArray());
            this.onSearchClick();
        }
    }

    redrawPolygon(points?: google.maps.LatLng[]) {
        if (this.polygon) {
            this.polygon.setMap(null);
        }

        if (!points && !this.polygon) {
            return;
        }

        this.polygon = new google.maps.Polygon({
            paths: points || this.polygon.getPath(),
            strokeColor: '#0000FF',
            strokeOpacity: 0.8,
            strokeWeight: 3,
            fillColor: '#0000FF',
            fillOpacity: 0.35,
            editable: true
        });

        this.drawingManager.setDrawingMode(null);

        if (!this.useMapPolygon) {
            return;
        }

        this.polygon.setMap(this.map);

        var path = this.polygon.getPath();

        google.maps.event.addListener(this.polygon, "dblclick", (event: any) => {
            if (event.vertex && this.polygon.getPath().length > 3) {
                this.polygon.getPath().removeAt(event.vertex);
            } else {
                this.polygon.setMap(null);
                this.polygon = null;

                this.onSearchClick();
            }
        });

        google.maps.event.addListener(path, "insert_at", () => {
            this.onSearchClick();
        });
        google.maps.event.addListener(path, "set_at", () => {
            this.onSearchClick();
        });
        google.maps.event.addListener(path, "remove_at", () => {
            this.onSearchClick();
        });
    }

    mapChanged() {
        this.mapCenter = (this.map as google.maps.Map).getCenter();
        this.mapZoom = (this.map as google.maps.Map).getZoom();
        this.updateState();
        if (this.useMapBounds && !this.useMapPolygon) {
            this.onSearchClick();
        }
    }

    selectedMapDataChanged(e: any) {
        var newData = this.selectedMapData.filter(d => (e.removedItems as MapData[]).every(p => p.id != d.id));
        (e.addedItems as MapData[]).filter(d => newData.every(p => p.id != d.id)).forEach(e => {
            newData.push(e);
        });
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

    filterPointByPolygon(p: number[]) {
        if (!this.polygon) {
            return true;
        }

        return google.maps.geometry.poly.containsLocation(new google.maps.LatLng(p[0], p[1]), this.polygon);
    }

    markerAdded(event: any) {
        google.maps.event.clearInstanceListeners(event.originalMarker);
        event.options.originalMarker = event.originalMarker;
        google.maps.event.addListener(event.originalMarker, "click", function (args: any) {
            event.options.toggleInfoWindow();
            console.log(event);
        });
    }

    listIndicateLoading(loading: boolean) {
        if (loading) {
            if (this.dataList && this.dataList.instance) {
                (this.dataList.instance as any)._scrollView.startLoading()
            }
        } else {
            if (this.dataList && this.dataList.instance) {
                (this.dataList.instance as any)._scrollView.finishLoading()
            }
        }
    }

    onSearchClick() {

        this.listIndicateLoading(true);
        var mapBounds: { ne: google.maps.LatLng, sw: google.maps.LatLng } | null = null;
        var filterigCallback: ((p: number[]) => boolean) | null = null;
        if (this.useMapBounds) {
            let bounds = (this.map as google.maps.Map).getBounds();
            if (bounds == null) return;
            var ne = bounds.getNorthEast();
            var sw = bounds.getSouthWest();
            mapBounds = { ne: ne, sw: sw };
        }

        if (this.useMapPolygon) {
            filterigCallback = this.filterPointByPolygon.bind(this);
            if (this.polygon) {
                let bounds = new google.maps.LatLngBounds();
                this.polygon.getPath().forEach(function (latlng: any) {
                    bounds.extend(latlng);
                });
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                mapBounds = { ne: ne, sw: sw };
            }
        }

        this.mapService.mapDataQuery(this.searchString, this.selectedTypes, this.ignoredTypes, mapBounds, filterigCallback)
            .then((data) => {
                this.mapData = data;
                this.updateDataSource();
                this.listIndicateLoading(false);
                this.updateState();

                if (this.mapData) {
                    var newTypes = new Set<string>();
                    this.mapData.forEach(e => {
                        if (e.data) {
                            e.data.forEach(d => {
                                newTypes.add(d.type);
                            });
                        }
                    });
                    this.allTypes = Array.from(newTypes);
                }

            });
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
            selectedMapData: this.selectedMapData,
            usePolygon: this.useMapPolygon,
            polygon: this.polygon ? this.polygon.getPath().getArray().map((e: any) => { return [e.lat(), e.lng()] }) : null
        })
    }

    onAddRoutePointClick() {
        const mapCenter = this.map ? this.map.getCenter() : new google.maps.LatLng(55.7558, 37.613);

        const newPoint = {
            name: '',
            coordinates: {
                lng: mapCenter!.lng(),
                lat: mapCenter!.lat()
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
        this.selectedPoints = newData;
    }

    redrawRoute() {
        this.lastError = undefined;
        if (this.showRoute) {
            this.routeService.getRoute(1).then();
        }
        this.routeDrawingService.setEnabled(this.showRoute);
    }

    onUseMapPolygonChanged() {
        this.refreshDrawingTools();
        this.redrawPolygon();
        this.onSearchClick();
    }

    onUseMapBoundsChanged() {
        this.onSearchClick();
    }

    onShowCurrentPositionChanged() {
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
        this.routeService.setPoint(point, { name: newValue } as RoutePoint);
    }

    pointDescriptionChanged($event: any, point: RoutePoint) {
        const newValue = $event.target.value;
        if (point.description === newValue) {
            return;
        }
        this.routeService.setPoint(point, { description: newValue } as RoutePoint);
    }
}
