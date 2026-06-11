# App Room Create API

Create a new audio or video room using an app JWT bearer token.

This endpoint also updates the authenticated user's root-level room reference:

- `audioRoomReferenceId` for `roomType: "audio"`
- `videoRoomReferenceId` for `roomType: "video"`

The app should send only `roomType`. The backend fills the room name from the authenticated user's profile name.

## Endpoint

- Method: `POST`
- URL: `/app/rooms`
- Auth: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

## Request Body

```json
{
  "roomType": "audio",
  "roombio": "Welcome সবাই",
  "roomdp": "https://example.com/room.png",
  "roomCountryCode": "BD",
  "roomTag": "music",
  "announcementMsg": "Be nice",
  "isSeatLock": false,
  "canVisitorsTakeMic": true,
  "password": "",
  "totalGifting": 0,
  "roomReward": 0,
  "entranceFee": 0,
  "roomDynamicBackgroundModel": null
}
```

Required fields:

- `roomType` (`audio` or `video`)

Field behavior:

- `roomname` is auto-filled from the authenticated user's profile name.
- `canVisitorsTakeMic` defaults to `true` when omitted.
- `isSeatLock` defaults to `false` when omitted.
- `totalGifting`, `roomReward`, and `entranceFee` default to `0` when omitted.
- Empty strings in nullable text fields are stored as `null`.
- `password` is stored as `null` if you send an empty string or omit it.

## Example Request

```bash
curl -X POST "https://<your-api-host>/app/rooms" \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomType": "audio",
    "roombio": "Welcome সবাই",
    "roomdp": "https://example.com/room.png",
    "roomCountryCode": "BD",
    "roomTag": "music",
    "announcementMsg": "Be nice",
    "isSeatLock": false,
    "canVisitorsTakeMic": true,
    "password": "",
    "totalGifting": 0,
    "roomReward": 0,
    "entranceFee": 0,
    "roomDynamicBackgroundModel": null
  }'
```

## Response

```json
{
  "_id": "66b1c2f2f1a4a9a1d5e7c999",
  "ownerid": "user-sub-from-jwt",
  "seatStyleReferenceId": "66b1c2f2f1a4a9a1d5e7d123",
  "room_bg": 1,
  "roomType": "audio",
  "roomname": "User Name From Profile",
  "roombio": "Welcome সবাই",
  "roomdp": "https://example.com/room.png",
  "roomid": "room_...",
  "roomCountryCode": "BD",
  "roomTag": "music",
  "announcementMsg": "Be nice",
  "isSeatLock": false,
  "canVisitorsTakeMic": true,
  "password": null,
  "owneruserid": {
    "googleSub": "user-sub-from-jwt",
    "name": "User Name From Profile",
    "profile": {
      "name": "User Name From Profile",
      "audioRoomReferenceId": "66b1c2f2f1a4a9a1d5e7c999",
      "videoRoomReferenceId": null
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

## Notes

- `ownerid` is set from the authenticated JWT `sub`.
- `owneruserid` stores the authenticated user's MongoDB `ObjectId` and is returned populated as the user object in the response.
- The MongoDB `_id` of the created room is returned as `_id` in the API response.
- `roomname` is taken from the authenticated user's profile name, not from the request body.
- When a new room is created, the backend automatically assigns the admin seat style with `styleNumber: 1`.
- That assigned seat style `_id` is stored in `seatStyleReferenceId`.
- When a new room is created, `room_bg` is automatically set to `1`.
- The MongoDB `_id` is stored in the user's root-level room reference as an actual `ObjectId`, not a string.
- The audio room `_id` is saved in `audioRoomReferenceId`.
- The video room `_id` is saved in `videoRoomReferenceId`.
- `roomid` is generated automatically and stored uniquely in MongoDB.
- To fetch the authenticated user's saved room references later, use `GET /app/rooms/my`.
- To fetch a specific room later by MongoDB `_id`, use `GET /app/rooms/:roomId`.
