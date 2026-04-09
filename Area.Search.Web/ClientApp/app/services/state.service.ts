import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class StateService {
    saveState(state: any) {
        try {
            const serialized = JSON.stringify(state);
            if (serialized.length > 4000000) {
                console.warn('State too large, trimming mapData');
                const trimmed = { ...state, mapData: [] };
                localStorage.setItem('state', JSON.stringify(trimmed));
            } else {
                localStorage.setItem('state', serialized);
            }
        } catch (e) {
            console.error('Failed to save state:', e);
            try {
                localStorage.removeItem('state');
            } catch {}
        }
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
