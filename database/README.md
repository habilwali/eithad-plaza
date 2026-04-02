# Hotel TV — CMS database

SQL for the PHP/CMS server that backs **alerts** and **messages** on the Android TV app (not the React Native app itself).

## Apply schema

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < hotel_cms_schema.sql
```

## What each table is for

| Table | Purpose |
|--------|--------|
| `cms_emergency_alert` | **One row** (`id = 1`): current fullscreen emergency alert. TV reads this via `?api=alert`. |
| `cms_notifications` | Rows = guest messages; TV reads list via `?api=notifications`. |
| `cms_emergency_alert_log` | Optional history when staff trigger/dismiss alerts. |
| `cms_notification_reads` | Optional per-room read state (needs API + `room_code` from TV). |
| `cms_facilities` | Facilities for the TV **Etihad Facilities** screen (read via `api/get_guest_facilities.php`). |

## `GET /api/get_guest_facilities.php?mac=…`

TV calls this with the device **MAC** (optional but recommended). Response:

```json
{
  "success": true,
  "mac": "AA:BB:…",
  "facilities": [
    {
      "id": "gym",
      "label": "Gym",
      "name": "Gym",
      "desc": "…",
      "phone": "02 511 5100",
      "img": "https://…/image.jpg",
      "hours": [["Monday","6AM – 11PM"],["Tuesday","6AM – 11PM"]]
    }
  ]
}
```

Deploy `database/api/get_guest_facilities.php` and create/populate `cms_facilities` (see `hotel_cms_schema.sql`).

## JSON your `index.php` should return

### `GET index.php?api=alert`

Flat object (nested `{ "data": { ... } }` is also fine; the app merges it):

```json
{
  "type": "EMERGENCY_ALERT",
  "active": true,
  "id": "alert_1774260860_386",
  "title": "Fire drill",
  "message": "Please use stairs.",
  "severity": "warning",
  "ctaLabel": "",
  "ctaUrl": "",
  "autoDismissMs": null,
  "triggeredAt": "2026-03-23T11:14:20+01:00"
}
```

Dismiss / no alert:

```json
{
  "type": "DISMISS",
  "active": false
}
```

Map DB columns → JSON: `alert_type` → `type`, `cta_label` → `ctaLabel`, `cta_url` → `ctaUrl`, `triggered_at` → `triggeredAt` (ISO string).

### `GET index.php?api=notifications`

Either a **JSON array** or an object with a list:

```json
[
  {
    "id": "msg_001",
    "title": "Housekeeping",
    "message": "Your room will be serviced at 2pm.",
    "createdAt": "2026-03-23T10:00:00Z",
    "seen": false
  }
]
```

DB mapping: `created_at` → `createdAt` (ISO), `seen` as boolean.

## WebSocket (`ws://host:8765`)

Your broadcaster should send **one JSON string per event**, same shapes as above for alerts, and for messages e.g.:

```json
{
  "type": "NOTIFICATION",
  "data": {
    "id": "msg_002",
    "title": "Welcome",
    "message": "Enjoy your stay.",
    "createdAt": "2026-03-23T12:00:00Z"
  }
}
```

The TV app uses **one shared WebSocket** for both alerts and notifications; it routes by `type`.

## PHP sketch (pseudo)

- **Trigger alert:** `UPDATE cms_emergency_alert SET active=1, title=?, message=?, severity=?, triggered_at=NOW() WHERE id=1` then push JSON on WebSocket.
- **Dismiss:** `UPDATE cms_emergency_alert SET active=0, title='', message=''` + WS `DISMISS`.
- **New message:** `INSERT INTO cms_notifications ...` + WS `NOTIFICATION`.

Adapt table/column names to match your existing CMS if you already have tables.
