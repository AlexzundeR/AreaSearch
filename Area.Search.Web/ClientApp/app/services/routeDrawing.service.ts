import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject, combineLatest, Observable } from "rxjs";
import { Route, RoutePoint } from "../models/route.type";
import { RouteService } from "./route.service";

class DrawnPoint {
    point!: RoutePoint;
    marker!: google.maps.marker.AdvancedMarkerElement;
}

@Injectable({
    providedIn: 'root'
})
export class RouteDrawingService {
    private $map: Subject<google.maps.Map> = new Subject<google.maps.Map>();
    private $enabled: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private previousMap!: google.maps.Map;

    private drawnPoints: DrawnPoint[] = [];
    private drawnPolyline!: google.maps.Polyline;
    private positionMarker!: google.maps.marker.AdvancedMarkerElement;
    private currentPositionShowEnabled: boolean = false;

    private markerLibraryPromise: Promise<google.maps.MarkerLibrary> | null = null;

    private async ensureMarkerLibrary(): Promise<google.maps.MarkerLibrary> {
        if (!this.markerLibraryPromise) {
            this.markerLibraryPromise = google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>;
        }
        return this.markerLibraryPromise;
    }

    private async ensurePinElement(): Promise<typeof google.maps.marker.PinElement> {
        const lib = await this.ensureMarkerLibrary();
        return lib.PinElement;
    }

    constructor(private routeService: RouteService) {
        this.$map.subscribe(map => this.mapChanged(map));
        
        combineLatest([this.$map, routeService.$route, this.$enabled]).subscribe(([m, r, e]) => {
            this.redraw(m, r, e);
            if (this.currentPositionShowEnabled) {
                this.drawCurrentPosition();
            }
        });

        setInterval(() => {
            if (this.currentPositionShowEnabled) {
                this.drawCurrentPosition();
            }
        }, 3000)
    }

    private async mapChanged(map: google.maps.Map) {
        if (!!this.previousMap) {
        }

        if (!this.currentPositionShowEnabled) {
            this.previousMap = map;
            return;
        }

        await this.ensureMarkerLibrary();
        const PinElement = await this.ensurePinElement();

        const pinOptions: any = {
            background: '#0cace2',
            glyphColor: '#14c3ff',
            scale: 1,
        };

        const pinElement = new PinElement(pinOptions);
        
        this.positionMarker = new google.maps.marker.AdvancedMarkerElement({
            position: map.getCenter(),
            content: pinElement,
            map: map
        });

        this.positionMarker.addListener('gmp-click', () => {});

        this.previousMap = map;
    }

    private async redraw(map: google.maps.Map, route: Route, enabled: boolean) {
        if (!map) {
            return;
        }

        if (this.drawnPoints.length) {
            for (const drawnPoint of this.drawnPoints) {
                if ('setMap' in drawnPoint.marker) {
                    (drawnPoint.marker as any).setMap(null);
                } else {
                    drawnPoint.marker.map = null;
                }
            }

            this.drawnPoints = [];
        }

        if (this.drawnPolyline) {
            this.drawnPolyline.setMap(null);
        }

        if (!enabled) {
            return;
        }

        await this.ensureMarkerLibrary();
        const PinElement = await this.ensurePinElement();

        this.drawnPoints = route.points.map(p => {
            const container = document.createElement('div');
            container.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center;';

            const labelDiv = document.createElement('div');
            labelDiv.textContent = p.name;
            labelDiv.style.cssText = 'font-size: 12px; font-weight: bold; background-color: white; color: #333; padding: 2px 6px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 4px; z-index: 1;';

            const pinOptions: any = {
                background: '#DC143C',
                glyphColor: 'white',
                scale: 1,
                glyphText: p.name.substring(0, 1).toUpperCase(),
            };
            const pinElement = new PinElement(pinOptions);

            container.appendChild(labelDiv);
            container.appendChild(pinElement);

            const position = new google.maps.LatLng(p.coordinates.lat, p.coordinates.lng);
            
            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: position,
                map: map,
                content: container,
                title: p.name,
                gmpDraggable: true,
            });

            marker.addListener('gmp-click', () => {});
            marker.addListener('drag', () => {
                this.redrawLine();
            });

            marker.addListener('dragend', (mEvent: google.maps.MapMouseEvent) => {
                if (mEvent.latLng) {
                    this.routeService.setPoint(p, {
                        coordinates: {
                            lng: mEvent.latLng.lng(),
                            lat: mEvent.latLng.lat()
                        }
                    } as RoutePoint);
                }
            });

            return {
                point: p,
                marker: marker
            }
        });

        this.drawnPolyline = new google.maps.Polyline({
            map: map,
            strokeColor: 'black',
            strokeOpacity: 0.8,
            strokeWeight: 2,
        })

        this.redrawLine();
    }

    drawCurrentPosition() {
        if (!this.currentPositionShowEnabled) {
            return;
        }

        if (!this.positionMarker) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position: GeolocationPosition) => {
                const point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                this.positionMarker.position = point;
                if (this.positionMarker.content) {
                    (this.positionMarker.content as HTMLElement).style.display = 'block';
                }
            },
            (error: GeolocationPositionError) => {
                console.log(error);
            }
        );
    }

    redrawLine() {
        if (!this.drawnPolyline) {
            return;
        }

        const positions = this.drawnPoints.map(p => p.marker.position).filter((p): p is google.maps.LatLng => p !== null && p !== undefined);
        this.drawnPolyline.setPath(positions);
    }


    setMap(map: google.maps.Map) {
        this.$map.next(map);
    }

    setEnabled(enabled: boolean) {
        this.$enabled.next(enabled);
    }

    setCurrentPositionShowEnabled(enabled: boolean) {
        this.currentPositionShowEnabled = enabled;
        
        if (enabled && !this.positionMarker && this.previousMap) {
            this.createPositionMarker(this.previousMap);
        }
        
        if (this.positionMarker) {
            if (this.positionMarker.content) {
                (this.positionMarker.content as HTMLElement).style.display = enabled ? 'block' : 'none';
            }
        }
        if (enabled) {
            this.drawCurrentPosition();
        }
    }

    private async createPositionMarker(map: google.maps.Map): Promise<void> {
        await this.ensureMarkerLibrary();
        const PinElement = await this.ensurePinElement();

        const pinOptions: any = {
            background: '#0cace2',
            glyphColor: '#14c3ff',
            scale: 1,
        };

        const pinElement = new PinElement(pinOptions);
        
        this.positionMarker = new google.maps.marker.AdvancedMarkerElement({
            position: map.getCenter(),
            content: pinElement,
            map: map
        });

        this.positionMarker.addListener('gmp-click', () => {});
    }
}
