"use client";

import type { PropertySummary } from "@/lib/types";
import PropertyCard from "./PropertyCard";

type Props = {
  properties: PropertySummary[];
};

export default function PropertyGrid({ properties }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}