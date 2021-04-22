import {Injectable} from "@angular/core";
import {Http} from "@angular/http";
import {Coordinates, Route, RoutePoint} from "../models/route.type";
import {Observable} from "rxjs/Observable";
import {BehaviorSubject, Subject} from "rxjs/Rx";

@Injectable()
export class RouteService {
    public constructor(private http: Http) {
    }

    private routeSub: BehaviorSubject<Route> = new BehaviorSubject<Route>({
        routeId: 0,
        points: [],
        lastModificationDate: new Date(),
        name: ''
    });

    public $route: Observable<Route> = this.routeSub.map(r => {
        r.points.forEach((p, i) => p.pointId = i);
        return r;
    });


    private previousPoints: RoutePoint[];
    public $routePoints: Observable<RoutePoint[]> = this.routeSub.shareReplay()
        .skipWhile((newRoute) => {
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
        })
        .map(r => r.points);


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
        // var route = {
        //     routeId: routeId,
        //     name: "test",
        //     points: []
        // };
        //
        // this.route = route;
        //
        // return route;

        const newRoute = await this.http.get("/api/route", {
            params: {routeId: routeId}
        })
            .map(e => e.json() as Route)
            .toPromise();

        return this.route = newRoute;
    }

    public async updateRoute(route: Route) {
        // return route;

        const updatedRoute = await this.http.post("/api/route", route)
            .map(e => {
                return e.json() as Route
            })
            .toPromise();

        return this.route = updatedRoute;
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