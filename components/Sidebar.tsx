"use client";

import { Apiary } from "@/types";
import { Plus, Edit2, Trash2, Satellite, Circle, Shield, AlertTriangle } from "lucide-react";

interface SidebarProps {
  apiaries: Apiary[];
  selectedApiary: Apiary | null;
  onSelectApiary: (apiary: Apiary | null) => void;
  onAddApiary: () => void;
  onEditApiary: (apiary: Apiary) => void;
  onDeleteApiary: (apiary: Apiary) => void;
  showSatellite: boolean;
  onToggleSatellite: () => void;
  showRadius: boolean;
  onToggleRadius: () => void;
  showSafeZone: boolean;
  onToggleSafeZone: () => void;
  showUnsafeZone: boolean;
  onToggleUnsafeZone: () => void;
}

export default function Sidebar({
  apiaries,
  selectedApiary,
  onSelectApiary,
  onAddApiary,
  onEditApiary,
  onDeleteApiary,
  showSatellite,
  onToggleSatellite,
  showRadius,
  onToggleRadius,
  showSafeZone,
  onToggleSafeZone,
  showUnsafeZone,
  onToggleUnsafeZone,
}: SidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header with action buttons */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">My Apiaries</h2>
          <button
            onClick={onAddApiary}
            className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
            title="Add Apiary"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Edit/Delete buttons - only show when apiary selected */}
        {selectedApiary && (
          <div className="flex gap-2">
            <button
              onClick={() => onEditApiary(selectedApiary)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => onDeleteApiary(selectedApiary)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Apiary List */}
      <div className="flex-1 overflow-y-auto">
        {apiaries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No apiaries yet.</p>
            <button
              onClick={onAddApiary}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Add your first apiary
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {apiaries.map((apiary) => (
              <button
                key={apiary.id}
                onClick={() => onSelectApiary(apiary)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedApiary?.id === apiary.id
                    ? "bg-primary-50 border-l-4 border-primary-600"
                    : "border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{apiary.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {apiary.address}, {apiary.postcode}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-600">
                        {apiary.colonies} {apiary.colonies === 1 ? "colony" : "colonies"}
                      </span>
                      {apiary.diseased && (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                          Diseased nearby
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggle Controls */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Map Controls</h3>
        <div className="space-y-2">
          <button
            onClick={onToggleSatellite}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showSatellite
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Satellite className="w-4 h-4" />
            Satellite Imagery
          </button>

          <button
            onClick={onToggleRadius}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showRadius
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Circle className="w-4 h-4" />
            3km Radius
          </button>

          <button
            onClick={onToggleSafeZone}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showSafeZone
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            Safe Zone
          </button>
          <button
            onClick={onToggleUnsafeZone}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showUnsafeZone
                ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Suspected Unsafe
          </button>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-500 mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-30"></div>
              <span className="text-gray-600">Safe radius (3km)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-30"></div>
              <span className="text-gray-600">Diseased radius (3km)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
