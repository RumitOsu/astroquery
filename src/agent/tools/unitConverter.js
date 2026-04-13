import { tool } from "@langchain/core/tools";
import { z } from "zod";
import logger from "../../logger.js";

// Conversion factors — everything relative to meters (distance) or kg (mass)
const distanceToMeters = {
  m: 1,
  km: 1e3,
  mi: 1609.344,
  AU: 1.496e11,
  ly: 9.461e15,
  "light-year": 9.461e15,
  "light-years": 9.461e15,
  parsec: 3.086e16,
  pc: 3.086e16,
  kpc: 3.086e19,
  Mpc: 3.086e22,
};

const massToKg = {
  kg: 1,
  g: 1e-3,
  lb: 0.453592,
  "solar-mass": 1.989e30,
  "earth-mass": 5.972e24,
  "jupiter-mass": 1.898e27,
};

function convert(value, from, to) {
  // Try distance
  if (distanceToMeters[from] && distanceToMeters[to]) {
    const meters = value * distanceToMeters[from];
    return { result: meters / distanceToMeters[to], category: "distance" };
  }
  // Try mass
  if (massToKg[from] && massToKg[to]) {
    const kg = value * massToKg[from];
    return { result: kg / massToKg[to], category: "mass" };
  }
  return null;
}

const unitConverter = tool(
  async ({ value, fromUnit, toUnit }) => {
    logger.info("UnitConverter invoked", { tool: "UnitConverter", value, fromUnit, toUnit });
    const conversion = convert(value, fromUnit, toUnit);
    if (!conversion) {
      const msg = `Cannot convert from "${fromUnit}" to "${toUnit}". Supported distance units: ${Object.keys(distanceToMeters).join(", ")}. Supported mass units: ${Object.keys(massToKg).join(", ")}.`;
      logger.warn("UnitConverter unsupported units", { fromUnit, toUnit });
      return msg;
    }
    const output = `${value} ${fromUnit} = ${conversion.result.toExponential(4)} ${toUnit}`;
    logger.info("UnitConverter result", { tool: "UnitConverter", output });
    return output;
  },
  {
    name: "UnitConverter",
    description:
      "Converts between astronomical units. Distance: m, km, mi, AU, ly (light-year), parsec (pc), kpc, Mpc. Mass: kg, g, lb, solar-mass, earth-mass, jupiter-mass. Example: convert 4.24 light-years to kilometers.",
    schema: z.object({
      value: z.number().describe("The numeric value to convert"),
      fromUnit: z.string().describe("The source unit, e.g. 'ly', 'AU', 'parsec', 'solar-mass'"),
      toUnit: z.string().describe("The target unit, e.g. 'km', 'mi', 'earth-mass'"),
    }),
  }
);

export default unitConverter;
