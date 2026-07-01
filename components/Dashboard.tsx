"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Sidebar from "./Sidebar";
import ApiaryMap from "./Map";
import ApiaryForm from "./ApiaryForm";
import { Apiary } from "@/types";

export default function Dashboard() {
  const { data: session } = useSession();
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApiary, setEditingApiary] = useState<Apiary | null>(null);
  const [showSatellite, setShowSatellite] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [showUnsafeZone, setShowUnsafeZone] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetchApiaries();
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Default to London if geolocation fails
          setUserLocation({ lat: 51.5074, lng: -0.1278 });
        }
      );
    } else {
      setUserLocation({ lat: 51.5074, lng: -0.1278 });
    }
  }, []);

  const fetchApiaries = async () => {
    try {
      const response = await fetch("/api/apiaries");
      if (response.ok) {
        const data = await response.json();
        setApiaries(data);
      }
    } catch (error) {
      console.error("Error fetching apiaries:", error);
    }
  };

  const handleAddApiary = () => {
    setEditingApiary(null);
    setIsFormOpen(true);
  };

  const handleEditApiary = (apiary: Apiary) => {
    setEditingApiary(apiary);
    setIsFormOpen(true);
  };

  const handleDeleteApiary = async (apiary: Apiary) => {
    if (!confirm(`Are you sure you want to delete "${apiary.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/apiaries?id=${apiary.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApiaries(apiaries.filter((a) => a.id !== apiary.id));
        if (selectedApiary?.id === apiary.id) {
          setSelectedApiary(null);
        }
      }
    } catch (error) {
      console.error("Error deleting apiary:", error);
    }
  };

  const handleFormSubmit = async (data: Omit<Apiary, "id" | "createdAt" | "updatedAt" | "userId">) => {
    try {
      const url = "/api/apiaries";
      const method = editingApiary ? "PUT" : "POST";
      const body = editingApiary ? { ...data, id: editingApiary.id } : data;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const savedApiary = await response.json();
        if (editingApiary) {
          setApiaries(apiaries.map((a) => (a.id === savedApiary.id ? savedApiary : a)));
        } else {
          setApiaries([...apiaries, savedApiary]);
        }
        setIsFormOpen(false);
        setEditingApiary(null);
      }
    } catch (error) {
      console.error("Error saving apiary:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Grove Apiary</h1>
          <span className="text-primary-200">
            Welcome, {session?.user?.name || session?.user?.email}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm bg-primary-600 hover:bg-primary-500 px-3 py-1 rounded transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          apiaries={apiaries}
          selectedApiary={selectedApiary}
          onSelectApiary={setSelectedApiary}
          onAddApiary={handleAddApiary}
          onEditApiary={handleEditApiary}
          onDeleteApiary={handleDeleteApiary}
          showSatellite={showSatellite}
          onToggleSatellite={() => setShowSatellite(!showSatellite)}
          showRadius={showRadius}
          onToggleRadius={() => setShowRadius(!showRadius)}
          showSafeZone={showSafeZone}
          onToggleSafeZone={() => setShowSafeZone(!showSafeZone)}
          showUnsafeZone={showUnsafeZone}
          onToggleUnsafeZone={() => setShowUnsafeZone(!showUnsafeZone)}
        />

        {/* Map */}
        <div className="flex-1 relative">
          <ApiaryMap
            apiaries={apiaries}
            selectedApiary={selectedApiary}
            onSelectApiary={setSelectedApiary}
            userLocation={userLocation}
            showSatellite={showSatellite}
            showRadius={showRadius}
            showSafeZone={showSafeZone}
            showUnsafeZone={showUnsafeZone}
          />
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <ApiaryForm
          apiary={editingApiary}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingApiary(null);
          }}
        />
      )}
    </div>
  );
}
