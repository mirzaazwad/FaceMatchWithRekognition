import express from 'express'
import bodyParser from 'body-parser'
import { matchFace } from './utils/faceMatch'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { AWSRekognitionClient } from './utils/AWSRekognition'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Face Matching API',
      version: '1.0.0',
      description: 'API to match two faces using images',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/app.ts'],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

/**
 * @swagger
 * /raw:
 *   post:
 *     summary: Match two face images
 *     description: Compares a reference image with a source image and returns a similarity score.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referenceImage:
 *                 type: string
 *                 description: Base64 or URL of the reference image
 *               srcImage:
 *                 type: string
 *                 description: Base64 or URL of the source image
 *             required:
 *               - referenceImage
 *               - srcImage
 *     responses:
 *       200:
 *         description: Successful face match
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 similarity:
 *                   type: number
 *                   description: Similarity score between images
 *       500:
 *         description: Internal server error
 */
app.post('/raw', async (req, res) => {
  try {
    const response = await matchFace(req.body.referenceImage, req.body.srcImage)
    return res.status(200).json({
      hasMatch: (response['FaceMatches']?.length ?? 0) > 0,
      score:
        response['FaceMatches'] && (response['FaceMatches']?.length ?? 0) > 0
          ? response['FaceMatches'][0]['Similarity']
          : 0,
      mostSignificantMatch:
        response['FaceMatches'] && (response['FaceMatches']?.length ?? 0)
          ? response['FaceMatches'][0]['Face']
          : {},
    })
  } catch (err) {
    console.error((err as Error).message)
    return res.status(500).json({ error: (err as Error).message })
  }
})

/**
 * @swagger
 * /combined:
 *   post:
 *     summary: Compare faces using multiple methods
 *     description: >
 *       Accepts two image URLs and performs three types of face comparison:
 *       1. Using S3 object references
 *       2. Using Base64 bytes
 *       3. A mixed approach combining URL + bytes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               srcImageUrl:
 *                 type: string
 *                 description: URL of the source image
 *               targetImageUrl:
 *                 type: string
 *                 description: URL of the target image
 *             required:
 *               - srcImageUrl
 *               - targetImageUrl
 *     responses:
 *       200:
 *         description: Face comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 s3ReferenceResponse:
 *                   type: object
 *                   description: Result from comparing faces using S3 object references
 *                 bytesResponse:
 *                   type: object
 *                   description: Result from comparing faces using Base64 bytes
 *                 mixResponse:
 *                   type: object
 *                   description: Result from the mixed comparison method
 *       500:
 *         description: Internal server error
 */

app.post('/combined', async (req, res) => {
  try {
    const srcImageUrl = req.body.srcImageUrl
    const targetImageUrl = req.body.targetImageUrl
    const sourceReference = srcImageUrl.split('.com/')[1]
    const targetReference = targetImageUrl.split('.com/')[1]
    console.log('Source', sourceReference)
    console.log('Target', targetReference)

    const rekognitionService = new AWSRekognitionClient(98)
    const sourceBytes = (await rekognitionService.convertToBase64(srcImageUrl)).base64Buffer
    const targetBytes = (await rekognitionService.convertToBase64(targetImageUrl)).base64Buffer
    const s3ReferenceResponse = await rekognitionService.compareFacesByS3Reference(
      sourceReference,
      targetReference
    )
    const bytesResponse = await rekognitionService.compareFacesByBytes(sourceBytes, targetBytes)
    const mixResponse = await rekognitionService.compareFacesMix(sourceReference, targetBytes)
    return res.status(200).json({
      shouldGive: s3ReferenceResponse.score > 99,
      s3ReferenceResponse,
      bytesResponse,
      mixResponse,
    })
  } catch (err) {
    console.error((err as Error).message)
    return res.status(500).json({ error: (err as Error).message })
  }
})

export default app
