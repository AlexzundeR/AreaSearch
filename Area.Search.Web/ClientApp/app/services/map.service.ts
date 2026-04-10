import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject } from "rxjs";
import { MapData, MapDataPoint } from "../models/map-data.model";

@Injectable({
    providedIn: 'root'
})
export class MapService {

    constructor(private http: HttpClient) {
        this.loadData();
    }

    private loadData() {
        this.http.get<MapData[]>('/dist/data/all-2026.json').subscribe(data => {
            this.geoData = data;
            this.dataLoadedSubj.next(true);
        });

        this.http.get<string[]>('/dist/data/all-types-2026.json').subscribe(types => {
            this.allTypes = types;
            this.allTypesSubj.next(types);
        });
    }

    private dataLoadedSubj: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    get dataLoaded$(): Observable<boolean> {
        return this.dataLoadedSubj.asObservable();
    }
    get dataLoaded(): boolean {
        return this.dataLoadedSubj.value;
    }

    geoData: MapData[] = [];

    private allTypesSubj: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    get allTypesObs(): Observable<string[]> {
        return this.allTypesSubj.asObservable();
    }
    allTypes: string[] = [];

    mapDataQuery(searchString: string, selectedTypes: string[], ignoredTypes: string[], mapBounds?: { ne: google.maps.LatLng, sw: google.maps.LatLng } | null, shapeContainsCallback?: ((p: number[]) => boolean) | null): Promise<MapData[]> {
        var mapData = this.geoData;
        return new Promise((res) => {
            var regexp = new RegExp(searchString, 'ig');

            if (searchString) {
                mapData = mapData.filter(e => regexp.test(e.name));
            }

            mapData = mapData.map(d => {
                var filteredData = d.data;
                if (!filteredData || !filteredData.length) {
                    return null;
                }
                if (mapBounds) {
                    var filterImpl = (p:number[])=> p[0] < mapBounds.ne.lat() && p[1] < mapBounds.ne.lng() && p[0] > mapBounds.sw.lat() && p[1] > mapBounds.sw.lng(); 
                    filteredData = filteredData.filter(e => e.points && e.points.some(filterImpl));
                    filteredData = this.mapDataPointsWithFilter(filteredData, filterImpl);
                }

                if (shapeContainsCallback) {
                    filteredData = filteredData.filter(e => e.points && e.points.some(shapeContainsCallback));
                    filteredData = this.mapDataPointsWithFilter(filteredData, shapeContainsCallback);
                }

                if (!filteredData.length) {
                    return null;
                }
                var hasType = true;
                if (selectedTypes && selectedTypes.length) {
                    hasType = filteredData.some(e => selectedTypes.some(p => p === e.type));
                }

                if (!hasType) {
                    return null;
                }

                if (ignoredTypes && ignoredTypes.length) {
                    filteredData = filteredData && filteredData.filter(e => !ignoredTypes.some(p => p === e.type));
                }
                if (filteredData && filteredData.length) {
                    return {
                        name: d.name,
                        id: d.id,
                        data: filteredData,
                        oldNames: d.oldNames
                    } as MapData;
                }
                return null;
            }).filter(d => d != null) as MapData[];

            res(mapData);
        });
    }

    getAllTypes() {
        return this.allTypes;
    }

    mapDataPointsWithFilter(filteredData: MapDataPoint[], filter: (p: number[]) => boolean) {
        return filteredData.map(e => {
            return {
                type: e.type,
                bigType: e.bigType,
                points: e.points ? e.points.filter(filter) : null
            } as MapDataPoint
        })
    }
}