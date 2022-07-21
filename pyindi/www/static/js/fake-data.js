

const fakeIndi = {
  switch: {
    "metainfo": "svp",
    "op": "def",
    "device": "Dome Simulator",
    "name": "SIMULATION",
    "label": "Simulation",
    "group": "Options",
    "state": "Idle",
    "perm": "rw",
    "rule": "OneOfMany",
    "timeout": "0",
    "timestamp": "2022-07-20T19:38:19",
    "ENABLE.name": "ENABLE",
    "ENABLE.label": "Enable",
    "ENABLE": "Off",
    "values": [
      {
        "name": "ENABLE",
        "label": "Enable",
        "value": "Off"
      },
      {
        "name": "DISABLE",
        "label": "Disable",
        "value": "On"
      }
    ],
    "DISABLE.name": "DISABLE",
    "DISABLE.label": "Disable",
    "DISABLE": "On"
  },
  text: {
    "metainfo": "tvp",
    "op": "def",
    "device": "Dome Simulator",
    "name": "DEVICE_PORT",
    "label": "Ports",
    "group": "Connection",
    "state": "Idle",
    "perm": "rw",
    "timeout": "60",
    "timestamp": "2022-07-20T19:38:19",
    "PORT.name": "PORT",
    "PORT.label": "Port",
    "PORT": "/dev/cu.usbserial",
    "values": [
      {
        "name": "PORT",
        "label": "Port",
        "value": "/dev/cu.usbserial"
      }
    ]
  },
  light: {},
  number: {
    "metainfo": "nvp",
    "op": "def",
    "device": "Dome Simulator",
    "name": "POLLING_PERIOD",
    "label": "Polling",
    "group": "Options",
    "state": "Idle",
    "perm": "rw",
    "timeout": "0",
    "timestamp": "2022-07-20T19:38:19",
    "PERIOD_MS.name": "PERIOD_MS",
    "PERIOD_MS.label": "Period (ms)",
    "PERIOD_MS.format": "%.f",
    "PERIOD_MS.min": 10,
    "PERIOD_MS.max": 600000,
    "PERIOD_MS.step": 1000,
    "PERIOD_MS": 1000,
    "values": [
      {
        "name": "PERIOD_MS",
        "label": "Period (ms)",
        "format": "%.f",
        "min": 10,
        "max": 600000,
        "step": 1000,
        "value": 1000
      }
    ]
  },
  blob: {},
};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { fakeIndi };
}
