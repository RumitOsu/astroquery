import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { create, all } from "mathjs";
import logger from "../../logger.js";

const math = create(all, {});

// Inject astronomical constants into mathjs scope
const astroConstants = {
  c: 299792458,              // speed of light in m/s
  AU: 149597870700,          // astronomical unit in meters
  parsec: 3.0857e16,         // parsec in meters
  ly: 9.461e15,              // light-year in meters
  solarMass: 1.989e30,       // solar mass in kg
  earthMass: 5.972e24,       // Earth mass in kg
  jupiterMass: 1.898e27,     // Jupiter mass in kg
  solarRadius: 6.957e8,      // solar radius in meters
  earthRadius: 6.371e6,      // Earth radius in meters
  G: 6.674e-11,              // gravitational constant
  hubbleConstant: 70,        // Hubble constant in km/s/Mpc
  solarLuminosity: 3.828e26, // solar luminosity in watts
  stefanBoltzmann: 5.67e-8,  // Stefan-Boltzmann constant
};

const astroCalculator = tool(
  async ({ expression }) => {
    logger.info("AstroCalculator invoked", { tool: "AstroCalculator", expression });
    try {
      const result = math.evaluate(expression, { ...astroConstants });
      const output = `Result: ${result}`;
      logger.info("AstroCalculator result", { tool: "AstroCalculator", expression, result: String(result) });
      return output;
    } catch (err) {
      const errorMsg = `Error evaluating "${expression}": ${err.message}`;
      logger.error("AstroCalculator error", { tool: "AstroCalculator", expression, error: err.message });
      return errorMsg;
    }
  },
  {
    name: "AstroCalculator",
    description: `Evaluates math expressions with built-in astronomical constants. Available constants: c (speed of light, 299792458 m/s), AU (astronomical unit, 149597870700 m), parsec (3.0857e16 m), ly (light-year, 9.461e15 m), solarMass (1.989e30 kg), earthMass (5.972e24 kg), jupiterMass (1.898e27 kg), solarRadius (6.957e8 m), earthRadius (6.371e6 m), G (gravitational constant, 6.674e-11), hubbleConstant (70 km/s/Mpc), solarLuminosity (3.828e26 W), stefanBoltzmann (5.67e-8). Use standard math syntax: +, -, *, /, ^, sqrt(), log(), sin(), cos(), pi, e.`,
    schema: z.object({
      expression: z.string().describe("The math expression to evaluate, e.g. 'AU / c' or 'sqrt(G * solarMass / earthRadius^2)'"),
    }),
  }
);

export default astroCalculator;
