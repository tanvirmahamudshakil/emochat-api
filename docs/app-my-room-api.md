# App My Room API

Get the authenticated user's current audio and video room references using an app JWT bearer token.

This endpoint reads the user's root-level room references and returns the corresponding room documents as populated room objects.
The room objects are not nested-populated further.

## Endpoint

- Method: `GET`
- URL: `/app/rooms/my`
- Auth: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

## Example Request

```bash
curl -X GET "https://<your-api-host>/app/rooms/my" \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>"
```

## Response

```json
{
  "audioRoomReferenceId": {
    "_id": "66b1c2f2f1a4a9a1d5e7c111",
    "ownerid": "user-sub-from-jwt",
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
  },
  "videoRoomReferenceId": null
}
```

## Notes

- If the user has no saved audio or video room reference, that field returns `null`.
- `audioRoomReferenceId` and `videoRoomReferenceId` are populated to room documents.
- Inside each room object, `owneruserid` is populated to the user document.
- Inside that populated `owneruserid` user object, room references and other ids stay unpopulated.
