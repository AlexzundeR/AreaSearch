import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Route, RoutePoint } from "../models/route.type";
import { Observable, BehaviorSubject, Subject as RxSubject, map, defer } from "rxjs";
import { concatMap, catchError, takeUntil, tap } from "rxjs/operators";

export class ServiceError {
    error!: string;
    description!: string;
}

@Injectable({
    providedIn: 'root'
})
export class RouteService {
    private routeSub = new BehaviorSubject<Route>({
        routeId: 0,
        points: [],
        lastModificationDate: new Date(),
        name: ''
    });

    private errorsSub = new RxSubject<ServiceError>();
    public $errors: Observable<ServiceError> = this.errorsSub;

    private updateTriggerSub = new RxSubject<Route>();
    private stopUpdateSub = new RxSubject<void>();
    private savingSub = new BehaviorSubject<boolean>(false);
    private pendingQueue: Route[] = [];
    private isProcessing: boolean = false;

    public $saving: Observable<boolean> = this.savingSub.asObservable();

    public $routePoints: Observable<RoutePoint[]> = this.routeSub.pipe(
        map((r: Route) => r.points)
    );

    public $route: Observable<Route> = this.routeSub.pipe(
        map((r: Route) => {
            r.points.forEach((p: RoutePoint, i: number) => { p.pointId = i; });
            return r;
        })
    );

    constructor(private http: HttpClient) {
        this.initUpdatePipeline();
    }

    private initUpdatePipeline() {
        this.updateTriggerSub.pipe(
            tap(() => {
                if (!this.savingSub.value) {
                    this.savingSub.next(true);
                }
            }),
            concatMap(route => 
                defer(() => this.http.post<Route>("/api/route", route)).pipe(
                    catchError((error: HttpErrorResponse) => {
                        this.handleError(error);
                        return [];
                    })
                )
            ),
            takeUntil(this.stopUpdateSub)
        ).subscribe({
            next: (updatedRoute) => {
                if (updatedRoute) {
                    const currentRoute = this.routeSub.value;
                    currentRoute.lastModificationDate = updatedRoute.lastModificationDate;
                    currentRoute.routeId = updatedRoute.routeId;
                    currentRoute.name = updatedRoute.name;
                    this.updateQueueWithNewVersion(updatedRoute.lastModificationDate);
                }
                this.processNext();
            },
            error: () => this.processNext()
        });
    }

    private updateQueueWithNewVersion(newVersion: Date) {
        this.pendingQueue = this.pendingQueue.map(route => ({
            ...route,
            lastModificationDate: newVersion
        }));
    }

    private processNext() {
        this.isProcessing = false;
        if (this.pendingQueue.length > 0) {
            const next = this.pendingQueue.shift();
            if (next) {
                this.isProcessing = true;
                this.updateTriggerSub.next(next);
            }
        } else {
            this.savingSub.next(false);
        }
    }

    private queueUpdate(route: Route) {
        this.pendingQueue.push(route);
        if (!this.isProcessing) {
            this.processNext();
        }
    }

    private handleError(response: HttpErrorResponse) {
        let error: ServiceError;
        if (response.error) {
            error = response.error as ServiceError;
        } else {
            error = { error: 'Ошибка', description: response.message || `Ошибка сервера: ${response.status}` };
        }
        if (!error.error) {
            error.error = `${response.status} ${response.statusText}`;
        }
        if (response.status === 409) {
            error.error = 'concurrent_access';
            error.description = 'Данные были изменены другим пользователем. Пожалуйста, обновите страницу.';
        }
        this.errorsSub.next(error);
    }

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
        this.queueUpdate({ ...this.route, points });
    }

    reorderPoints(newOrder: RoutePoint[]) {
        const currentRoute = this.routeSub.value;
        currentRoute.points.splice(0, currentRoute.points.length, ...newOrder);
        this.routeSub.next({ ...currentRoute, points: [...currentRoute.points] });
        this.queueUpdate(currentRoute);
    }

    addPoint(newPoint: RoutePoint) {
        const currentRoute = this.routeSub.value;
        currentRoute.points.push(newPoint);
        this.routeSub.next({ ...currentRoute, points: [...currentRoute.points] });
        this.queueUpdate(currentRoute);
    }

    async getRoute(routeId: number): Promise<Route> {
        const newRoute = await this.http.get<Route>("/api/route", {
            params: { routeId }
        }).toPromise();

        if (newRoute) {
            this.route = newRoute;
        }
        return this.route;
    }

    setPoint(point: RoutePoint, newPointValues: RoutePoint) {
        const currentRoute = this.routeSub.value;
        const pointIndex = currentRoute.points.findIndex(p => p.pointId === point.pointId);
        if (pointIndex >= 0) {
            Object.assign(currentRoute.points[pointIndex], newPointValues);
            this.routeSub.next({ ...currentRoute, points: [...currentRoute.points] });
        }
        
        this.queueUpdate(currentRoute);
    }

    deletePoints(selectedPoints: RoutePoint[]) {
        const currentRoute = this.routeSub.value;
        const selectedPointsIds = new Set(selectedPoints.map(p => p.pointId));
        currentRoute.points = currentRoute.points.filter(p => !selectedPointsIds.has(p.pointId));
        this.routeSub.next({ ...currentRoute, points: [...currentRoute.points] });
        this.queueUpdate(currentRoute);
    }
}