import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { MapData, MapDataPoint } from "../models/map-data.model";
import { toObservable } from "@angular/forms/src/validators";
const allGeo = require('../static/all.json');
import { } from '@types/googlemaps';


@Injectable()
export class MapService {
    geoData: MapData[] = allGeo as MapData[];

    mapDataQuery(searchString: string, typeString: string, ignoreTypeString: string, mapBounds?: { ne: google.maps.LatLng, sw: google.maps.LatLng }): Promise<MapData[]> {
        var mapData = this.geoData;
        return new Promise((res) => {
            var regexp = new RegExp(searchString, 'ig');

            if (searchString) {
                mapData = mapData.filter(e => regexp.test(e.name));
            }

            mapData = mapData.map(d => {
                var filteredData = d.data;
                if (mapBounds) {
                    filteredData = filteredData && filteredData.filter(e => e.points && e.points.some(p => p[0] < mapBounds.ne.lat() && p[1] < mapBounds.ne.lng() && p[0] > mapBounds.sw.lat() && p[1] > mapBounds.sw.lng()));
                }
                if (typeString) {
                    var typeStringParts = typeString.split(' ');
                    filteredData = filteredData && filteredData.filter(e => typeStringParts.every(p => p === e.type || p === e.bigType));
                }
                if (ignoreTypeString) {
                    var ignoreTypeStringParts = ignoreTypeString.split(' ');
                    filteredData = filteredData && filteredData.filter(e => !ignoreTypeStringParts.some(p => p === e.type || p === e.bigType));
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
}