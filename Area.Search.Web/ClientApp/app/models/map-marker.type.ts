export interface IAnnotationData {
    text:string;   
}

export class MapMarker {
    private _content: any = null;
    private _contentPromise: Promise<any> | null = null;

    constructor(public location: Array<number>, public config: any) {
    }
    
    get position(): any {
        return { lat: this.location[0], lng: this.location[1] };
    }
    
    get options(): any {
        return {
            title: this.config?.title || 'Marker',
            gmpDraggable: this.config?.draggable || false,
        };
    }

    get backgroundColor(): string {
        return this.config?.color || '#17a2b8';
    }

    get content(): any {
        return this._content;
    }

    async ensureContent(): Promise<any> {
        if (this._content) {
            return this._content;
        }

        if (this._contentPromise) {
            return this._contentPromise;
        }

        this._contentPromise = (async () => {
            const { PinElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
            
            const pinElement = new PinElement({
                background: this.backgroundColor,
                glyphColor: 'white',
                scale: 1,
            });
            
            this._content = pinElement;
            return this._content;
        })();

        return this._contentPromise;
    }

    async setContent(): Promise<void> {
        await this.ensureContent();
    }
    
    originalMarker?: any;
    infoWindow?: any;
    infoWindowShowed? = false;

    toggleInfoWindow(select?: boolean): void {
        if (select != undefined) {
            if (this.infoWindowShowed === select) {
                return;
            }
            this.infoWindowShowed = !select;
        }

        if (this.infoWindow == null) {
            var annotationData = this.config as IAnnotationData;
            this.infoWindow = new google.maps.InfoWindow({
                content: annotationData.text
            });
        }

        if (!this.infoWindowShowed) {
            this.infoWindow.open(this.originalMarker.map, this.originalMarker);
        }
        else {
            this.infoWindow.close(this.originalMarker.map, this.originalMarker);
        }
        this.infoWindowShowed = !this.infoWindowShowed;
    }
}
