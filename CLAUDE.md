# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pyINDI is a pure-Python implementation of the [INDI protocol](http://www.clearskyinstitute.com/INDI/INDI.pdf) (Instrument Neutral Distributed Interface) for astronomical instrument control. It provides a Python device driver framework (server-side) and a Tornado-based web client (browser-side). Used in production at MMT Observatory and Steward Observatory.

## Common Commands

```bash
# Install in development mode
pip install -e .

# Run tests
pytest --pyargs pyindi

# Run a single test
pytest --pyargs pyindi -k "test_name"

# Code style
flake8 pyindi --count --max-line-length=100

# Or via tox
tox -e codestyle

# Run an example driver with indiserver
indiserver -vv ./example_drivers/skeleton.py

# Inspect running driver output (port 7624)
echo "<getProperties version='1.7'>" | nc localhost 7624
```

## Architecture

### Module Layout
```
pyindi/
├── device.py      # Base class for INDI device drivers (stdin/stdout XML with indiserver)
├── client.py      # Async TCP client connecting to indiserver
├── webclient.py   # Tornado web app: WebSocket bridge between browser and indiserver
├── utils.py       # INDIEvents - event-driven client with property watching/callbacks
├── data/indi.dtd  # INDI protocol DTD used to generate def/set XML elements
└── www/           # Static JavaScript frontend (vanilla JS, no frameworks) + HTML templates
```

### Data Flow

```
INDI Driver (device.py) ←stdin/stdout→ indiserver:7624 ←TCP→ INDIClient/INDIWebClient
                                                                      ↕ WebSocket
                                                                   Browser (JS)
```

### Building Device Drivers (`device.py`)

Subclass `device` and override these methods:
- `ISGetProperties(device)` — called when a client requests property definitions
- `initProperties()` — define vector properties; typically calls `self.buildSkeleton("file.xml")`
- `ISNewNumber(device, name, values, names)` — handle incoming number updates
- `ISNewText(device, name, values, names)` — handle incoming text updates
- `ISNewSwitch(device, name, values, names)` — handle incoming switch updates

Key device methods:
- `IDDef(vec)` — announce a new property to clients
- `IDSet(vec)` — send updated property values to clients
- `IDSetBLOB(blob)` — send BLOB data
- `IDMessage(msg)` — send a log message
- `IUFind(name)` — look up a registered vector property
- `IUUpdate(device, name, values, names, Set=False)` — update a vector property
- `buildSkeleton(skelfile)` — build properties from an XML skeleton file
- `@device.repeat(millis)` — decorator to schedule a method to run repeatedly

Start a driver with `device.start()` (sync) or `await device.astart()` (async).

### INDI Property Types

All live in `device.py`. Each "vector" groups one or more "properties":

| Vector Class | Elements | XML Tag Context |
|---|---|---|
| `INumberVector` | `INumber` (float) | `NumberVector` |
| `ITextVector` | `IText` (str) | `TextVector` |
| `ISwitchVector` | `ISwitch` (On/Off) | `SwitchVector` |
| `ILightVector` | `ILight` (IPState) | `LightVector` |
| `IBLOBVector` | `IBLOB` (bytes) | `BLOBVector` |

Enums: `IPState` (Idle/Ok/Busy/Alert), `IPerm` (ro/wo/rw), `ISRule` (OneOfMany/AtMostOne/AnyOfMany), `ISState` (On/Off).

XML for `def`/`set` elements is auto-generated using `indi.dtd` — the DTD attribute names are mapped to class attributes.

### Web Client (`webclient.py`)

`INDIWebApp` is the main entry point. It:
1. Starts a Tornado IOLoop
2. Creates `INDIWebClient` (singleton) which connects to indiserver via TCP
3. Serves a WebSocket at `/indi/websocket` that bridges browser ↔ indiserver
4. Serves static JS/CSS at `/indi/static/`
5. Serves the default GUI at `/indi/index.html`

To add custom routes, pass handlers to `build_app()`. Subclass `INDIHandler` and use `self.indi_render()` for templates that need pyINDI JS/CSS injected via `{% raw pyindi_head %}`.

Protected routes that cannot be overridden: `/indi/websocket`, `/indi/static/(.*)`, `/indi/templates/(.*)`.

BLOBs are handled separately: `BlobClient` feeds raw XML through `BlobHandler` (SAX parser) to extract base64 data and convert it to binary, then calls the user-supplied `handle_blob` callback.

### Event-Driven Client (`utils.py`)

`INDIEvents` (subclasses `INDIClientSingleton`) provides a higher-level API:
- `watch(device, name, callback)` — call `callback(xml_element)` when the property changes
- `@INDIEvents.handle_property(device, name)` — decorator to register a method as a property handler
- `getProperties(device, name)` — send a getProperties XML request

### Singleton Pattern

`INDIClientSingleton` ensures only one TCP connection per process. `INDIWebClient` uses this singleton via `INDIWebClient()` anywhere in the codebase (see websocket handler, blob handler).

## Key Conventions

- Naming mirrors the INDI C++ library (`ISNew*`, `IDSet*`, `IUFind`, etc.)
- All driver I/O is asyncio-based; use `self.mainloop` to schedule CPU-bound work via `run_in_executor`
- `device._registrants` and `device._NewPropertyMethods` are class-level (shared), so subclasses must be careful not to cross-contaminate
- Line length: 100 characters (flake8)
- Python 3.8+ required
