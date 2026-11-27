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
            "2": 478.2,
            "4": 1380.57,
          },
          perCm2: 0.9847,
        },
        priority: {
          baseByLayers: {
            "2": 478.2,
            "4": 1380.57,
          },
          perCm2: 0.9847,
        },
        standard: {
          baseByLayers: {
            "2": 528.4,
            "4": 1280.76,
          },
          perCm2: 0.7604,
        },
        flexible: {
          baseByLayers: {
            "2": 804.68,
            "4": 1277.2,
          },
          perCm2: 0.3015,
        },
      },
    },
    overseas: {
      flexible: {
        baseByLayers: {
          "1": 288.15,
          "2": 281.85,
          "4": 549.07,
        },
        perCm2: 0.0535,
      },
      fast: {
        baseByLayers: {
          "1": 415.41,
          "2": 449.35,
          "4": 924.86,
        },
        perCm2: 0.1029,
      },
    },
  },
  assembly: {
    express: {
      setup: 299.8,
      perBomLine: 7.72,
      perThroughHoleLine: 44.45,
      secondSide: 140.6,
      perPlacement: 0.415,
      perThroughHolePlacement: 1.994,
    },
    priority: {
      setup: 245.1,
      perBomLine: 6.62,
      perThroughHoleLine: 32.36,
      secondSide: 119.1,
      perPlacement: 0.295,
      perThroughHolePlacement: 1.899,
    },
    standard: {
      setup: 209.6,
      perBomLine: 5.89,
      perThroughHoleLine: 35.73,
      secondSide: 115.6,
      perPlacement: 0.325,
      perThroughHolePlacement: 2.069,
    },
    flexible: {
      setup: 171.6,
      perBomLine: 5.29,
      perThroughHoleLine: 41.37,
      secondSide: 121.6,
      perPlacement: 0.304,
      perThroughHolePlacement: 1.595,
    },
    overseas_standard: {
      setup: 233.9,
      perBomLine: 6.06,
      perThroughHoleLine: 32.44,
      secondSide: 109.1,
      perPlacement: 0.319,
      perThroughHolePlacement: 2.14,
    },
  },
  parts: {
    priceFactor: 0.986,
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
