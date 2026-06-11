# App Profile API

This document shows how the app should use the profile-related APIs after login.

## Flow
1. User logs in with Google.
2. Backend returns an app JWT access token.
3. App stores the token securely.
4. App calls profile APIs with:
   - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
5. For image fields, app can send either:
   - a public image URL
   - a base64/data URL string like `data:image/jpeg;base64,...`

## 1) Complete Profile

- Method: `POST`
- URL: `/app/auth/profile/complete`
- Content-Type: `application/json`

### Required Header
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Request Body
All fields are optional. Send only the fields you want to add or update.
`profilePic` and `coverPic` can be sent as base64/data URLs from the app.

```json
{
  "coverPic": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "profilePic": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "name": "Demo User",
  "dateOfBirth": "1998-01-01",
  "country": "Bangladesh",
  "language": "Bangla"
}
```

### Behavior
- If a field already exists, it will be updated.
- If a field does not exist, it will be added.
- After success, `profile.profileCompleted` becomes `true`.
- The API also updates the main user `name` and `picture` fields when relevant.
- The image strings are stored as-is in MongoDB, so the app should send the full base64/data URL if it wants to keep the image inside the profile document.

### Example Success Response
```json
{
  "message": "Profile completed successfully",
  "profileCompleted": true,
  "user": {
    "googleSub": "117200001234567890123",
    "email": "user@gmail.com",
    "emailVerified": true,
    "name": "Demo User",
    "picture": "https://example.com/profile.jpg",
    "profile": {
      "coverPic": "https://example.com/cover.jpg",
      "profilePic": "https://example.com/profile.jpg",
      "name": "Demo User",
      "dateOfBirth": "1998-01-01",
      "country": "Bangladesh",
      "language": "Bangla",
      "profileCompleted": true,
      "updatedAt": "2026-06-05T10:30:00.000Z"
    },
    "androidDeviceId": "android-12345",
    "ip": "103.10.10.20",
    "country": "Bangladesh",
    "audioRoomReferenceId": {
      "_id": "66b1c2f2f1a4a9a1d5e7c111",
      "roomType": "audio",
      "roomname": "Demo Room",
      "owneruserid": "66b1c2f2f1a4a9a1d5e7c999"
    },
    "videoRoomReferenceId": {
      "_id": "66b1c2f2f1a4a9a1d5e7c222",
      "roomType": "video",
      "roomname": "Demo Video Room",
      "owneruserid": "66b1c2f2f1a4a9a1d5e7c999"
    },
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:30:00.000Z",
    "lastLoginAt": "2026-06-05T10:10:00.000Z"
  }
}
```

## 2) Get Profile

- Method: `GET`
- URL: `/app/auth/profile`

### Required Header
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Behavior
- Returns the current logged-in user's profile data.
- Uses the JWT token to identify the user.

### Example Success Response
```json
{
  "user": {
    "googleSub": "117200001234567890123",
    "email": "user@gmail.com",
    "emailVerified": true,
    "name": "Demo User",
    "picture": "https://example.com/profile.jpg",
    "profile": {
      "coverPic": "https://example.com/cover.jpg",
      "profilePic": "https://example.com/profile.jpg",
      "name": "Demo User",
      "dateOfBirth": "1998-01-01",
      "country": "Bangladesh",
      "language": "Bangla",
      "profileCompleted": true,
      "updatedAt": "2026-06-05T10:30:00.000Z"
    },
    "androidDeviceId": "android-12345",
    "ip": "103.10.10.20",
    "country": "Bangladesh",
    "audioRoomReferenceId": {
      "_id": "66b1c2f2f1a4a9a1d5e7c111",
      "roomType": "audio",
      "roomname": "Demo Room",
      "owneruserid": "66b1c2f2f1a4a9a1d5e7c999"
    },
    "videoRoomReferenceId": {
      "_id": "66b1c2f2f1a4a9a1d5e7c222",
      "roomType": "video",
      "roomname": "Demo Video Room",
      "owneruserid": "66b1c2f2f1a4a9a1d5e7c999"
    },
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:30:00.000Z",
    "lastLoginAt": "2026-06-05T10:10:00.000Z"
  }
}
```

## App Usage Notes
- Save the `accessToken` from `/app/auth/google-login`.
- Send the token in `Authorization` header for every protected profile request.
- Call `/app/auth/profile` on app start to check whether `profile.profileCompleted` is `true`.
- If `profile.profileCompleted` is `false`, show the profile completion screen.
- `audioRoomReferenceId` and `videoRoomReferenceId` are top-level fields in the `user` response, not inside `profile`.
- Those two fields are populated room objects, not raw id strings.
- Inside those room objects, referenced ids such as `owneruserid` are not populated further.

## Related Files
- `src/app-auth/app-auth.controller.ts`
- `src/app-auth/app-auth.service.ts`
- `src/app-auth/jwt-bearer-auth.guard.ts`
