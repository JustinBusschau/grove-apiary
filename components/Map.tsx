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
}

export default function ApiaryMap({
  apiaries,
  selectedApiary,
  onSelectApiary,
  userLocation,
  showSatellite,
  showRadius,
  showSafeZone,
}: Readonly<MapProps>) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const safeZoneRef = useRef<google.maps.Polygon | null>(null);

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
        zoom: 12, // Approximately 10km scale
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
  }, [apiaries, selectedApiary, showRadius, showSafeZone, onSelectApiary, clearOverlays]);

  const drawSafeZone = () => {
    if (!googleMapRef.current) return;

    const diseasedApiaries = apiaries.filter((a) => a.diseased);
    
    if (diseasedApiaries.length === 0) return;

    // Create union of all diseased circles
    const bounds = new google.maps.LatLngBounds();
    
    diseasedApiaries.forEach((apiary) => {
      // Add points around the circle to create a polygon approximation
      const center = new google.maps.LatLng(apiary.latitude, apiary.longitude);
      const radius = 3000; // 3km in meters
      
      for (let i = 0; i < 360; i += 10) {
        const heading = i;
        const point = google.maps.geometry.spherical.computeOffset(center, radius, heading);
        bounds.extend(point);
      }
    });

    // Create a rectangle representing the safe zone area
    // Note: For true polygon union, you'd need a more complex algorithm or library like Turf.js
    // This is a simplified visual representation
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    const safeZonePolygon = new google.maps.Polygon({
      paths: [
        { lat: ne.lat(), lng: sw.lng() },
        { lat: ne.lat(), lng: ne.lng() },
        { lat: sw.lat(), lng: ne.lng() },
        { lat: sw.lat(), lng: sw.lng() },
      ],
      fillColor: "#3b82f6",
      fillOpacity: 0.1,
      strokeColor: "#3b82f6",
      strokeWeight: 2,
      strokeOpacity: 0.5,
    });

    safeZonePolygon.setMap(googleMapRef.current);
    safeZoneRef.current = safeZonePolygon;
  };

  return <div ref={mapRef} className="w-full h-full" />;
}
