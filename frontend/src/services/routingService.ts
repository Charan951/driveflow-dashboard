import axios from 'axios';

const OSRM_API_BASE = 'https://router.project-osrm.org/route/v1/driving';

export interface RouteResponse {
  routes: {
    geometry: any; // GeoJSON or Polyline string
    distance: number;
    duration: number;
  }[];
}

export const routingService = {
  getRoute: async (start: [number, number], end: [number, number]) => {
    // OSRM expects {lng},{lat}
    const startCoord = `${start[1]},${start[0]}`;
    const endCoord = `${end[1]},${end[0]}`;
    
    try {
      const response = await axios.get(`${OSRM_API_BASE}/${startCoord};${endCoord}?overview=full&geometries=geojson`);
      return response.data as RouteResponse;
    } catch (error) {
      console.error('Failed to fetch route from OSRM', error);
      throw error;
    }
  }
};
