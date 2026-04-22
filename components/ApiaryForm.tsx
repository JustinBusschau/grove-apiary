"use client";

import { useState, useEffect, useRef } from "react";
import { Apiary } from "@/types";
import { Loader } from "@googlemaps/js-api-loader";
import { X, MapPin } from "lucide-react";

interface ApiaryFormProps {
  apiary: Apiary | null;
  onSubmit: (data: Omit<Apiary, "id" | "createdAt" | "updatedAt" | "userId">) => void;
  onClose: () => void;
}

export default function ApiaryForm({ apiary, onSubmit, onClose }: ApiaryFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    postcode: "",
    colonies: 1,
    latitude: 51.5074,
    longitude: -0.1278,
    diseased: false,
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (apiary) {
      setFormData({
        name: apiary.name,
        address: apiary.address,
        postcode: apiary.postcode,
        colonies: apiary.colonies,
        latitude: apiary.latitude,
        longitude: apiary.longitude,
        diseased: apiary.diseased,
      });
    }
  }, [apiary]);

  // Initialize map for location picker
  useEffect(() => {
    if (!mapRef.current || googleMapRef.current) return;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      const center = { lat: formData.latitude, lng: formData.longitude };
      
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 13,
        mapTypeId: "roadmap",
        mapTypeControl: false,
        fullscreenControl: false,
      });

      googleMapRef.current = map;

      // Add marker
      const marker = new google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: "Apiary Location",
      });

      markerRef.current = marker;

      // Update coordinates when marker is dragged
      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        if (position) {
          setFormData((prev) => ({
            ...prev,
            latitude: position.lat(),
            longitude: position.lng(),
          }));
        }
      });

      // Allow clicking on map to move marker
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          setFormData((prev) => ({
            ...prev,
            latitude: e.latLng!.lat(),
            longitude: e.latLng!.lng(),
          }));
        }
      });
    });
  }, []);

  // Update marker position when form data changes
  useEffect(() => {
    if (markerRef.current && googleMapRef.current) {
      const position = { lat: formData.latitude, lng: formData.longitude };
      markerRef.current.setPosition(position);
      googleMapRef.current.panTo(position);
    }
  }, [formData.latitude, formData.longitude]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {apiary ? "Edit Apiary" : "Add New Apiary"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Form fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Apiary Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., North Field Apiary"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 123 Farm Road"
                />
              </div>

              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode *
                </label>
                <input
                  type="text"
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., AB12 3CD"
                />
              </div>

              <div>
                <label htmlFor="colonies" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Colonies *
                </label>
                <input
                  type="number"
                  id="colonies"
                  value={formData.colonies}
                  onChange={(e) => setFormData({ ...formData, colonies: parseInt(e.target.value) || 0 })}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Coordinates display */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    id="latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    step="any"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    id="longitude"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    step="any"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <MapPin className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  Drag the pin on the map or click to set the exact location
                </p>
              </div>
            </div>

            {/* Right column - Map */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Location on Map
              </label>
              <div
                ref={mapRef}
                className="w-full h-80 rounded-lg border border-gray-300"
              />
              <p className="text-sm text-gray-500">
                Drag the marker to set the exact apiary location, or type coordinates manually.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {apiary ? "Save Changes" : "Add Apiary"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
