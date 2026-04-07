export interface IAnnotationData {
    text:string;   
}

export class MapMarker {
    constructor(public location: Array<number>, public config: any) {
    }
    
    get position(): any {
        return { lat: this.location[0], lng: this.location[1] };
    }
    
    get options(): any {
        return this.config;
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
