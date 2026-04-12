import { test as base, expect, Page } from '@playwright/test';

export function setupMockApi(page: Page) {
  page.route('/api/route', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    } else if (method === 'POST') {
      await route.fulfill({ status: 200, body: JSON.stringify({ id: 1, name: 'New Point', coordinates: { lat: 55.7558, lng: 37.613 } }) });
    } else if (method === 'PUT') {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    } else if (method === 'DELETE') {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    }
  });
}

export function mockGoogleMaps(page: Page) {
  page.addInitScript(() => {
    (window as any).google = {
      maps: {
        Map: function() {
          return {
            setCenter: () => {},
            setZoom: () => {},
            getBounds: () => null,
            getCenter: () => ({ lat: () => 55.7558, lng: () => 37.613 }),
          };
        },
        LatLng: function(lat: number, lng: number) {
          return { lat: () => lat, lng: () => lng };
        },
        LatLngBounds: function() {
          return {
            extend: () => {},
            getNorthEast: () => ({ lat: () => 55.8, lng: () => 37.7 }),
            getSouthWest: () => ({ lat: () => 55.7, lng: () => 37.6 }),
          };
        },
        Marker: function() { return { setMap: () => {} }; },
        Polyline: function() { return { setMap: () => {} }; },
        Polygon: function() { return { setMap: () => {} }; },
        InfoWindow: function() { return { open: () => {}, close: () => {} }; },
       event: {
          addListener: () => {},
          addListenerOnce: () => {},
        },
        ControlPosition: {
          TOP_LEFT: 1,
          TOP_RIGHT: 2,
        },
        MapTypeId: {
          ROADMAP: 'roadmap',
          SATELLITE: 'satellite',
        },
      },
    };
  });
}

export const test = base;

export { expect };
export type { Page };