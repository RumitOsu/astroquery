import { tool } from "@langchain/core/tools";
import { z } from "zod";
import logger from "../../logger.js";

const comparisons = {
  distance: [
    { name: "a football field", meters: 91.44 },
    { name: "the length of Manhattan", meters: 21_500 },
    { name: "a drive across the US (NYC to LA)", meters: 3_944_000 },
    { name: "the circumference of Earth", meters: 40_075_000 },
    { name: "the distance from Earth to the Moon", meters: 384_400_000 },
    { name: "the distance from Earth to the Sun", meters: 1.496e11 },
    { name: "the distance from the Sun to Jupiter", meters: 7.785e11 },
    { name: "the diameter of the Solar System (to Neptune)", meters: 9.0e12 },
    { name: "one light-year", meters: 9.461e15 },
    { name: "the distance to the nearest star (Proxima Centauri)", meters: 4.014e16 },
    { name: "the diameter of the Milky Way", meters: 9.461e20 },
    { name: "the distance to the Andromeda Galaxy", meters: 2.365e22 },
  ],
  mass: [
    { name: "a grain of sand", kg: 6.5e-5 },
    { name: "a tennis ball", kg: 0.057 },
    { name: "an adult human", kg: 70 },
    { name: "an African elephant", kg: 6000 },
    { name: "the Great Pyramid of Giza", kg: 6e9 },
    { name: "Mount Everest", kg: 8.1e13 },
    { name: "Earth's atmosphere", kg: 5.15e18 },
    { name: "the Moon", kg: 7.342e22 },
    { name: "Earth", kg: 5.972e24 },
    { name: "Jupiter", kg: 1.898e27 },
    { name: "the Sun", kg: 1.989e30 },
  ],
  time: [
    { name: "a blink of an eye", seconds: 0.3 },
    { name: "one minute", seconds: 60 },
    { name: "a lunch break", seconds: 3600 },
    { name: "one day", seconds: 86400 },
    { name: "one year", seconds: 3.156e7 },
    { name: "an average human lifetime", seconds: 2.366e9 },
    { name: "recorded human history", seconds: 1.577e11 },
    { name: "the time since dinosaurs went extinct", seconds: 2.05e15 },
    { name: "the age of Earth", seconds: 1.45e17 },
    { name: "the age of the universe", seconds: 4.355e17 },
  ],
  temperature: [
    { name: "absolute zero", kelvin: 0 },
    { name: "liquid nitrogen", kelvin: 77 },
    { name: "a cold winter day", kelvin: 253 },
    { name: "room temperature", kelvin: 293 },
    { name: "boiling water", kelvin: 373 },
    { name: "a pizza oven", kelvin: 700 },
    { name: "lava", kelvin: 1400 },
    { name: "the surface of the Sun", kelvin: 5778 },
    { name: "the core of Earth", kelvin: 6000 },
    { name: "the surface of a hot blue star", kelvin: 40000 },
    { name: "the core of the Sun", kelvin: 1.5e7 },
    { name: "a supernova explosion", kelvin: 1e11 },
  ],
};

function findBestComparisons(value, type) {
  const list = comparisons[type];
  if (!list) return null;

  const unitKey = type === "distance" ? "meters" : type === "mass" ? "kg" : type === "temperature" ? "kelvin" : "seconds";

  // Find the two closest items (one smaller, one larger)
  let smaller = null, larger = null;
  for (const item of list) {
    const v = item[unitKey];
    if (v <= value && (!smaller || v > smaller[unitKey])) smaller = item;
    if (v >= value && (!larger || v < larger[unitKey])) larger = item;
  }

  const results = [];

  if (smaller) {
    const ratio = value / smaller[unitKey];
    if (ratio < 1000 && ratio > 0.001) {
      results.push(`${ratio.toFixed(1)}x ${smaller.name}`);
    } else {
      results.push(`${ratio.toExponential(1)}x ${smaller.name}`);
    }
  }

  if (larger && larger !== smaller) {
    const fraction = value / larger[unitKey];
    if (fraction >= 0.001) {
      const pct = (fraction * 100).toFixed(1);
      results.push(`${pct}% of ${larger.name}`);
    } else {
      results.push(`${fraction.toExponential(1)}x ${larger.name}`);
    }
  }

  return results;
}

const cosmicScale = tool(
  async ({ value, type }) => {
    logger.info("CosmicScale invoked", { tool: "CosmicScale", value, type });

    const results = findBestComparisons(value, type);
    if (!results || results.length === 0) {
      return `I couldn't find a good comparison for ${value} in the "${type}" category. Supported types: distance (meters), mass (kg), time (seconds), temperature (kelvin).`;
    }

    const unitLabel = { distance: "meters", mass: "kg", time: "seconds", temperature: "K" }[type];
    let output = `**Scale comparison for ${value.toExponential(3)} ${unitLabel}:**\n`;
    for (const r of results) {
      output += `- That's about ${r}\n`;
    }

    logger.info("CosmicScale result", { tool: "CosmicScale", comparisons: results });
    return output;
  },
  {
    name: "CosmicScale",
    description: `Puts astronomical numbers into human-relatable perspective by comparing them to everyday objects and familiar scales. Give it a number and a type (distance in meters, mass in kg, time in seconds, or temperature in kelvin) and it returns intuitive comparisons like "that's 4.2 million times the distance from NYC to LA" or "15% of the age of the universe." Use this to help users grasp the mind-boggling scales of the cosmos.`,
    schema: z.object({
      value: z.number().describe("The numeric value to compare"),
      type: z.enum(["distance", "mass", "time", "temperature"]).describe("The type of measurement"),
    }),
  }
);

export default cosmicScale;
