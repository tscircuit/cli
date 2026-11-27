/**
 * Calibration of `tsci quote estimate --circuithub`, fitted to real
 * CircuitHub quotes (tests/fixtures/circuithub-reference-quotes.json) by
 * `bun scripts/fit-circuithub-estimate.ts`, which writes this file.
 *
 * - boards.us: boards made in the US. Up to lotQuantity boards: a base per
 *   service and layer count + perCm2 of one board. More boards: a base +
 *   perCm2 of all the boards ordered, per service.
 * - boards.overseas: boards made overseas (Flexible, and Priority and
 *   Standard, which cost the same): base + perCm2 of all the boards ordered.
 * - assembly: on CircuitHub's US Grid line, per order and per placement per
 *   board, for each speed tier (see CIRCUITHUB_ESTIMATE_OFFERS for which
 *   offer assembles at which tier).
 * - parts: reference or estimated unit prices x priceFactor, plus a little
 *   per BOM line for spares and handling.
 * - gridProto: 75% off boards and assembly at US Priority (fastest), parts at
 *   full price, for 10 boards or fewer.
 */
import type { CircuithubEstimateCalibration } from "./estimate-circuithub-quote"

export const CIRCUITHUB_ESTIMATE_CALIBRATION: CircuithubEstimateCalibration = {
  quotedOn: "2026-11-27",
  calibratedLayers: [1, 2, 4],
  boards: {
    us: {
      lotQuantity: 10,
      lot: {
        baseByLayers: {
          priority_express: {
            "1": 400.25,
            "2": 923.45,
            "4": 398.24,
          },
          priority: {
            "1": 400.25,
            "2": 923.45,
            "4": 398.24,
          },
          standard: {
            "1": 400.25,
            "2": 831.28,
            "4": 398.24,
          },
          flexible: {
            "1": 400.25,
            "2": 779.8,
            "4": 398.24,
          },
        },
        perCm2ByLayers: {
          "1": 0,
          "2": 0,
          "4": 8.6,
        },
      },
      volume: {
        priority_express: {
          baseByLayers: {
            "2": 661.45,
            "4": 1459.01,
          },
          perCm2: 0.744,
        },
        priority: {
          baseByLayers: {
            "2": 661.45,
            "4": 1459.01,
          },
          perCm2: 0.744,
        },
        standard: {
          baseByLayers: {
            "2": 685.58,
            "4": 1341.19,
          },
          perCm2: 0.5585,
        },
        flexible: {
          baseByLayers: {
            "2": 895.64,
            "4": 1298.37,
          },
          perCm2: 0.1921,
        },
      },
    },
    overseas: {
      flexible: {
        baseByLayers: {
          "1": 288.56,
          "2": 284.91,
          "4": 549.05,
        },
        perCm2: 0.0454,
      },
      fast: {
        baseByLayers: {
          "1": 415.93,
          "2": 453.33,
          "4": 924.77,
        },
        perCm2: 0.0922,
      },
    },
  },
  assembly: {
    express: {
      setup: 296,
      perBomLine: 9.02,
      perThroughHoleLine: 40.78,
      secondSide: 143.8,
      perPlacement: 0.393,
      perThroughHolePlacement: 2.102,
    },
    priority: {
      setup: 241.3,
      perBomLine: 8,
      perThroughHoleLine: 28.37,
      secondSide: 117.7,
      perPlacement: 0.28,
      perThroughHolePlacement: 1.973,
    },
    standard: {
      setup: 205.7,
      perBomLine: 7.43,
      perThroughHoleLine: 31.26,
      secondSide: 109.7,
      perPlacement: 0.305,
      perThroughHolePlacement: 2.169,
    },
    flexible: {
      setup: 167.8,
      perBomLine: 6.47,
      perThroughHoleLine: 38.09,
      secondSide: 125.2,
      perPlacement: 0.288,
      perThroughHolePlacement: 1.677,
    },
    overseas_standard: {
      setup: 230.7,
      perBomLine: 7.83,
      perThroughHoleLine: 27.04,
      secondSide: 94.6,
      perPlacement: 0.3,
      perThroughHolePlacement: 2.232,
    },
  },
  parts: {
    priceFactor: 1.066,
    perBomLine: 0.17,
  },
  leadTimeDays: {
    us: {
      priority_express: [7, 7],
      priority: [10, 10],
      standard: [11, 19],
      flexible: [12, 31],
    },
    overseas: {
      priority: [12, 18],
      standard: [20, 28],
      flexible: [24, 46],
    },
  },
  gridProto: {
    maxQuantity: 10,
    discount: 0.75,
  },
}
