"use client";

import { FC, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LocationPickerProps {
  value: {
    type: "Point";
    coordinates: [number, number];
    address: string;
  };
  onChange: (value: {
    type: "Point";
    coordinates: [number, number];
    address: string;
  }) => void;
}

const LocationPicker: FC<LocationPickerProps> = ({ value, onChange }) => {
  const [address, setAddress] = useState(value.address || "");
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Use browser geolocation API to get current location
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsSearching(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Use reverse geocoding to get address from coordinates
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            
            if (!response.ok) {
              throw new Error("Failed to get address");
            }
            
            const data = await response.json();
            const formattedAddress = data.display_name || "";
            
            setAddress(formattedAddress);
            onChange({
              type: "Point",
              coordinates: [longitude, latitude],
              address: formattedAddress,
            });
            setErrorMessage("");
          } catch (error) {
            console.error("Error getting address:", error);
            setErrorMessage("Failed to get address from coordinates");
            // Still update coordinates even if address lookup fails
            onChange({
              type: "Point",
              coordinates: [longitude, latitude],
              address: `${latitude}, ${longitude}`,
            });
          } finally {
            setIsSearching(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setErrorMessage("Could not get current location. Please enter manually.");
          setIsSearching(false);
        }
      );
    } else {
      setErrorMessage("Geolocation is not supported by your browser");
    }
  };
  
  // Search for address and get coordinates
  const handleSearchAddress = async () => {
    if (!address.trim()) {
      setErrorMessage("Please enter an address");
      return;
    }
    
    try {
      setIsSearching(true);
      setErrorMessage("");
      
      // Use Nominatim to search for coordinates by address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error("Failed to search address");
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        setErrorMessage("Address not found. Please try a different address.");
        return;
      }
      
      const { lat, lon, display_name } = data[0];
      
      onChange({
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)],
        address: display_name || address,
      });
    } catch (error) {
      console.error("Error searching address:", error);
      setErrorMessage("Failed to search address");
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle manual address input
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    
    // If coordinates are already set, update only the address
    if (value.coordinates[0] !== 0 && value.coordinates[1] !== 0) {
      onChange({
        ...value,
        address: newAddress,
      });
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Enter location address"
          value={address}
          onChange={handleAddressChange}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleSearchAddress}
          disabled={isSearching || !address.trim()}
        >
          Search
        </Button>
      </div>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleGetCurrentLocation}
        disabled={isSearching}
        className="w-full"
      >
        Use Current Location
      </Button>
      
      {errorMessage && (
        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
      )}
      
      {value.coordinates[0] !== 0 && value.coordinates[1] !== 0 && (
        <Card className="mt-3">
          <CardContent className="p-3">
            <p className="text-sm font-medium">Selected Location:</p>
            <p className="text-sm text-gray-500 mt-1">{value.address}</p>
            <p className="text-xs text-gray-400 mt-1">
              Coordinates: {value.coordinates[1].toFixed(6)}, {value.coordinates[0].toFixed(6)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocationPicker;
