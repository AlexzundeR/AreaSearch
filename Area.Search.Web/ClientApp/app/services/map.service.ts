﻿import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import 'rxjs/Rx';
import { MapData, MapDataPoint } from "../models/map-data.model";
import { toObservable } from "@angular/forms/src/validators";
//const allGeo1 = require('../static/all-2019-1.json');
//const allGeo2 = require('../static/all-2019-2.json');
//const allGeo3 = require('../static/all-2019-3.json');
//const allGeo4 = require('../static/all-2019-4.json');
//const allGeo5 = require('../static/all-2019-5.json');
const allGeo = require('../static/all-2021.json');
const allTypes = require('../static/all-types-2021.json');
import { } from '@types/googlemaps';
import { Http } from "@angular/http";
import { BehaviorSubject } from "rxjs/Rx";


@Injectable()
export class MapService {



    constructor(http: Http) {
        http.get(allGeo as string)
            .map(res => {
                return res.json() as MapData[];
            }).toPromise().then(e => {
                this.dataLoaded = true;
                this.geoData = e;
            });

        http.get(allTypes as string)
            .map(res => {
                return res.json() as string[];
            }).subscribe(resp => {
                this.allTypesSubj.next(resp);
            });
    }

    dataLoaded: boolean = false;

    geoData: MapData[] = [
        //...allGeo1 as MapData[],
        //...allGeo2 as MapData[],
        //...allGeo3 as MapData[],
        //...allGeo4 as MapData[],
        //...allGeo5 as MapData[]
    ];

    private allTypesSubj: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
    get allTypesObs(): Observable<string[]> {
        return this.allTypesSubj.asObservable();
    }
    allTypes: string[] = allTypes as string[];

    mapDataQuery(searchString: string, selectedTypes: string[], ignoredTypes: string[], mapBounds?: { ne: google.maps.LatLng, sw: google.maps.LatLng }): Promise<MapData[]> {
        var mapData = this.geoData;
        return new Promise((res) => {
            var regexp = new RegExp(searchString, 'ig');

            if (searchString) {
                mapData = mapData.filter(e => regexp.test(e.name));
            }

            mapData = mapData.map(d => {
                var filteredData = d.data;
                if (!filteredData || !filteredData.length){
                    return null;
                }
                if (mapBounds) {
                    filteredData = filteredData.filter(e => e.points && e.points.some(p => p[0] < mapBounds.ne.lat() && p[1] < mapBounds.ne.lng() && p[0] > mapBounds.sw.lat() && p[1] > mapBounds.sw.lng()));
                }
                if (!filteredData.length){
                    return null;
                }
                var hasType = true;
                if (selectedTypes && selectedTypes.length) {
                    hasType = filteredData.some(e => selectedTypes.some(p => p === e.type));
                }

                if (!hasType){
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
}