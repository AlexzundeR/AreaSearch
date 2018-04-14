export class MapData {
    id?: string;
    name: string;
    oldNames: string;
    data?: MapDataPoint[];
}

export class MapDataPoint {
    type: string;
    bigType: string;
    points?: number[][];
}