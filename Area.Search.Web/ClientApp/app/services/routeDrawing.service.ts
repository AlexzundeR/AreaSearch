import {Injectable} from "@angular/core";
import {BehaviorSubject, Subject} from "rxjs/Rx";
import {Route, RoutePoint} from "../models/route.type";
import {Observable} from "rxjs/Observable";
import {RouteService} from "./route.service";
import MarkerWithLabel from "@googlemaps/markerwithlabel";

class DrawnPoint {
    point: RoutePoint;
    marker: MarkerWithLabel;
}

@Injectable()
export class RouteDrawingService {
    private $map: Subject<google.maps.Map> = new Subject<google.maps.Map>();
    private $enabled: Subject<boolean> = new BehaviorSubject<boolean>(false);
    private previousMap: google.maps.Map;

    private drawnPoints: DrawnPoint[] = [];
    private drawnPolyline: google.maps.Polyline;
    private positionMarker: google.maps.Marker;
    private currentPositionShowEnabled: boolean = false;

    constructor(private routeService: RouteService) {
        this.$map.subscribe(map => this.mapChanged(map));
        this.$map.combineLatest(routeService.$route, this.$enabled)
            .subscribe(([m, r, e]) => {
                this.redraw(m, r, e);
            });

        setInterval(() => {
            this.drawCurrentPosition()
        }, 3000)
    }

    private mapChanged(map: google.maps.Map) {
        if (!!this.previousMap) {
            //deinit map
        }

        if (this.positionMarker) {
            this.positionMarker.setMap(map);
        } else {
            this.positionMarker = new google.maps.Marker({
                position: map.getCenter(),
                visible: false,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#0cace2',
                    strokeColor: '#14c3ff',
                    strokeWeight: 6
                },
                map: map
            });
        }

        this.previousMap = map;
    }

    private redraw(map: google.maps.Map, route: Route, enabled: boolean) {
        if (!map) {
            return;
        }

        if (this.drawnPoints.length) {
            for (const drawnPoint of this.drawnPoints) {
                drawnPoint.marker.setMap(null);
            }

            this.drawnPoints = [];
        }

        if (this.drawnPolyline) {
            this.drawnPolyline.setMap(null);
        }

        if (!enabled) {
            return;
        }

        this.drawnPoints = route.points.map(p => {
            const marker = new MarkerWithLabel({
                // clickable: true,
                position: new google.maps.LatLng(p.coordinates.lat, p.coordinates.lng),
                draggable: true,
                map: map,
                labelContent: `<span style="font-size:12px; font-weight: bolder;background-color: aliceblue; color: red;">${p.name}</span>`, // can also be HTMLElement
                labelAnchor: new google.maps.Point(-21, 3),
                labelClass: "labels", // the CSS class for the label
            });

            marker.setMap(map);

            google.maps.event.addListener(marker, "drag", () => {
                this.redrawLine();
            });

            google.maps.event.addListener(marker, "dragend", (mEvent: { latLng: google.maps.LatLng }) => {
                this.routeService.setPoint(p, {
                    coordinates: {
                        lng: mEvent.latLng.lng(),
                        lat: mEvent.latLng.lat()
                    }
                } as RoutePoint);
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
        if (!this.positionMarker || !this.currentPositionShowEnabled) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

                this.positionMarker.setPosition(point);
                this.positionMarker.setVisible(true);
            },
            error => {
                console.log(error)
            }
        );
    }

    redrawLine() {
        if (!this.drawnPolyline) {
            return;
        }

        this.drawnPolyline.setPath(this.drawnPoints.map(p => p.marker.getPosition()));
    }


    setMap(map: google.maps.Map) {
        this.$map.next(map);
    }

    setEnabled(enabled: boolean) {
        this.$enabled.next(enabled);
    }

    setCurrentPositionShowEnabled(enabled: boolean) {
        if (enabled) {
            this.currentPositionShowEnabled = true;
            this.drawCurrentPosition();
        } else {
            this.currentPositionShowEnabled = false;
            this.positionMarker.setVisible(false);
        }
    }
}