import {
  ComparedFace,
  CompareFacesCommand,
  CompareFacesCommandInput,
  CompareFacesCommandOutput,
  QualityFilter,
  RekognitionClient,
  RekognitionClientConfig,
} from '@aws-sdk/client-rekognition'
import axios from 'axios'

/**
 * Represents the result of a face comparison.
 */
export type MatchResponse = {
  /** Indicates if a matching face was found. */
  hasMatch: boolean

  /** Similarity score of the best match (0-100). */
  score: number

  /** The face data of the most significant match, if available. */
  mostMatchedFace?: ComparedFace

  /** The raw response returned by AWS Rekognition. */
  rawResponse: CompareFacesCommandOutput
}

/**
 * AWS Rekognition Client wrapper for comparing faces.
 *
 * This class simplifies using AWS Rekognition's face comparison features.
 * It supports comparing images from:
 * - S3 object references
 * - Base64/byte arrays
 * - A combination of S3 + bytes
 *
 * @example
 * ```ts
 * const client = new AWSRekognitionClient(80) // Threshold 80%
 * const result = await client.compareFacesByS3Reference('source.jpg', 'target.jpg')
 * console.log(result.hasMatch, result.score)
 * ```
 */
export class AWSRekognitionClient {
  /**
   * AWS Rekognition client configuration object.
   * @type {RekognitionClientConfig}
   * @private
   */
  private readonly rekognitionConfiguration: RekognitionClientConfig

  /**
   * AWS Rekognition client instance.
   * @type {RekognitionClient}
   * @private
   */
  private readonly rekognitionClient: RekognitionClient

  /**
   * Creates an AWSRekognitionClient instance.
   *
   * @param {number} threshold - Similarity threshold for matching faces (0-100).
   *                            Only faces with similarity above this threshold
   *                            will be considered a match.
   */
  constructor(private threshold: number) {
    this.rekognitionConfiguration = {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }
    this.rekognitionClient = new RekognitionClient(this.rekognitionConfiguration)
  }

  /**
   * Processes the raw AWS Rekognition CompareFacesCommand response
   * and returns a simplified MatchResponse.
   *
   * @param {CompareFacesCommandOutput} response - Raw AWS Rekognition response
   * @returns {MatchResponse} Simplified match result including similarity score,
   *                          the most matched face, and the raw response.
   */
  processResult(response: CompareFacesCommandOutput): MatchResponse {
    console.log(response)
    if (response['FaceMatches'] && response['FaceMatches'].length) {
      const similarityScore = response['FaceMatches'][0].Similarity ?? 0
      return {
        hasMatch: similarityScore > 0,
        score: similarityScore,
        mostMatchedFace: response['FaceMatches'][0]['Face'],
        rawResponse: response,
      }
    } else {
      return {
        hasMatch: false,
        score: 0,
        rawResponse: response,
      }
    }
  }

  /**
   * Compares two faces stored in S3 using their object keys.
   *
   * @param {string} sourceReference - S3 key of the source image.
   * @param {string} targetReference - S3 key of the target image.
   * @returns {Promise<MatchResponse>} Result of the comparison.
   */
  async compareFacesByS3Reference(sourceReference: string, targetReference: string): Promise<MatchResponse> {
    const input: CompareFacesCommandInput = {
      QualityFilter: QualityFilter.HIGH,
      SourceImage: { S3Object: { Bucket: process.env.AWS_BUCKET_NAME, Name: sourceReference } },
      TargetImage: { S3Object: { Bucket: process.env.AWS_BUCKET_NAME, Name: targetReference } },
      SimilarityThreshold: this.threshold,
    }

    const rekognitionCommand = new CompareFacesCommand(input)
    const result = await this.rekognitionClient.send(rekognitionCommand)
    return this.processResult(result)
  }

  /**
   * Compares two faces using their byte arrays.
   *
   * @param {Uint8Array<ArrayBufferLike>} sourceBytes - Source image bytes.
   * @param {Uint8Array<ArrayBufferLike>} referenceBytes - Target image bytes.
   * @returns {Promise<MatchResponse>} Result of the comparison.
   */
  async compareFacesByBytes(
    sourceBytes: Uint8Array<ArrayBufferLike>,
    referenceBytes: Uint8Array<ArrayBufferLike>
  ) {
    const input: CompareFacesCommandInput = {
      QualityFilter: QualityFilter.HIGH,
      SourceImage: { Bytes: sourceBytes },
      TargetImage: { Bytes: referenceBytes },
      SimilarityThreshold: this.threshold,
    }

    const rekognitionCommand = new CompareFacesCommand(input)
    const result = await this.rekognitionClient.send(rekognitionCommand)
    return this.processResult(result)
  }

  /**
   * Compares a face in S3 with a face provided as byte array.
   *
   * @param {string} sourceReference - S3 key of the source image.
   * @param {Uint8Array<ArrayBufferLike>} referenceBytes - Target image bytes.
   * @returns {Promise<MatchResponse>} Result of the comparison.
   */
  async compareFacesMix(sourceReference: string, referenceBytes: Uint8Array<ArrayBufferLike>) {
    const input: CompareFacesCommandInput = {
      QualityFilter: QualityFilter.HIGH,
      SourceImage: { S3Object: { Bucket: process.env.AWS_BUCKET_NAME, Name: sourceReference } },
      TargetImage: { Bytes: referenceBytes },
      SimilarityThreshold: this.threshold,
    }

    const rekognitionCommand = new CompareFacesCommand(input)
    const result = await this.rekognitionClient.send(rekognitionCommand)
    return this.processResult(result)
  }

  /**
   * Downloads an image from a URL and converts it to Base64.
   *
   * @param {string} url - URL of the image to download.
   * @returns {Promise<{base64String: string, base64Buffer: Buffer}>}
   *          Base64 string and buffer of the image.
   */
  async convertToBase64(url: string) {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    const stringifiedBase64 = Buffer.from(response.data, 'binary').toString('base64')
    const base64Buffer = Buffer.from(stringifiedBase64, 'base64')
    return {
      base64String: stringifiedBase64,
      base64Buffer,
    }
  }
}
