"use client";

import { useState, useEffect, useRef } from "react";
import { Apiary } from "@/types";
import { Loader } from "@googlemaps/js-api-loader";
import { X, MapPin, Search, AlertTriangle, Satellite, Maximize2, Minimize2 } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSatellite, setShowSatellite] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

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
        mapTypeId: showSatellite ? "satellite" : "roadmap",
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

  // Update map type when satellite toggle changes
  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(showSatellite ? "satellite" : "roadmap");
    }
  }, [showSatellite]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !googleMapRef.current) {
      console.log("Search skipped: query empty or map not ready");
      return;
    }

    setIsSearching(true);
    console.log("Starting geocode search for:", searchQuery);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      console.log("Geocode response:", status, results);

      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
        const location = results[0].geometry.location;
        const newPosition = { lat: location.lat(), lng: location.lng() };

        console.log("Found location:", newPosition, results[0].formatted_address);

        // Update map
        googleMapRef.current?.panTo(newPosition);
        googleMapRef.current?.setZoom(15);

        // Update marker
        if (markerRef.current) {
          markerRef.current.setPosition(newPosition);
        }

        // Extract address components
        const addressComponents = results[0].address_components;
        let postcode = "";
        let street = "";

        addressComponents?.forEach((component) => {
          const types = component.types;
          if (types.includes("postal_code")) {
            postcode = component.long_name;
          } else if (types.includes("route")) {
            street = component.long_name;
          }
        });

        // Update form data
        setFormData((prev) => ({
          ...prev,
          latitude: newPosition.lat,
          longitude: newPosition.lng,
          address: prev.address || street || results[0].formatted_address || "",
          postcode: prev.postcode || postcode || "",
        }));
      } else {
        console.error("Geocode failed:", status);
        alert(`Location not found: ${status}. Please check your Google Maps API key has Geocoding API enabled.`);
      }

      setIsSearching(false);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full overflow-y-auto transition-all duration-300 ${
        isFullScreen ? "max-w-[95vw] max-h-[95vh] h-[95vh]" : "max-w-4xl max-h-[90vh]"
      }`}>
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
                  Address Line 1
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., 123 Farm Road (optional)"
                />
              </div>

              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                  Postcode
                </label>
                <input
                  type="text"
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., AB12 3CD (optional)"
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

              {/* Disease Status Toggle */}
              <div className={`flex items-center gap-3 p-4 rounded-lg border ${formData.diseased ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className={`p-2 rounded-full ${formData.diseased ? "bg-red-100" : "bg-green-100"}`}>
                  <AlertTriangle className={`w-5 h-5 ${formData.diseased ? "text-red-600" : "text-green-600"}`} />
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.diseased}
                      onChange={(e) => setFormData({ ...formData, diseased: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div>
                      <span className={`font-medium ${formData.diseased ? "text-red-700" : "text-green-700"}`}>
                        {formData.diseased ? "Disease Present" : "Healthy / No Disease"}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formData.diseased
                          ? "Apiary has disease - red zone will be shown"
                          : "Apiary is healthy - green zone will be shown"}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <MapPin className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  Drag the pin on the map or click to set the exact location
                </p>
              </div>
            </div>

            {/* Right column - Map with Search */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Location on Map
                </label>
                <div className="flex items-center gap-2">
                  {/* Satellite Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowSatellite(!showSatellite)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      showSatellite
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    title={showSatellite ? "Switch to Map View" : "Switch to Satellite View"}
                  >
                    <Satellite className="w-4 h-4" />
                    {showSatellite ? "Map" : "Satellite"}
                  </button>
                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                  >
                    {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    {isFullScreen ? "Collapse" : "Expand"}
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by postcode, street or town..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-primary-600 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div
                ref={mapRef}
                className={`w-full rounded-lg border border-gray-300 ${isFullScreen ? "h-[calc(95vh-280px)]" : "h-80"}`}
              />
              <p className="text-sm text-gray-500">
                Search above or drag the marker to set the exact apiary location.
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
