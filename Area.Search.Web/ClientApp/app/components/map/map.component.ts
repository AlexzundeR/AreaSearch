import { Component, Input, OnChanges, SimpleChanges, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MapData, MapDataPoint } from '../../models/map-data.model';
import { MapService } from '../../services/map.service';
import { StateService } from '../../services/state.service';
import { MapMarker } from '../../models/map-marker.type';
import { RouteService, ServiceError } from "../../services/route.service";
import { Route, RoutePoint } from "../../models/route.type";
import { RouteDrawingService } from "../../services/routeDrawing.service";
import { MessageService } from 'primeng/api';
import { Observable, map } from "rxjs";

@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css']
})
export class MapComponent implements OnChanges, AfterViewInit {

    polygon: any;

    mapData: MapData[] = [];
    mapDataSource: MapData[] = [];
    allTypes: string[] = [];
    @Input() searchString: string = "";
    selectedTypes: string[] = [];
    ignoredTypes: string[] = [];
    mapMarkers: MapMarker[] = [];

    routeDataSource: Observable<RoutePoint[]>;

    defaultCenter = { lat: 55.7558, lng: 37.6173 };
    @Input() useMapPolygon: boolean = true;
    @Input() useMapBounds: boolean = true;
    @Input() showCurrentPosition: boolean = false;
    @Input() showRoute: boolean = true;
    @Input() selectedMapData: MapData[] = [];
    selectedPoint: RoutePoint | null = null;
    filterPanelCollapsed: boolean = false;
    filterColumnWidth: number = 500;
    private resizing: boolean = false;
    private startX: number = 0;
    private startWidth: number = 0;
    private boundResizeMove: any;
    private boundResizeEnd: any;
    focusedPointId: number | null = null;
    @ViewChild('routeList') routeList: any;
    @ViewChild('dataList') dataList: any;
    @ViewChild('map') mapControl!: any;
    @ViewChild('filterColumn') filterColumn!: any;
    map!: google.maps.Map;
    mapCenter!: any;
    mapZoom!: any;
    lastError?: ServiceError = { error: "ERROR", description: "ERROR" };
    drawingManager!: google.maps.drawing.DrawingManager;
    initialPolygonPoints: number[][] = [];

    // Google Maps options
    mapOptions: google.maps.MapOptions = {
        zoom: 10,
        center: this.defaultCenter,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
    };

    // Active tab for tab panel
    activeTabIndex: number = 0;
    saving: boolean = false;

    constructor(
        public mapService: MapService,
        private stateService: StateService,
        private routeService: RouteService,
        private routeDrawingService: RouteDrawingService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef) {

        this.mapChanged = this.mapChanged.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        window.addEventListener("resize", this.onWindowResize);

        this.mapService.allTypesObs.subscribe((types) => {
            this.allTypes = types.sort();
        });
        this.routeDataSource = this.routeService.$routePoints.pipe(map(p => p));

        this.routeService.$saving.subscribe(saving => this.saving = saving);

        this.routeService.$errors.subscribe((error) => {
            if (error.error === 'concurrent_access') {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Конфликт данных',
                    detail: 'Данные были изменены другим пользователем. Загрузить изменения?',
                    life: 10000
                });
            } else {
                this.messageService.add({
                    severity: 'error',
                    summary: error.error || 'Ошибка',
                    detail: error.description
                });
                this.lastError = error;
            }
        });
    }

    onWindowResize() {
        if (this.map) {
            if (window.innerWidth < 769) {
                this.map.setOptions({ gestureHandling: 'cooperative' });
            } else {
                this.map.setOptions({ gestureHandling: 'greedy' });
            }
        }
    }

    onResizeStart(event: MouseEvent) {
        if (this.isMobile()) return;
        
        event.preventDefault();
        
        this.resizing = true;
        this.startX = event.clientX;
        this.startWidth = this.filterColumnWidth;
        
        document.addEventListener('mousemove', this.onResizeMove);
        document.addEventListener('mouseup', this.onResizeEnd);
    }

    onResizeMove = (event: MouseEvent) => {
        if (!this.resizing) return;
        
        const diff = event.clientX - this.startX;
        const newWidth = Math.max(150, Math.min(800, this.startWidth + diff));
        this.filterColumnWidth = newWidth;
        this.cdr.detectChanges();
    }

    onResizeEnd = () => {
        this.resizing = false;
        document.removeEventListener('mousemove', this.onResizeMove);
        document.removeEventListener('mouseup', this.onResizeEnd);
        this.savePanelState();
    }

    private savePanelState() {
        localStorage.setItem('filterColumnWidth', this.filterColumnWidth.toString());
        localStorage.setItem('filterPanelCollapsed', this.filterPanelCollapsed.toString());
    }

    private loadPanelState(): { width: number; collapsed: boolean } {
        const width = localStorage.getItem('filterColumnWidth');
        const collapsed = localStorage.getItem('filterPanelCollapsed');
        return {
            width: width ? parseInt(width, 10) : 500,
            collapsed: collapsed === 'true'
        };
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('showRoute' in changes) {
            this.redrawRoute();
        }
    }

    ngOnInit() {
        if (window.innerWidth >= 769) {
            const panelState = this.loadPanelState();
            this.filterPanelCollapsed = panelState.collapsed;
            this.filterColumnWidth = panelState.collapsed ? 0 : panelState.width;
        } else {
            this.filterPanelCollapsed = true;
        }
        
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

    typeSelectionChanged() {
    }

    ignoredTypeSelectionChanged() {
    }

    onUseMapBoundsChanged() {
        this.onSearchClick();
    }

    onUseMapPolygonChanged() {
        this.refreshDrawingTools();
        this.redrawPolygon();
        this.onSearchClick();
    }

    refreshDrawingTools() {
        if (!this.map) return;
        
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

    @ViewChild('googleMap') googleMap!: any;

    ngAfterViewInit() {
        this.initMap();
    }

    private initMap() {
        if (!this.googleMap) return;
        
        const mapInstance = this.googleMap.googleMap;
        if (!mapInstance) {
            setTimeout(() => this.initMap(), 50);
            return;
        }
        
        this.map = mapInstance;
        this.routeDrawingService.setMap(mapInstance);
        this.map.addListener('bounds_changed', this.mapChanged);

        this.drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: true,
            drawingControlOptions: {
                drawingModes: [google.maps.drawing.OverlayType.POLYGON]
            },
            polygonOptions: {
                strokeColor: '#0000FF',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                fillColor: '#0000FF',
                fillOpacity: 0.35,
                editable: true
            }
        });

        this.drawingManager.addListener('overlaycomplete', (e: any) => { this.drawingPolygonCompleted(e) });

        if (this.initialPolygonPoints && this.initialPolygonPoints.length) {
            this.redrawPolygon(this.initialPolygonPoints.map((e: number[]) => { return new google.maps.LatLng(e[0], e[1]) }));
        }

        this.refreshDrawingTools();
    }

    onMapReady(event: any) {
    }

    onMarkerClick(marker: MapMarker) {
        marker.toggleInfoWindow();
    }

    onMarkerInitialized(marker: MapMarker, event: any) {
        marker.originalMarker = event;
        event.addListener('click', () => {
            this.onMarkerClick(marker);
        });
    }

    onGoogleMapClick(event: any) {
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
        
        setTimeout(() => {}, 0);
    }

    filterPointByPolygon(p: number[]) {
        if (!this.polygon) {
            return true;
        }

        return google.maps.geometry.poly.containsLocation(new google.maps.LatLng(p[0], p[1]), this.polygon);
    }

    markerAdded(event: any) {
    }

    listIndicateLoading(loading: boolean) {
        // PrimeNG doesn't have built-in loading indicator like DevExtreme
        // Could add custom loading overlay
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
                    const oldSelectedTypes = [...this.selectedTypes];
                    const oldIgnoredTypes = [...this.ignoredTypes];
                    this.allTypes = Array.from(newTypes).sort();
                    this.selectedTypes = oldSelectedTypes.filter(t => this.allTypes.includes(t));
                    this.ignoredTypes = oldIgnoredTypes.filter(t => this.allTypes.includes(t));
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
        if (this.selectedPoint) {
            this.routeService.deletePoints([this.selectedPoint]);
            this.selectedPoint = null;
        }
    }

    selectedPointsChanged(e: any) {
    }

    redrawRoute() {
        this.lastError = undefined;
        if (this.showRoute) {
            this.routeService.getRoute(1).then();
        }
        this.routeDrawingService.setEnabled(this.showRoute);
    }

    onShowCurrentPositionChanged() {
        this.routeDrawingService.setCurrentPositionShowEnabled(this.showCurrentPosition);
    }

    onRouteReorder() {
        this.routeService.reorderPoints(this.routeService.route.points);
    }

    movePointUp(point: RoutePoint) {
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === point.pointId);
        if (index > 0) {
            const temp = points[index];
            points[index] = points[index - 1];
            points[index - 1] = temp;
            this.routeService.reorderPoints([...points]);
        }
    }

    movePointDown(point: RoutePoint) {
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === point.pointId);
        if (index < points.length - 1) {
            const temp = points[index];
            points[index] = points[index + 1];
            points[index + 1] = temp;
            this.routeService.reorderPoints([...points]);
        }
    }

    moveSelectedPointUp() {
        if (!this.selectedPoint) return;
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === this.selectedPoint!.pointId);
        if (index > 0) {
            const temp = points[index];
            points[index] = points[index - 1];
            points[index - 1] = temp;
            this.routeService.reorderPoints([...points]);
        }
    }

    moveSelectedPointDown() {
        if (!this.selectedPoint) return;
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === this.selectedPoint!.pointId);
        if (index < points.length - 1) {
            const temp = points[index];
            points[index] = points[index + 1];
            points[index + 1] = temp;
            this.routeService.reorderPoints([...points]);
        }
    }

    moveFocusedPointUp() {
        if (!this.focusedPointId) return;
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === this.focusedPointId);
        if (index > 0) {
            const temp = points[index];
            points[index] = points[index - 1];
            points[index - 1] = temp;
            this.routeService.reorderPoints([...points]);
        }
    }

    moveFocusedPointDown() {
        if (!this.focusedPointId) return;
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === this.focusedPointId);
        if (index < points.length - 1) {
            const temp = points[index];
            points[index] = points[index + 1];
            points[index + 1] = temp;
            this.routeService.reorderPoints([...points]);
        }
    }

    deleteFocusedPoint() {
        if (!this.focusedPointId) return;
        const points = this.routeService.route.points;
        const index = points.findIndex(p => p.pointId === this.focusedPointId);
        if (index >= 0) {
            const point = points[index];
            this.routeService.deletePoints([point]);
            this.focusedPointId = null;
        }
    }

    pointNameChanged(newValue: string, point: RoutePoint) {
        if (point.name === newValue) {
            return;
        }
        point._pendingName = newValue;
    }

    pointDescriptionChanged(newValue: string, point: RoutePoint) {
        if (point.description === newValue) {
            return;
        }
        point._pendingDescription = newValue;
    }

    onPointFieldBlur(point: RoutePoint) {
        if (point._pendingName !== undefined) {
            if (point.name !== point._pendingName) {
                this.routeService.setPoint(point, { name: point._pendingName } as RoutePoint);
            }
            delete point._pendingName;
        }
        if (point._pendingDescription !== undefined) {
            if (point.description !== point._pendingDescription) {
                this.routeService.setPoint(point, { description: point._pendingDescription } as RoutePoint);
            }
            delete point._pendingDescription;
        }
    }

    isPointSelected(point: RoutePoint): boolean {
        return this.selectedPoint?.pointId === point.pointId;
    }

    isPointFocused(point: RoutePoint): boolean {
        return this.focusedPointId === point.pointId;
    }

    onPointFocus(point: RoutePoint) {
        this.focusedPointId = point.pointId;
    }

    selectPoint(point: RoutePoint) {
        this.selectedPoint = point;
    }

    toggleFilterPanel() {
        if (this.filterPanelCollapsed) {
            const state = this.loadPanelState();
            this.filterPanelCollapsed = false;
            this.filterColumnWidth = state.width;
        } else {
            this.filterPanelCollapsed = true;
            this.filterColumnWidth = 0;
        }
        this.savePanelState();
    }

    isMobile(): boolean {
        return window.innerWidth < 769;
    }

    trackByPointId(index: number, item: RoutePoint): number {
        return item.pointId;
    }
}