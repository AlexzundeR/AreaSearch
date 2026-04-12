import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MapService } from './map.service';
import { MapData } from '../models/map-data.model';

describe('MapService', () => {
  let service: MapService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MapService]
    });
    service = TestBed.inject(MapService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('mapDataQuery', () => {
    const mockData: MapData[] = [
      {
        id: '1',
        name: 'Магазин продуктов',
        data: [
          { type: 'магазин', bigType: 'shop', points: [[55.75, 37.61]] }
        ]
      },
      {
        id: '2',
        name: 'Школа №1',
        data: [
          { type: 'школа', bigType: 'education', points: [[55.76, 37.62]] }
        ]
      },
      {
        id: '3',
        name: 'Больница',
        data: [
          { type: 'больница', bigType: 'hospital', points: [[55.77, 37.63]] }
        ]
      }
    ];

    beforeEach(() => {
      const req = httpMock.expectOne('/dist/data/all-2026.json');
      req.flush(mockData);
      const typesReq = httpMock.expectOne('/dist/data/all-types-2026.json');
      typesReq.flush(['магазин', 'школа', 'больница']);
    });

    it('should filter by search string', async () => {
      const results = await service.mapDataQuery('магазин', [], [], null, null);
      expect(results.length).toBe(1);
      expect(results[0].name).toContain('Магазин');
    });

    it('should filter by selected types', async () => {
      const results = await service.mapDataQuery('', ['школа'], [], null, null);
      expect(results.length).toBe(1);
      expect(results[0].name).toContain('Школа');
    });

    it('should exclude ignored types', async () => {
      const results = await service.mapDataQuery('', [], ['магазин'], null, null);
      expect(results.length).toBe(2);
      expect(results.some(r => r.name.includes('Магазин'))).toBe(false);
    });

    it('should filter by map bounds', async () => {
      const mockBounds = {
        ne: { lat: () => 55.76, lng: () => 37.62 } as any,
        sw: { lat: () => 55.75, lng: () => 37.61 } as any
      };
      
      const results = await service.mapDataQuery('', [], [], mockBounds, null);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by polygon', async () => {
      const polygonFilter = (point: number[]) => {
        return point[0] > 55.74 && point[0] < 55.78 && point[1] > 37.60 && point[1] < 37.64;
      };
      
      const results = await service.mapDataQuery('', [], [], null, polygonFilter);
      expect(results.length).toBe(3); // All points inside
    });

    it('should combine multiple filters', async () => {
      const results = await service.mapDataQuery('магазин', ['магазин'], [], null, null);
      expect(results.length).toBe(1);
      expect(results[0].name).toContain('Магазин');
    });

    it('should return empty array when no matches', async () => {
      const results = await service.mapDataQuery('несуществующее', [], [], null, null);
      expect(results.length).toBe(0);
    });
  });
});