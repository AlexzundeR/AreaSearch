export interface IAnnotationData {
    text:string;   
}

export class MapMarker {
    constructor(public location: Array<number>, public config: any) {
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
