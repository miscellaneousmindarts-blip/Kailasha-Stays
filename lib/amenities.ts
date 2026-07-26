import {
  AirVent,
  Baby,
  BatteryCharging,
  Bath,
  Bike,
  Car,
  ChefHat,
  Coffee,
  Droplets,
  Fan,
  Flower2,
  Laptop,
  Refrigerator,
  Shirt,
  ShowerHead,
  Sofa,
  Sparkles,
  Sun,
  Tv,
  UtensilsCrossed,
  Wifi,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * Fixed amenity catalog. properties.amenities stores these keys, so renaming a
 * key means migrating data — add new ones instead.
 */
export const AMENITIES: Record<string, { label: string; icon: LucideIcon }> = {
  wifi: { label: "Wifi", icon: Wifi },
  air_conditioning: { label: "Air conditioning", icon: AirVent },
  fan: { label: "Ceiling fan", icon: Fan },
  kitchen: { label: "Kitchen", icon: ChefHat },
  fridge: { label: "Refrigerator", icon: Refrigerator },
  washing_machine: { label: "Washing machine", icon: Shirt },
  hot_water: { label: "Hot water", icon: ShowerHead },
  filtered_water: { label: "Filtered drinking water", icon: Droplets },
  parking: { label: "Free parking", icon: Car },
  power_backup: { label: "Power backup", icon: BatteryCharging },
  tv: { label: "TV", icon: Tv },
  workspace: { label: "Workspace", icon: Laptop },
  balcony: { label: "Balcony", icon: Sun },
  garden: { label: "Garden", icon: Flower2 },
  living_room: { label: "Living room", icon: Sofa },
  bathtub: { label: "Bathtub", icon: Bath },
  meals: { label: "Meals on request", icon: UtensilsCrossed },
  tea_coffee: { label: "Tea & coffee", icon: Coffee },
  housekeeping: { label: "Housekeeping", icon: Sparkles },
  cooler: { label: "Air cooler", icon: Wind },
  cycle: { label: "Cycle available", icon: Bike },
  crib: { label: "Baby cot", icon: Baby },
};

export const AMENITY_KEYS = Object.keys(AMENITIES);

export function amenity(key: string) {
  return AMENITIES[key] ?? null;
}
