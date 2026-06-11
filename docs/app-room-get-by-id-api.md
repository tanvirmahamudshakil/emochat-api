# App Room Get By ID API

Get a room by its MongoDB `_id` using an app JWT bearer token.

This endpoint returns the room document and populates `owneruserid`.
Inside the populated `owneruserid` user object, nested ids are not populated further.

## Endpoint

- Method: `GET`
- URL: `/app/rooms/:roomId`
- Auth: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

## Example Request

```bash
curl -X GET "https://<your-api-host>/app/rooms/66b1c2f2f1a4a9a1d5e7c111" \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>"
```

## Response

```json
{
  "_id": "66b1c2f2f1a4a9a1d5e7c111",
  "ownerid": "user-sub-from-jwt",
  "seatStyleReferenceId": {
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
  },
  "room_bg": 1,
  "roomType": "audio",
  "roomname": "Demo Room",
  "roombio": "Welcome",
  "roomdp": "https://example.com/room.png",
  "roomid": "room_123456",
  "roomCountryCode": "BD",
  "roomTag": "music",
  "announcementMsg": "Be nice",
  "isSeatLock": false,
  "canVisitorsTakeMic": true,
  "password": null,
  "owneruserid": {
    "_id": "66b1c2f2f1a4a9a1d5e7c999",
    "googleSub": "user-sub-from-jwt",
    "email": "user@gmail.com",
    "emailVerified": true,
    "name": "Demo User",
    "picture": "https://example.com/profile.jpg",
    "audioRoomReferenceId": "66b1c2f2f1a4a9a1d5e7c111",
    "videoRoomReferenceId": null,
    "profile": {
      "name": "Demo User",
      "profileCompleted": true
    }
  },
  "totalGifting": 0,
  "roomReward": 0,
  "entranceFee": 0,
  "roomDynamicBackgroundModel": null,
  "createdAt": "2026-06-06T12:00:00.000Z",
  "updatedAt": "2026-06-06T12:00:00.000Z"
}
```

## Errors

- `400 Bad Request` if `roomId` is not a valid MongoDB `ObjectId`
- `404 Not Found` if no room exists for that `_id`

## Notes

- When a room is created, the backend stores the admin seat style with `styleNumber: 1` into `seatStyleReferenceId`.
- When a room is created, the backend sets `room_bg` to `1` by default.
- In this room details API, `seatStyleReferenceId` is populated to the full seat style object.
