# EWS WebSocket

- Endpoint: `ws(s)://<host>/api/public/ews/ws`
- Access: Public
- Data source: [EWS map](https://earlywarning-datacenter.net/?halaman=map)

## Client messages

| Field | Required | Values |
|---|---|---|
| `type` | Yes | `subscribe` or `refresh` |
| `requestId` | Yes | UUID string. The server echoes this value in its response. |
| `filters` | No | Filter object. Valid for `subscribe` only. |

```json
{
  "type": "subscribe",
  "requestId": "d0bc2f38-a472-4bf5-b2d8-129d50de946b",
  "filters": {
    "stations": [
      { "type": "landslide", "statusCodes": ["warning", "maintenance"] },
      { "type": "flood" }
    ],
    "search": "Purworejo",
    "rainfallMm": { "min": 20, "max": 100 }
  }
}
```

A refresh uses the active filters:

```json
{
  "type": "refresh",
  "requestId": "9b459d1a-7d31-45a3-b858-bdf10c7c5f86"
}
```

## Filters

All filter fields are optional. An omitted or empty `filters` object selects all stations.

| Field | Values | Rule |
|---|---|---|
| `stations` | Nonempty array of station selectors | Match any selector. Omit to include all types. A type can appear once. |
| `stations[].type` | `flood`, `landslide`, `tsunami` | Required in each selector. |
| `stations[].statusCodes` | Nonempty array of status codes for the selected type | Match any listed code. Omit to include all states for that type. |
| `search` | Nonempty string | Case-insensitive substring of the station name. |
| `rainfallMm` | Range object | Rainfall in millimeters. |
| `waterLevelMeters` | Range object | Water level in meters. |
| `groundMovementCm` | Range object | Ground movement in centimeters. |

Each range accepts `min` and `max` as finite numbers. At least one bound is required. Bounds are inclusive and `min` cannot exceed `max`. A missing reading does not match a range. Different filter fields combine with AND.

| Station type | Allowed `statusCodes` |
|---|---|
| `flood` | `telemetry_inactive`, `normal`, `warning`, `maintenance`, `unknown` |
| `landslide` | `telemetry_inactive`, `normal`, `warning`, `maintenance`, `unknown` |
| `tsunami` | `telemetry_inactive`, `normal`, `maintenance`, `unknown` |

`telemetry_inactive` means telemetry is inactive or the station has no telemetry. `normal` means normal and active. `warning` means danger. `maintenance` means under repair.

`unknown` means the source state cannot be interpreted reliably. It does not mean that the station is inactive or safe.

## Server messages

### Snapshot

| Field | Values |
|---|---|
| `type` | `snapshot` |
| `requestId` | UUID from the client request. |
| `fetchedAt` | UTC timestamp in ISO 8601 format. |
| `stations` | Array of matching station objects. An empty array means no match. |

Each snapshot replaces the previous station list.

### Station

| Field | Values |
|---|---|
| `type` | `flood`, `landslide`, or `tsunami` |
| `name` | Station name from the source. |
| `latitude`, `longitude` | Coordinates as numbers. |
| `statusCode` | Status code for the station type. See the table above. |
| `sourceStatus` | Popup status text, or `null`. |
| `sourceIcon` | Source icon name. |
| `sourceUpdatedAt` | Source timestamp text, or `null`. The time zone is not confirmed. |
| `readings` | Object with the fields below. Missing readings are `null`. |

| Reading | Unit |
|---|---|
| `waterLevelMeters` | meters |
| `rainfallMm` | millimeters |
| `groundMovementCm` | centimeters |
| `humidityPercent` | percent |
| `batteryVolts` | volts |
| `sensorBatteryVolts` | volts |
| `hornOhms` | ohms |

### Error

| Field | Values |
|---|---|
| `type` | `error` |
| `requestId` | Valid UUID from the request, when available. |
| `code` | `invalid_message`, `not_subscribed`, `source_fetch_failed`, or `source_parse_failed` |
| `message` | Human-readable error text. |

## Connection rules

- `subscribe` replaces the active filters and fetches a snapshot.
- An invalid subscription leaves the previous subscription active.
- `refresh` fetches a snapshot with the active filters. It requires a subscription.
- The server does not poll the source or send unsolicited updates in this prototype.
