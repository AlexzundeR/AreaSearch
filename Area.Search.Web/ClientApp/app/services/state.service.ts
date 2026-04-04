import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class StateService {
    saveState(state: any) {
        localStorage.setItem('state', JSON.stringify(state));
    }

    loadState() {
        var stateStr = localStorage.getItem('state');
        if (!stateStr) {
            return null;
        }
        try {
            var state = JSON.parse(stateStr);
            return state;
        }
        catch (error) {
            console.error(error);
            localStorage.removeItem('state');
            return null;
        }
    }
}
