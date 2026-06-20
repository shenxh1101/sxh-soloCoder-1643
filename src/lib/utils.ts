import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { SeatZone } from "@shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getZoneName(zoneId: string | undefined, zones: SeatZone[]): string {
  if (!zoneId) return "";
  return zones.find((z) => z.id === zoneId)?.name || "";
}

export function getZoneColor(zoneId: string | undefined, zones: SeatZone[]): string {
  if (!zoneId) return "#6b7280";
  const defaultColors: Record<string, string> = {
    vip: "#d4af37",
    media: "#3b82f6",
    general: "#6b7280",
    custom: "#6b7280",
  };
  const zone = zones.find((z) => z.id === zoneId);
  if (zone) {
    return zone.color || defaultColors[zone.type] || "#6b7280";
  }
  return "#6b7280";
}
