export interface Route {
    routeId: number;
    name: string;
    lastModificationDate: Date;
    points: RoutePoint[];
}

export interface RoutePoint {
    pointId: number;
    routeId: number;
    name: string;
    description: string;
    coordinates: Coordinates;
}

export interface Coordinates {
    lat: number;
    lng: number;
}