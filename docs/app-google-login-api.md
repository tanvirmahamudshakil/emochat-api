# App Google Login API

## Endpoint
- Method: `POST`
- URL: `/app/auth/google-login`
- Content-Type: `application/json`

## Request Body
```json
{
  "token": "GOOGLE_ID_TOKEN",
  "androidDeviceId": "android-12345",
  "ip": "103.10.10.20",
  "country": "Bangladesh"
}
```

## Behavior
- Verifies the Google ID token using Google `tokeninfo` endpoint.
- Optionally validates token audience (`aud`) against `GOOGLE_CLIENT_ID` if configured.
- Uses Google `sub` as `googleSub` to find user in MongoDB.
- Creates a new user if not found, otherwise updates existing user profile/login metadata.
- Stores and updates `androidDeviceId`, `ip`, `country`, and `lastLoginAt`.
- Returns an app-specific JWT access token (`Bearer`) for accessing protected APIs.

## Environment Variables
- `MONGODB_URI` (required)
- `MONGODB_DB` (optional, defaults to `EMOCHAT`)
- `MONGODB_DB` (optional, default: `emochat`)
- `GOOGLE_CLIENT_ID` (optional but recommended, enables audience check)
- `APP_JWT_SECRET` (required in production; used to sign access tokens)
- `APP_JWT_EXPIRES_SECONDS` (optional, default: `604800` = 7 days)

## Example Success Response
```json
{
  "isNewUser": false,
  "message": "User logged in",
  "tokenType": "Bearer",
  "accessToken": "<JWT_ACCESS_TOKEN>",
  "user": {
    "googleSub": "117200001234567890123",
    "email": "user@gmail.com",
    "emailVerified": true,
    "name": "Demo User",
    "picture": "https://lh3.googleusercontent.com/...",
    "androidDeviceId": "android-12345",
    "ip": "103.10.10.20",
    "country": "Bangladesh",
    "createdAt": "2026-05-22T10:00:00.000Z",
    "updatedAt": "2026-05-22T10:30:00.000Z",
    "lastLoginAt": "2026-05-22T10:30:00.000Z"
  }
}
```

## How To Use The Token
- Add this HTTP header for protected APIs:
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- After login, call `GET /app/auth/profile` to fetch profile state.
- If `profile.profileCompleted` is `false`, call `POST /app/auth/profile/complete` to finish the profile.
- If your app uploads `profilePic` or `coverPic`, send them as base64/data URL strings in the profile complete API.

## Related Profile API
- `docs/app-profile-api.md`

## Mongo Collection
- Database: `MONGODB_DB` (or `emochat`)
- Collection: `app_users`
- Indexes: `googleSub` (unique), `email`

## Connection Notes
- MongoDB connection is initialized lazily on first login request.
- Connection/collection is cached and reused for later requests.
- Concurrent first-time requests share one in-flight connection promise (no duplicate connects).
