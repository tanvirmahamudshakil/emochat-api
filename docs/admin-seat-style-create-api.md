# Admin Seat Style Create API

Create a seat style from the admin side.

This API is not for the app client. It stores a global seat style configuration that can be reused later.

## Endpoint

- Method: `POST`
- URL: `/admin/rooms/seat-styles`

## Request Body

```json
{
  "styleNumber": 1,
  "totalSeats": 8,
  "seatImagePath": "https://example.com/seats/seat-1.png",
  "hostEnable": true,
  "hostSeatPath": "https://example.com/seats/host-seat-1.png",
  "free": false,
  "price": 100
}
```

## Field Rules

- `styleNumber` is required and must be a non-negative integer.
- `totalSeats` is required and must be a positive integer.
- `seatImagePath` is required and must be a non-empty string.
- `hostEnable` is required and must be `true` or `false`.
- `hostSeatPath` is optional. Empty string is stored as `null`.
- `free` is required and must be `true` or `false`.
- `price` is required and must be a non-negative number.
- Duplicate `styleNumber` is not allowed.

## Example Request

```bash
curl -X POST "https://<your-api-host>/admin/rooms/seat-styles" \
  -H "Content-Type: application/json" \
  -d '{
    "styleNumber": 1,
    "totalSeats": 8,
    "seatImagePath": "https://example.com/seats/seat-1.png",
    "hostEnable": true,
    "hostSeatPath": "https://example.com/seats/host-seat-1.png",
    "free": false,
    "price": 100
  }'
```

## Response

```json
{
  "_id": "66b1c2f2f1a4a9a1d5e7d123",
  "styleNumber": 1,
  "totalSeats": 8,
  "seatImagePath": "https://example.com/seats/seat-1.png",
  "hostEnable": true,
  "hostSeatPath": "https://example.com/seats/host-seat-1.png",
  "free": false,
  "price": 100,
  "createdAt": "2026-06-06T12:00:00.000Z",
  "updatedAt": "2026-06-06T12:00:00.000Z"
}
```

## Errors

- `400 Bad Request` if any required field is missing or invalid
- `409 Conflict` if the same `styleNumber` already exists

## Notes

- This endpoint is under `admin` namespace and is intended for admin usage only.
- There is currently no separate admin auth module in this codebase, so this route is only namespaced as admin at the API level.
- New room creation uses the seat style with `styleNumber: 1` as the default room seat style.
