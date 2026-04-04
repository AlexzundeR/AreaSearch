import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Coordinates, Route, RoutePoint } from "../models/route.type";
import { Observable, BehaviorSubject, Subject, map, shareReplay, skipWhile, combineLatest } from "rxjs";

export class ServiceError {
    error!: string;
    description!: string;
}

@Injectable({
    providedIn: 'root'
})
export class RouteService {
    public constructor(private http: HttpClient) {
    }

    private routeSub: BehaviorSubject<Route> = new BehaviorSubject<Route>({
        routeId: 0,
        points: [],
        lastModificationDate: new Date(),
        name: ''
    });

    private errorsSub: Subject<ServiceError> = new Subject<ServiceError>();

    public $errors: Observable<ServiceError> = this.errorsSub;

    public $route: Observable<Route> = this.routeSub.pipe(
        map(r => {
            r.points.forEach((p, i) => p.pointId = i);
            return r;
        })
    );

    private previousPoints?: RoutePoint[];
    public $routePoints: Observable<RoutePoint[]> = this.routeSub.pipe(
        shareReplay(),
        skipWhile((newRoute) => {
            if (!this.previousPoints) {
                this.previousPoints = newRoute.points;
                return false;
            }

            let isChanged = false;
            for (const index in newRoute.points) {
                const oldPoint = this.previousPoints[index];
                const newPoint = newRoute.points[index];

                if (!oldPoint || !newPoint) {
                    isChanged = true;
                    break;
                }

                if (oldPoint.name !== newPoint.name || oldPoint.description !== newPoint.description
                    || oldPoint.coordinates.lng !== newPoint.coordinates.lng || oldPoint.coordinates.lat !== oldPoint.coordinates.lat) {
                    isChanged = true;
                    break;
                }
            }
            this.previousPoints = newRoute.points;
            return !isChanged;
        }),
        map(r => r.points)
    );


    get route(): Route {
        return this.routeSub.value;
    }

    set route(route: Route) {
        this.routeSub.next(route);
    }

    replacePoint(point: RoutePoint, fromIndex: number, toIndex: number) {
        const points = [...this.route.points];
        points.splice(fromIndex, 1);
        points.splice(toIndex, 0, point);
        const routeToUpdate = Object.assign({}, this.route, {points: points});

        this.updateRoute(routeToUpdate).then();
    }


    addPoint(newPoint: RoutePoint) {
        const routeToUpdate = Object.assign({}, this.route, {points: [...this.route.points, newPoint]});
        this.updateRoute(routeToUpdate).then();
    }

    public async getRoute(routeId: number): Promise<Route> {
        const newRoute = await this.http.get<Route>("/api/route", {
            params: {routeId: routeId}
        }).toPromise();

        if (newRoute) {
            this.route = newRoute;
        }
        return this.route;
    }

    public async updateRoute(route: Route) {
        const updatedRoute = await this.http.post<Route>("/api/route", route)
            .toPromise()
            .catch((response: HttpErrorResponse) => {
                try {
                    const error = response.error as ServiceError;
                    if (!error.error){
                        error.error = `${response.status} ${response.statusText}`;
                    }
                    this.errorsSub.next(error);
                } catch (ex) {
                }
                throw response;
            });

        if (updatedRoute) {
            this.route = updatedRoute;
        }
        return this.route;
    }

    setPoint(point: RoutePoint, newPointValues: RoutePoint) {
        const routeToUpdate = Object.assign({}, this.route, {
            points: this.route.points.map(p => {
                if (p.pointId === point.pointId) {
                    return Object.assign({}, p, newPointValues)
                }

                return p;
            })
        });
        this.updateRoute(routeToUpdate).then();
    }

    deletePoints(selectedPoints: RoutePoint[]) {
        const selectedPointsIds = new Set(selectedPoints.map(p => p.pointId));
        const routeToUpdate = Object.assign({}, this.route, {points: this.route.points.filter(p => !selectedPointsIds.has(p.pointId))});
        return this.updateRoute(routeToUpdate).then();
    }
}
