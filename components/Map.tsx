"use client";

import { useEffect, useRef, useCallback } from "react";
import { Apiary } from "@/types";
import { Loader } from "@googlemaps/js-api-loader";

interface MapProps {
  readonly apiaries: Apiary[];
  readonly selectedApiary: Apiary | null;
  readonly onSelectApiary: (apiary: Apiary | null) => void;
  readonly userLocation: { lat: number; lng: number } | null;
  readonly showSatellite: boolean;
  readonly showRadius: boolean;
  readonly showSafeZone: boolean;
  readonly showUnsafeZone: boolean;
}

export default function ApiaryMap({
  apiaries,
  selectedApiary,
  onSelectApiary,
  userLocation,
  showSatellite,
  showRadius,
  showSafeZone,
  showUnsafeZone,
}: Readonly<MapProps>) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const safeZoneRef = useRef<google.maps.Polygon | null>(null);
  const unsafeZoneRef = useRef<google.maps.Polygon | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || googleMapRef.current) return;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      const center = userLocation || { lat: 51.5074, lng: -0.1278 };
      
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 11, // Approximately 15km scale (more zoomed out)
        mapTypeId: showSatellite ? "satellite" : "roadmap",
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });

      googleMapRef.current = map;
    });
  }, [userLocation, showSatellite]);

  // Update map type when satellite toggle changes
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(showSatellite ? "satellite" : "roadmap");
    }
  }, [showSatellite]);

  // Center on selected apiary
  useEffect(() => {
    if (googleMapRef.current && selectedApiary) {
      googleMapRef.current.panTo({
        lat: selectedApiary.latitude,
        lng: selectedApiary.longitude,
      });
    }
  }, [selectedApiary]);

  // Clear all overlays
  const clearOverlays = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    circlesRef.current.forEach((circle) => circle.setMap(null));
    circlesRef.current = [];
    if (safeZoneRef.current) {
      safeZoneRef.current.setMap(null);
      safeZoneRef.current = null;
    }
    if (unsafeZoneRef.current) {
      unsafeZoneRef.current.setMap(null);
      unsafeZoneRef.current = null;
    }
  }, []);

  // Update markers and overlays
  useEffect(() => {
    if (!googleMapRef.current) return;

    clearOverlays();

    const map = googleMapRef.current;

    // Add markers for all apiaries
    apiaries.forEach((apiary) => {
      const marker = new google.maps.Marker({
        position: { lat: apiary.latitude, lng: apiary.longitude },
        map,
        title: apiary.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: apiary.diseased ? "#ef4444" : "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        onSelectApiary(apiary);
      });

      markersRef.current.push(marker);
    });

    // Show 3km radius circles if enabled
    if (showRadius) {
      const apiariesToShow = selectedApiary ? [selectedApiary] : apiaries;
      
      apiariesToShow.forEach((apiary) => {
        const circle = new google.maps.Circle({
          map,
          center: { lat: apiary.latitude, lng: apiary.longitude },
          radius: 3000, // 3km in meters
          fillColor: apiary.diseased ? "#ef4444" : "#22c55e",
          fillOpacity: 0.2,
          strokeColor: apiary.diseased ? "#ef4444" : "#22c55e",
          strokeWeight: 2,
          strokeOpacity: 0.6,
        });
        circlesRef.current.push(circle);
      });
    }

    // Show safe zone if enabled
    if (showSafeZone) {
      drawSafeZone();
    }

    // Show unsafe zone if enabled
    if (showUnsafeZone) {
      drawUnsafeZone();
    }
  }, [apiaries, selectedApiary, showRadius, showSafeZone, showUnsafeZone, onSelectApiary, clearOverlays]);

  const drawSafeZone = async () => {
    if (!googleMapRef.current) return;

    // Safe zone = union of 3km circles from HEALTHY apiaries (diseased = false)
    const healthyApiaries = apiaries.filter((a) => !a.diseased);

    if (healthyApiaries.length === 0) return;

    try {
      // @ts-expect-error Turf.js has type export issues but works fine
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const turf: any = await import("@turf/turf");

      if (!googleMapRef.current) return;

      // Create circular polygons for each healthy apiary (3km radius)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circles: any[] = [];

      healthyApiaries.forEach((apiary) => {
        // Create a point
        const pt = turf.point([apiary.longitude, apiary.latitude]);
        // Create a circle with 3km radius (64 points for smooth circle)
        const circ = turf.circle(pt, 3, { units: "kilometers", steps: 64 });
        circles.push(circ);
      });

      if (circles.length === 0) return;

      // Union all circles together
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let safeZonePolygon: any = circles[0];
      for (let i = 1; i < circles.length; i++) {
        const united = turf.union(safeZonePolygon, circles[i]);
        if (united) {
          safeZonePolygon = united;
        }
      }

      if (!safeZonePolygon) return;

      // Convert turf polygon to Google Maps format
      const coords = turf.coordAll(safeZonePolygon);
      const paths: google.maps.LatLngLiteral[] = coords.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      // Create and display the safe zone polygon
      const googlePolygon = new google.maps.Polygon({
        paths,
        fillColor: "#22c55e", // Green for safe
        fillOpacity: 0.15,
        strokeColor: "#22c55e",
        strokeWeight: 2,
        strokeOpacity: 0.6,
      });

      googlePolygon.setMap(googleMapRef.current);
      safeZoneRef.current = googlePolygon;
    } catch (error) {
      console.error("Error drawing safe zone:", error);
    }
  };

  const drawUnsafeZone = async () => {
    if (!googleMapRef.current) return;

    // Unsafe zone = union of 3km circles from DISEASED apiaries MINUS healthy apiary circles
    const diseasedApiaries = apiaries.filter((a) => a.diseased);

    if (diseasedApiaries.length === 0) return;

    try {
      // @ts-expect-error Turf.js has type export issues but works fine
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const turf: any = await import("@turf/turf");

      if (!googleMapRef.current) return;

      // Create circular polygons for each diseased apiary (3km radius)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diseasedCircles: any[] = [];

      diseasedApiaries.forEach((apiary) => {
        const pt = turf.point([apiary.longitude, apiary.latitude]);
        const circ = turf.circle(pt, 3, { units: "kilometers", steps: 64 });
        diseasedCircles.push(circ);
      });

      // Union all diseased circles together
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let unsafeZonePolygon: any = diseasedCircles[0];
      for (let i = 1; i < diseasedCircles.length; i++) {
        const united = turf.union(unsafeZonePolygon, diseasedCircles[i]);
        if (united) {
          unsafeZonePolygon = united;
        }
      }

      // Now subtract healthy apiary circles from the unsafe zone
      const healthyApiaries = apiaries.filter((a) => !a.diseased);

      for (const healthy of healthyApiaries) {
        const healthyPt = turf.point([healthy.longitude, healthy.latitude]);
        const healthyCircle = turf.circle(healthyPt, 3, { units: "kilometers", steps: 64 });

        // Use difference to subtract healthy circle from unsafe zone
        const diff = turf.difference(unsafeZonePolygon, healthyCircle);
        if (diff) {
          unsafeZonePolygon = diff;
        }
      }

      if (!unsafeZonePolygon) return;

      // Convert turf polygon to Google Maps format
      const coords = turf.coordAll(unsafeZonePolygon);
      const paths: google.maps.LatLngLiteral[] = coords.map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));

      // Create and display the unsafe zone polygon
      const googlePolygon = new google.maps.Polygon({
        paths,
        fillColor: "#ef4444", // Red for unsafe
        fillOpacity: 0.2,
        strokeColor: "#ef4444",
        strokeWeight: 2,
        strokeOpacity: 0.6,
      });

      googlePolygon.setMap(googleMapRef.current);
      unsafeZoneRef.current = googlePolygon;
    } catch (error) {
      console.error("Error drawing unsafe zone:", error);
    }
  };

  return <div ref={mapRef} className="w-full h-full" />;
}
