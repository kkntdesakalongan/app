# Location input map provider

Design: Approved
Implementation: In progress

## 1. Purpose and scope

Support Google Maps and OpenStreetMap in LocationInput and MultiLocationInput.
Use Leaflet with standard OpenStreetMap tiles and Geoapify autocomplete.
MapView is outside this change.

## 2. Functional requirements

| # | Capability | Users and access | Expected result |
|---|---|---|---|
| 1 | Select provider | Component caller | Google is the default; OpenStreetMap uses standard tiles and Geoapify search |
| 2 | Select coordinates | Form user | Search, map click, marker drag, and device location set coordinates |
| 3 | Clear coordinates | Form user | Value becomes null |

## 3. Data and business rules

| Field | Meaning | Rules |
|---|---|---|
| mapProvider | Map and search provider | google or openstreetmap; default google |
| VITE_GEOAPIFY_API_KEY | Public browser key | Required for Geoapify search only; restrict domains at Geoapify |
| Model | Selected position | Coordinate or null; multi input holds coordinates |

## 4. User journeys and workflows

1. The caller sets the provider.
2. The input loads its map configuration.
3. The user searches or selects a position on the map.
4. The input emits coordinates without provider metadata.

A failed search shows an error and preserves the selected coordinates.
Changing provider cancels pending provider reads and preserves the position.
