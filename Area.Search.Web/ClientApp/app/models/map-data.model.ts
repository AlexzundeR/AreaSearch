export class MapData {
    id?: string;
    name!: string;
    oldNames!: string;
    data?: MapDataPoint[];
    dataTypesTitle?: string;
}

export class MapDataPoint {
    type!: string;
    bigType!: string;
    points?: number[][];
}
