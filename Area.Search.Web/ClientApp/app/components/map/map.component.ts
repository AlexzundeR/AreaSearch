import { Component, Input, OnChanges, SimpleChanges, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { MapData, MapDataPoint } from '../../models/map-data.model';
import { MapService } from '../../services/map.service';
import { StateService } from '../../services/state.service';
import { MapMarker } from '../../models/map-marker.type';
import { RouteService, ServiceError } from "../../services/route.service";
import { Route, RoutePoint } from "../../models/route.type";
import { RouteDrawingService } from "../../services/routeDrawing.service";
import { MessageService } from 'primeng/api';
import { Observable, map, tap } from "rxjs";
import { TerraDraw } from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';

@Component({
    selector: 'map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.css'],
    standalone: false
})
export class MapComponent implements OnChanges, AfterViewInit {

    mapData: MapData[] = [];
    mapDataSource: MapData[] = [];
    totalResultsCount: number = 0;
    readonly MAX_DISPLAY_ITEMS = 1000;
    allTypes: string[] = [];
    allTypesOrig: string[] = [];
    @Input() searchString: string = "";
    selectedTypes: string[] = [];
    ignoredTypes: string[] = [];
    mapMarkers: MapMarker[] = [];
    
    referenceMarker: MapMarker | null = null;
    showReferencePoint: boolean = true;
    referencePointLat: number = 55.7558;
    referencePointLng: number = 37.6173;
    sortBy: 'name' | 'distance' = 'name';
    sortDirection: 'asc' | 'desc' = 'asc';
    searchShowDropdown: boolean = false;
searchPatterns: { label: string; desc: string }[] = [
        { label: '.*улица.*', desc: 'Улица' },
        { label: '.*переулок.*', desc: 'Переулок' },
        { label: '.*проспект.*', desc: 'Проспект' },
        { label: '^\\d.*', desc: 'Начинается с цифры' },
        { label: '.*\\d.*', desc: 'Содержит цифру' },
        { label: '^(ул|пер|прос|пл)', desc: 'Начинается с ул/пер/прос/пл' },
        { label: '^(Ул|Per|прос|пл)', desc: 'Начинается с заглавной' },
        { label: '^(?!.*,\\s*\\d+$)', desc: 'Не адрес' },
        { label: '^(?!.*,\\s*\\d+$).*улица.*', desc: 'Улица и не адрес' },
    ];
    referenceMarkerElement: google.maps.marker.AdvancedMarkerElement | null = null;

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
    initialPolygonPoints: number[][] = [];
    terradrawPolygonCoords: number[][] | null = null;
    private terraDraw: TerraDraw | null = null;
    public get hasTerraDraw(): boolean { return this.terraDraw !== null; }
    private drawnPolygonId: string | null = null;
    currentDrawMode: string = 'static';
    private searchTimeout: any = null;
    private isDrawingComplete: boolean = false;
    private stateSaveTimeout: any = null;
    private cachedPolygon: google.maps.Polygon | null = null;

    private updateCachedPolygon() {
        if (!this.terradrawPolygonCoords || this.terradrawPolygonCoords.length < 3) {
            this.cachedPolygon = null;
            return;
        }
        const polygonPath = this.terradrawPolygonCoords.map(c => new google.maps.LatLng(c[0], c[1]));
        this.cachedPolygon = new google.maps.Polygon({ paths: polygonPath });
    }

    private debouncedUpdateState() {
        if (this.stateSaveTimeout) clearTimeout(this.stateSaveTimeout);
        this.stateSaveTimeout = setTimeout(() => {
            this.updateState();
        }, 500);
    }

    private renderPolygonToTerraDraw(coords: number[][]) {
        if (!this.terraDraw || !coords || coords.length < 3) return;

        // coords are in [lat, lng] format, convert to [lng, lat] for TerraDraw
        const coordsLngLat = coords.map(c => [c[1], c[0]]);
        
        // Need to add mode property for TerraDraw to accept the feature
        const polygonGeoJSON = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coordsLngLat]
            },
            properties: {
                mode: 'polygon'
            }
        };

        // Switch to polygon mode before adding
        this.terraDraw.setMode('polygon');
        
        this.terraDraw.addFeatures([polygonGeoJSON as any]);
        
        // Switch back to static mode
        this.terraDraw.setMode('static');
        
        this.terradrawPolygonCoords = coords;
        this.hasDrawnPolygon = true;
        this.updateCachedPolygon();
    }

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
            this.allTypesOrig = types.sort();
        });
        
        this.mapService.dataLoaded$.subscribe((loaded) => {
            if (loaded) {
                const hasSearchCriteria = this.searchString || 
                    (this.selectedTypes && this.selectedTypes.length > 0) || 
                    (this.ignoredTypes && this.ignoredTypes.length > 0) ||
                    this.useMapPolygon;
                
                if (hasSearchCriteria) {
                    this.onSearchClick();
                }
            }
        });
        this.routeDataSource = this.routeService.$routePoints.pipe(map(p => p));

        this.routeService.$saving.pipe(
            tap(saving => {
                this.cdr.markForCheck();
                this.saving = saving;
            })
        ).subscribe();

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
            this.filterColumnWidth = panelState.collapsed ? 0 : (panelState.width > 0 ? panelState.width : 500);
        } else {
            this.filterPanelCollapsed = true;
            this.filterColumnWidth = 0;
        }
        
        var state = this.stateService.loadState();
        if (state) {
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
            if (state.showReferencePoint != null) {
                this.showReferencePoint = state.showReferencePoint;
            }
            if (state.referencePointLat != null) {
                this.referencePointLat = state.referencePointLat;
            }
            if (state.referencePointLng != null) {
                this.referencePointLng = state.referencePointLng;
            }
            if (state.sortBy) {
                this.sortBy = state.sortBy;
            }
            if (state.sortDirection) {
                this.sortDirection = state.sortDirection;
            }
        }
        this.redrawRoute();
        this.updateDataSource();
        this.applyFilters();
        
        if (this.showReferencePoint) {
            setTimeout(() => this.ensureReferenceMarker(), 500);
        }
    }

    onSearchStringChanged(e: any) {
        this.searchShowDropdown = false;
    }

    onSearchInputFocus() {
        this.searchShowDropdown = true;
    }

    onSearchInputBlur() {
        setTimeout(() =>{
            this.searchShowDropdown = false;
            this.cdr.detectChanges();
        }, 200);
    }

    selectSearchPattern(pattern: { label: string; desc: string }) {
        this.searchString = pattern.label;
        this.searchShowDropdown = false;
    }

    hideSearchDropdown() {
        this.searchShowDropdown = false;
    }

    private applyFilters(data?: MapData[]) {
        const sourceData = data || this.mapDataSource;
        if (!sourceData.length) return;
        
        let filteredData = sourceData.filter(item => {
            if (this.searchString) {
                try {
                    const regex = new RegExp(this.searchString, 'i');
                    if (!regex.test(item.name || '')) {
                        return false;
                    }
                } catch {}
            }
            return true;
        });
        
        const dir = this.sortDirection === 'asc' ? 1 : -1;
        
        if (this.sortBy === 'name') {
            filteredData.sort((a, b) => dir * (a.name || '').localeCompare(b.name || ''));
        } else if (this.sortBy === 'distance') {
            const refPos = [this.referencePointLat || this.defaultCenter.lat, this.referencePointLng || this.defaultCenter.lng];
            filteredData.sort((a, b) => {
                const distA = this.getMinDistance(a, refPos);
                const distB = this.getMinDistance(b, refPos);
                return dir * (distA - distB);
            });
        }
        
        this.mapData = filteredData;
        this.totalResultsCount = filteredData.length;
        this.cdr.detectChanges();
    }

    onSortByChanged(sortBy: 'name' | 'distance') {
        if (this.sortBy === sortBy) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = sortBy;
            this.sortDirection = 'asc';
        }
        if (sortBy === 'distance') {
            this.ensureReferenceMarker();
        }
        this.applyFilters();
        this.debouncedUpdateState();
    }

    private async ensureReferenceMarker() {
        if (this.referenceMarkerElement) return;
        
        if (!this.map) {
            await new Promise<void>(resolve => {
                const checkMap = setInterval(() => {
                    if (this.map) {
                        clearInterval(checkMap);
                        resolve();
                    }
                }, 100);
                setTimeout(() => clearInterval(checkMap), 5000);
            });
            if (!this.map) return;
        }
        
        const { PinElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
        const pinElement = new PinElement({
            background: '#0000FF',
            glyphColor: 'white',
            scale: 1,
        });
        
        this.referenceMarkerElement = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: this.referencePointLat, lng: this.referencePointLng },
            map: this.map,
            content: pinElement,
            gmpDraggable: true,
            title: 'Точка отсчёта',
        });
        
        this.referenceMarker = new MapMarker([this.referencePointLat, this.referencePointLng], { text: 'Точка отсчёта', isReference: true, draggable: true, color: '#0000FF' });
        
        this.referenceMarkerElement.addListener('dragend', (event: any) => {
            const pos = event.latLng;
            this.referencePointLat = pos.lat();
            this.referencePointLng = pos.lng();
            this.referenceMarkerElement!.position = pos as any;
            this.referenceMarker = new MapMarker([pos.lat(), pos.lng()], { text: 'Точка отсчёта', isReference: true, draggable: true, color: '#0000FF' });
            this.applyFilters();
            this.debouncedUpdateState();
        });
        
        this.applyFilters();
    }

    onShowReferencePointChanged() {
        if (this.showReferencePoint) {
            this.ensureReferenceMarker();
        } else if (this.referenceMarkerElement) {
            this.referenceMarkerElement.map = null;
            this.referenceMarkerElement = null;
        }
        this.cdr.detectChanges();
        this.debouncedUpdateState();
    }

    getDistanceToReference(item: MapData): string {
        const lat = this.referencePointLat || this.defaultCenter.lat;
        const lng = this.referencePointLng || this.defaultCenter.lng;
        const refPos = [lat, lng];
        const dist = this.getMinDistance(item, refPos);
        if (dist === Infinity) return '';
        return dist < 1 ? `${Math.round(dist * 1000)} м` : `${dist.toFixed(1)} км`;
    }

    private getMinDistance(mapData: MapData, refPos: number[]): number {
        if (!mapData.data) return Infinity;
        let minDist = Infinity;
        mapData.data.forEach(d => {
            d.points?.forEach(p => {
                const dist = this.calculateDistance(refPos[0], refPos[1], p[0], p[1]);
                if (dist < minDist) minDist = dist;
            });
        });
        return minDist;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * Math.PI / 180;
    }

    typeSelectionChanged() {
        this.debouncedUpdateState();
    }

    ignoredTypeSelectionChanged() {
        this.debouncedUpdateState();
    }

    copyNames() {
        const itemsToCopy = this.selectedMapData && this.selectedMapData.length > 0 
            ? this.selectedMapData 
            : this.mapData;
        
        const names = itemsToCopy
            .map(item => item.name)
            .filter(name => name)
            .join('\n');
        
        navigator.clipboard.writeText(names).then(() => {
            this.messageService.add({
                severity: 'success',
                summary: 'Скопировано',
                detail: `Скопировано ${itemsToCopy.length} названий`,
                life: 2000
            });
        });
    }

    onBadgeDoubleClick(type: string) {
        this.ignoredTypes = this.ignoredTypes ? this.ignoredTypes : [];
        if (!this.ignoredTypes.includes(type)) {
            this.ignoredTypes = [...this.ignoredTypes, type];
            this.ignoredTypeSelectionChanged();
        }
    }

    onUseMapBoundsChanged() {
        this.onSearchClick();
        this.debouncedUpdateState();
    }

    onUseMapPolygonChanged() {
        this.refreshDrawingTools();
        this.redrawPolygon();
        this.onSearchClick();
        this.debouncedUpdateState();
    }

    refreshDrawingTools() {
        if (!this.map || !this.terraDraw) return;

        // TerraDraw инструменты рисования всегда активны
        this.terraDraw.setMode(this.currentDrawMode);
    }

    setDrawMode(mode: string) {
        const wasDrawing = this.currentDrawMode === 'polygon';
        const snapshot = this.terraDraw?.getSnapshot() || [];
        const hasPolygon = snapshot.some((f: any) => f.geometry.type === 'Polygon');
        
        this.currentDrawMode = mode;
        if (this.terraDraw) {
            this.terraDraw.setMode(mode);
            
            // При переходе с рисования на выбор после создания полигона - триггерим поиск
            if (wasDrawing && mode === 'select' && hasPolygon) {
                this.refreshSearch();
            }
        }
    }

    deleteSelectedPolygon() {
        if (!this.terraDraw) return;
        
        const snapshot = this.terraDraw.getSnapshot();
        const polygonFeature = snapshot.find((f: any) => f.geometry.type === 'Polygon');
        
        if (polygonFeature && polygonFeature.id) {
            this.terraDraw.removeFeatures([polygonFeature.id]);
            this.terradrawPolygonCoords = null;
            this.hasDrawnPolygon = false;
            this.updateCachedPolygon();
            this.onSearchClick();
            this.debouncedUpdateState();
        }
    }

    // Track polygon state for canDraw
    private hasDrawnPolygon: boolean = false;

    get canDraw(): boolean {
        if (!this.terraDraw) return false;
        const snapshot = this.terraDraw.getSnapshot();
        const hasPolygon = snapshot.some((f: any) => f.geometry.type === 'Polygon');
        return !hasPolygon;
    }

    clearDrawing() {
        if (this.terraDraw) {
            const snapshot = this.terraDraw.getSnapshot();
            const polygonIds = snapshot
                .filter((f: any) => f.geometry.type === 'Polygon')
                .map((f: any) => f.id);
            
            if (polygonIds.length > 0) {
                this.terraDraw.removeFeatures(polygonIds);
            }
            this.terradrawPolygonCoords = null;
            this.hasDrawnPolygon = false;
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

        // Initialize TerraDraw after a delay to ensure map is fully rendered
        setTimeout(() => {
            this.initTerraDraw();
            
            const hasSearchCriteria = this.searchString || 
                (this.selectedTypes && this.selectedTypes.length > 0) || 
                (this.ignoredTypes && this.ignoredTypes.length > 0) ||
                this.useMapPolygon;
            
            if (this.initialPolygonPoints && this.initialPolygonPoints.length) {
                setTimeout(() => {
                    this.renderPolygonToTerraDraw(this.initialPolygonPoints);
                    this.onSearchClick();
                }, 300);
            } else if (hasSearchCriteria) {
                this.onSearchClick();
            }

            this.refreshDrawingTools();
        }, 500);
    }

    private initTerraDraw(): boolean {
        if (!this.map) {
            return false;
        }

        // Prevent re-initialization
        if (this.terraDraw) {
            return true;
        }

        // Try to get the map element from the element ref or document
        let mapElement: HTMLElement | null = null;
        
        // First try getDiv() - works in most cases
        const mapDiv = this.map.getDiv();
        if (mapDiv instanceof HTMLElement) {
            mapElement = mapDiv;
        }
        
        // Fallback: try to find by ID or query
        if (!mapElement) {
            const mapContainer = document.querySelector('.angular-google-map-container') as HTMLElement;
            if (mapContainer) {
                mapElement = mapContainer;
            }
        }
        
        // Fallback: try to find the map div inside the component
        if (!mapElement) {
            const mapDivById = document.getElementById('terradraw-map');
            if (mapDivById instanceof HTMLElement) {
                mapElement = mapDivById;
            }
        }
        
        if (!mapElement) {
            setTimeout(() => this.initTerraDraw(), 200);
            return false;
        }

        try {
            this.terraDraw = new TerraDraw({
                adapter: new TerraDrawGoogleMapsAdapter({
                    map: this.map,
                    lib: google.maps
                }),
                modes: [
                    new TerraDrawSelectMode({
                        flags: {
                            polygon: {
                                feature: {
                                    draggable: true,
                                    rotateable: true,
                                    coordinates: {
                                        midpoints: true,
                                        draggable: true,
                                        deletable: true,
                                    },
                                },
                            },
                        },
                    }),
                    new TerraDrawPolygonMode({
                        styles: {
                            fillColor: '#0000FF',
                            outlineColor: '#0000FF',
                            fillOpacity: 0.35,
                            outlineOpacity: 0.8,
                            outlineWidth: 3
                        }
                    })
                ]
            });

            this.terraDraw.start();

            // Set initial mode after start
            this.terraDraw.setMode(this.currentDrawMode);

            // Listen for polygon changes - при редактировании с debounce
            this.terraDraw.on('change', (ids: any, type: string) => {
                const snapshot = this.terraDraw!.getSnapshot();
                const polygonFeature = snapshot.find((f: any) => f.geometry.type === 'Polygon');
                
                if (!polygonFeature) {
                    this.terradrawPolygonCoords = null;
                    this.hasDrawnPolygon = false;
                    this.isDrawingComplete = false;
                    this.updateCachedPolygon();
                    this.triggerSearch();
                    this.debouncedUpdateState();
                    return;
                }
                
                this.hasDrawnPolygon = true;
                this.drawnPolygonId = polygonFeature.id;
                
                // TerraDraw returns [lng, lat], convert to [lat, lng] for consistency
                const newCoords = polygonFeature.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]]);
                this.terradrawPolygonCoords = newCoords;
                this.updateCachedPolygon();
                
                // При редактировании - debounced search и сохранение
                if (type === 'update') {
                    this.triggerSearch();
                    this.debouncedUpdateState();
                }
            });
            
            // При завершении рисования (пользователь закончил рисовать полигон)
            this.terraDraw.on('finish', () => {
                if (this.currentDrawMode === 'polygon') {
                    this.setDrawMode('select');
                    this.refreshSearch();
                    this.debouncedUpdateState();
                }
            });
            
            console.log('TerraDraw initialized successfully');
            return true;
        } catch (e) {
            console.error('Failed to initialize TerraDraw:', e);
            return false;
        }
    }

    private triggerSearch() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.onSearchClick();
        }, 500);
    }

    refreshSearch() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.onSearchClick();
    }

    onMapReady(event: any) {
    }

    onMarkerClick(marker: MapMarker) {
        marker.toggleInfoWindow();
    }

    onMarkerInitialized(marker: MapMarker, event: any) {
        marker.originalMarker = event;
        event.addListener('mapClick', () => {
            this.onMarkerClick(marker);
        });
    }

    onGoogleMapClick(event: any) {
        if (this.showReferencePoint) {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            this.referencePointLat = lat;
            this.referencePointLng = lng;
            
            if (this.referenceMarkerElement) {
                this.referenceMarkerElement.position = { lat, lng } as any;
            } else {
                this.ensureReferenceMarker();
            }
            
            this.referenceMarker = new MapMarker([lat, lng], { text: 'Точка отсчёта', isReference: true, draggable: true, color: '#0000FF' });
            this.applyFilters();
            this.debouncedUpdateState();
        }
    }

    redrawPolygon(points?: google.maps.LatLng[]) {
    }

    mapChanged() {
        this.mapCenter = (this.map as google.maps.Map).getCenter();
        this.mapZoom = (this.map as google.maps.Map).getZoom();
        this.debouncedUpdateState();
        if (this.useMapBounds && !this.useMapPolygon) {
            this.onSearchClick();
        }
    }

    selectedMapDataChanged(e: any) {
        this.debouncedUpdateState();
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
        // Use cached polygon for performance
        if (!this.cachedPolygon) {
            return true;
        }
        return google.maps.geometry.poly.containsLocation(new google.maps.LatLng(p[0], p[1]), this.cachedPolygon);
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
            if (this.terradrawPolygonCoords && this.terradrawPolygonCoords.length > 0) {
                let bounds = new google.maps.LatLngBounds();
                // terradrawPolygonCoords is already in [lat, lng] format
                this.terradrawPolygonCoords.forEach((coord: number[]) => {
                    bounds.extend(new google.maps.LatLng(coord[0], coord[1]));
                });
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                mapBounds = { ne: ne, sw: sw };
            }
        }

        this.mapService.mapDataQuery(this.searchString, this.selectedTypes, this.ignoredTypes, mapBounds, filterigCallback)
            .then((data) => {
                this.totalResultsCount = data.length;
                this.mapData = data.length > this.MAX_DISPLAY_ITEMS 
                    ? data.slice(0, this.MAX_DISPLAY_ITEMS) 
                    : data;
                
                if (this.mapData) {
                    this.mapData.forEach(item => {
                        if (item.data) {
                            item.dataTypesTitle = item.data.map((d: any) => d.type).join(', ');
                        }
                    });
                }
                
                this.updateDataSource();
                this.applyFilters();
                this.listIndicateLoading(false);

                if (this.mapData) {
                    var newTypes = new Set<string>();
                    this.mapData.forEach(e => {
                        if (e.data) {
                            e.data.forEach(d => {
                                newTypes.add(d.type);
                            });
                        }
                    });
                    const oldSelectedTypes = [...(this.selectedTypes || [])];
                    const oldIgnoredTypes = [...(this.ignoredTypes || [])];
                    this.allTypes = Array.from(newTypes).sort();
                    this.selectedTypes = oldSelectedTypes.filter(t => this.allTypes.includes(t));
                    this.ignoredTypes = oldIgnoredTypes ? oldIgnoredTypes.filter(t => this.allTypesOrig.includes(t)) : [];
                }
                
                this.cdr.detectChanges();
            });
    }

    updateDataSource() {
        this.mapDataSource = this.mapData;
    }

    updateState() {
        // Get polygon coordinates from TerraDraw if available
        // Only save if polygon was already loaded (not during initial load)
        let polygonCoords: number[][] | null = null;
        if (this.terraDraw && this.terradrawPolygonCoords) {
            const snapshot = this.terraDraw.getSnapshot();
            const polygonFeature = snapshot.find((f: any) => f.geometry.type === 'Polygon');
            if (polygonFeature) {
                // Convert from [lng, lat] to [lat, lng] for storage
                polygonCoords = polygonFeature.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]]);
            }
        }

        this.stateService.saveState({
            center: this.mapCenter,
            zoom: this.mapZoom,
            searchString: this.searchString,
            typeString: JSON.stringify(this.selectedTypes),
            ignoreTypeString: JSON.stringify(this.ignoredTypes),
            useBoundaries: this.useMapBounds,
            selectedMapData: this.selectedMapData,
            usePolygon: this.useMapPolygon,
            polygon: polygonCoords,
            showReferencePoint: this.showReferencePoint,
            referencePointLat: this.referencePointLat,
            referencePointLng: this.referencePointLng,
            sortBy: this.sortBy,
            sortDirection: this.sortDirection
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

    onInputEvent(event: Event, point: RoutePoint) {
        const target = event.target as HTMLInputElement;
        point._pendingName = target.value;
    }

    onInputFocus(event: FocusEvent) {
        (event.target as HTMLInputElement).select();
    }

    onDescriptionFocus(event: FocusEvent) {
        (event.target as HTMLTextAreaElement).select();
    }

    onInputKeydown(event: KeyboardEvent) {
        event.stopPropagation();
    }

    onDescriptionInputEvent(event: Event, point: RoutePoint) {
        const target = event.target as HTMLTextAreaElement;
        point._pendingDescription = target.value;
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
            if (this.isMobile()) {
                this.filterPanelCollapsed = false;
                this.filterColumnWidth = 500;
            } else {
                const state = this.loadPanelState();
                this.filterPanelCollapsed = false;
                this.filterColumnWidth = state.width > 0 ? state.width : 500;
            }
            this.onSearchClick();
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

    hasRoutePoints(): boolean {
        return this.routeService.route.points && this.routeService.route.points.length > 0;
    }

    openInYandexMaps() {
        const points = this.routeService.route.points;
        if (!points || points.length === 0) return;

        const validPoints = points.filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng);
        if (validPoints.length === 0) return;

        const coords = validPoints.map(p => `${p.coordinates.lat},${p.coordinates.lng}`).join('~');
        
        if (this.isMobile()) {
            const url = `yandexmaps://maps.yandex.com/?rtext=${coords}&rtt=mt`;
            window.location.href = url;
        } else {
            const url = `https://yandex.ru/maps/213/moscow/?mode=routes&rtext=${coords}&rtt=mt`;
            window.open(url, '_blank');
        }
    }

    openIn2GIS() {
        const points = this.routeService.route.points;
        if (!points || points.length === 0) return;

        const validPoints = points.filter(p => p.coordinates && p.coordinates.lat && p.coordinates.lng);
        if (validPoints.length < 2) return;

        const from = `${validPoints[0].coordinates.lat},${validPoints[0].coordinates.lng}`;
        const to = validPoints.slice(1)
            .map(p => `${p.coordinates.lat},${p.coordinates.lng}`)
            .join(';');

        const url = `https://2gis.ru/route/from/${from}/to/${to}`;
        
        if (this.isMobile()) {
            window.location.href = url;
        } else {
            window.open(url, '_blank');
        }
    }
}