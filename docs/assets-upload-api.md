# Assets Upload API

## Endpoint 1: Upload
- **Method:** `POST`
- **URL:** `/assets/upload`
- **Content-Type:** `multipart/form-data`

## ????????
`category` ??????? dynamic folder create ??? `.svga` file save ????

## Form Data Fields
- `category` (string, required): ???? `headware`
- `file` (file, required): ????????? `.svga`

## Behavior
- `assets/<category>/` folder ?? ????? auto-create ???
- uploaded file original name ?? store ???

## Validation
- `category` ?? ?????: `400 Bad Request` (`category is required`)
- invalid `category` ???: `400 Bad Request` (`Invalid category value`)
- file ?? ?????: `400 Bad Request` (`File is required`)
- `.svga` ?? ???: `400 Bad Request` (`Only .svga files are allowed`)

## Endpoint 2: Category Assets List
- **Method:** `GET`
- **URL:** `/assets/by-category/:category`

## Endpoint 3: All Categories Assets List
- **Method:** `GET`
- **URL:** `/assets/all`

## Endpoint 4: Profile Assets Info (Size + Progress)
- **Method:** `GET`
- **URL:** `/assets/profile-info`

## ????????
`assets/`-er bhitore thaka sob top-level category and tar nested folder/file gula recursive vabe scan hoye size info return hoy. Client side theke download percentage calculate korar jonno eta use korte parbe.

## Response Fields
- `totalAssets`: total file count
- `totalDownloadSizeBytes`: ?? assets ?????? ??? bytes
- `totalDownloadSizeMB`: ?? assets ?????? ??? MB
- `categories[]`: category-wise data
- `categories[].assets[]`: per-asset size data
- `cumulativeProgressPercent`: sequential download progress ??????? ???? ready percentage

## Example Response (short)
```json
{
  "totalAssets": 3,
  "totalDownloadSizeBytes": 15728640,
  "totalDownloadSizeMB": 15,
  "categories": [
    {
      "category": "headware",
      "totalAssets": 2,
      "totalSizeBytes": 10485760,
      "totalSizeMB": 10,
      "assets": [
        {
          "fileName": "h1.svga",
          "path": "assets/headware/h1.svga",
          "sizeBytes": 5242880,
          "sizeMB": 5,
          "cumulativeDownloadedBytes": 5242880,
          "cumulativeProgressPercent": 33.33
        }
      ]
    }
  ]
}
```

## Client Progress Formula
- Real-time download ? progress ??????:
- `progressPercent = (downloadedBytes / totalDownloadSizeBytes) * 100`

## Related Source
- `src/assets/assets.controller.ts`
- `src/assets/assets.service.ts`
