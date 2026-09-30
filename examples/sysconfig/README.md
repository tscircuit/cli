# TI SysConfig export

From the CLI checkout:

```sh
bun cli/main.ts export examples/sysconfig/board.tsx --format sysconfig \
  --sysconfig-options examples/sysconfig/sysconfig-options.json \
  --output generated/board.syscfg --disable-parts-engine
```

This writes `examples/sysconfig/generated/board.syscfg`. As with other exports,
relative output paths are relative to the input file; absolute paths are accepted.
The options path is relative to the shell's current working directory. Missing
output directories are created. Existing output files are replaced, but neither
the circuit input nor the options file may be the output path.

The same command accepts `circuit.json` or `*.circuit.json` directly. TSX uses the
existing compiler/cache path with PCB generation and routing disabled; it does
not replace a full cached build. Source records are validated with Circuit JSON's
schemas; unrelated schematic/PCB schemas are not part of this export.

`component_name` must match exactly one source component. Each `port`, `sda_port`,
or `scl_port` is either an exact source-port name/alias or a numeric physical pin.
Names are scoped to that component and ambiguity is an error. Generated record
IDs are resolved on each export, not stored in project options. For a pin-change
demo, keep `SIGNAL` while changing `pin5/DIO12` to `pin6/DIO13` in the source.

GPIO direction, startup states, pull resistors and interrupt settings are explicit.
`max_bit_rate` is in **bits/s**: `100000` is converted by the library to TI's numeric
`maxBitRate = 100` kbit/s. Reservations prevent conflicting converter requests;
they do not generate TI peripheral allocations. Unknown options fail validation.
The supported scope comes from pinned converter commit
`007eb0475681b0088efa19e845b3807ab1b1ec27`: CC2340 GPIO/I2C with NoRTOS, or one
AM2434 output using the alternative single-GPIO options:

```json
{
  "component_name": "U1",
  "port": "A7",
  "gpio_name": "GPIO_LED",
  "direction": "output"
}
```

The example here is a small test circuit, not the full pedometer. For the actual
pedometer use its own circuit and explicit version-matched options.

**This command exports a configuration, not firmware or a TI validation result.**
It does not install or run TI, accept licenses, or generate C/header outputs.
The converter's AM2434 real-TI checks have passed; CC2340 validation remains a
separate pending task. BLE, a display driver and a complete pedometer application
are outside this command. Opening the result in TI requires the matching SDK/tool.
