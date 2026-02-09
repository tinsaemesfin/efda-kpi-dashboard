"use client";

import { MAKPI1Card } from "../../kpi-1/MAKPI1Card";
import { MAKPI2Card } from "../../kpi-2/MAKPI2Card";
import { MAKPI3Card } from "../../kpi-3/MAKPI3Card";
import { MAKPI4Card } from "../../kpi-4/MAKPI4Card";
import { MAKPI5Card } from "../../kpi-5/MAKPI5Card";
import { MAKPI6Card } from "../../kpi-6/MAKPI6Card";
import { MAKPI7Card } from "../../kpi-7/MAKPI7Card";
import { MAKPI8Card } from "../../kpi-8/MAKPI8Card";

export function KPICardsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MAKPI1Card />
      <MAKPI2Card />
      <MAKPI3Card />
      <MAKPI4Card />
      <MAKPI5Card />
      <MAKPI6Card />
      <MAKPI7Card />
      <MAKPI8Card />
    </div>
  );
}
