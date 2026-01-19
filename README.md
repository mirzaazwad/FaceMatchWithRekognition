# Face Matching API

A Node.js API using **AWS Rekognition** to compare and match faces in images. It supports multiple comparison methods, including S3 references, Base64 image data, and mixed approaches.

---

## Table of Contents

1. [Installation](#installation)
2. [Scripts](#scripts)
3. [Environment Setup](#environment-setup)
4. [Testing](#testing)
5. [Building and Deployment](#building-and-deployment)
6. [API Endpoints](#api-endpoints)
   - [POST /raw](#post-raw)
   - [POST /combined](#post-combined)

7. [AWS Rekognition Client](#aws-rekognition-client)
8. [Face Matching Utility](#face-matching-utility)
9. [Swagger Documentation](#swagger-documentation)
10. [Architecture](#architecture)

---

## Installation

```bash
git clone <repository-url>
cd <project-directory>
npm install
npm run dev
```

This will start the server on **[http://localhost:3000](http://localhost:3000)**.

---

## Scripts

The following npm scripts are available in `package.json`:

- `npm run dev`: Starts the development server with hot-reloading using `ts-node-dev`.
- `npm test`: Runs the test suite using `jest`.
- `npm run build`: Compiles the TypeScript code to JavaScript using `tsc`.
- `npm start`: Starts the application in production mode using `pm2-runtime`.

---

## Environment Setup

Create a `.env` file in the root of the project:

```env
AWS_REGION=<your-aws-region>
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_BUCKET_NAME=<your-s3-bucket-name>
PORT=3000
SAMPLE_IMAGE_URLS=[s3 bucket url1],[s3 bucket url2]
```

Make sure the AWS credentials have access to **Rekognition** and the S3 bucket where images are stored.

---

## Testing

To run the tests, execute the following command:

```bash
npm test
```

This project uses **Jest** for testing. The tests are located in the `tests/` directory:

- `api.test.ts`: Integration tests for API endpoints.
- `unit.test.ts`: Unit tests for helper functions and logic.

The test command runs with `--detectOpenHandles` to identify any asynchronous operations that might prevent Jest from exiting.

## Building and Deployment

### Build

To build the application for production, run:

```bash
npm run build
```

This will compile the TypeScript source code into the `dist` (or configured output) directory based on `tsconfig.build.json`.

### Start

To start the application in a production environment:

```bash
npm start
```

This command uses **PM2** (`pm2-runtime`) to manage the process, using the configuration defined in `ecosystem.config.js`. Ensure you have built the project before starting it in production.

---

## API Endpoints

### POST `/raw`

Compare two images in S3 and get a similarity score.

**Request Body:**

```json
{
  "referenceImage": "<reference-image-file-name-in-S3>",
  "srcImage": "<source-image-file-name-in-S3>"
}
```

**Response:**

```json
{
  "hasMatch": true,
  "score": 99.5,
  "mostSignificantMatch": {
    "BoundingBox": {...},
    "Confidence": 99.9
  }
}
```

**Error Response:**

```json
{
  "error": "Internal server error"
}
```

**Description:**
Uses AWS Rekognition to compare two faces from S3 objects and returns whether a match exists, the similarity score, and the most significant face match.

---

### POST `/combined`

Compare two faces using multiple methods:

1. Using S3 references
2. Using Base64 image bytes
3. Using a mixed approach (S3 + Base64)

**Request Body:**

```json
{
  "srcImageUrl": "<source-image-url>",
  "targetImageUrl": "<target-image-url>"
}
```

**Response:**

```json
{
  "s3ReferenceResponse": {...},
  "bytesResponse": {...},
  "mixResponse": {...}
}
```

**Error Response:**

```json
{
  "error": "Internal server error"
}
```

**Description:**
Downloads images from URLs, converts them to Base64 if needed, and runs three types of AWS Rekognition face comparisons. Useful for testing different matching approaches.

---

## AWS Rekognition Client

The `AWSRekognitionClient` class wraps AWS Rekognition methods:

- **compareFacesByS3Reference(sourceReference, targetReference)**
  Compare faces stored in S3.

- **compareFacesByBytes(sourceBytes, targetBytes)**
  Compare faces using Base64/byte arrays.

- **compareFacesMix(sourceReference, referenceBytes)**
  Mixed approach: S3 object for source, byte array for target.

- **convertToBase64(url)**
  Converts an image URL to Base64 for Rekognition.

**Usage Example:**

```ts
const rekognitionService = new AWSRekognitionClient()
const result = await rekognitionService.compareFacesByS3Reference('src.jpg', 'target.jpg')
console.log(result)
```

---

## Face Matching Utility

The `matchFace` function is a simple wrapper for AWS Rekognition **CompareFacesCommand**:

```ts
const result = await matchFace('reference.jpg', 'source.jpg')
```

**Returns:**
AWS Rekognition output including `FaceMatches` and similarity scores.

---

## Swagger Documentation

The project includes **Swagger UI** for interactive API documentation:

- URL: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

It documents:

- `POST /raw` – Single face comparison
- `POST /combined` – Multi-method face comparison

---

## Architecture

```mermaid
    flowchart TD
        A[Client] -->|POST /raw| B[API Server: /raw Endpoint]
        B --> C[matchFace Function]
        C --> D[AWS Rekognition: CompareFacesCommand]
        D --> E[Response: FaceMatches]
        E --> F[API Server formats response]
        F --> A[Client receives similarity & match info]

        %% Combined Endpoint
        A2[Client] -->|POST /combined| B2[API Server: /combined Endpoint]
        B2 --> C2[Download Images from URLs]
        C2 --> D2[Convert Images to Base64 Bytes]
        D2 --> E2[Initialize AWSRekognitionClient]
        E2 --> F2["Compare Faces by S3 Reference"]
        E2 --> G2["Compare Faces by Bytes"]
        E2 --> H2["Compare Faces Mix (S3 + Bytes)"]
        F2 --> I2[Format Response]
        G2 --> I2
        H2 --> I2
        I2 --> B2[Send aggregated response to Client]
```

## Notes

- Similarity threshold is set to **98%** by default.
- Quality filter is **HIGH** for more accurate matches.
- Ensure images are accessible in the S3 bucket or via URL for the mix API.
- Logging is added to help debug S3 references and Base64 conversions.
