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

  /** Similarity score of the best match. */
  score: number

  /** The face data of the most significant match, if available. */
  mostMatchedFace?: ComparedFace
  response: any
}

/**
 * AWS Rekognition Client wrapper for comparing faces using AWS Rekognition.
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
   * Processes the output from CompareFacesCommand and formats it into a simplified MatchResponse.
   * @param {CompareFacesCommandOutput} response - The raw response from AWS Rekognition CompareFacesCommand.
   * @returns {MatchResponse} - Formatted match result with similarity score and most matched face.
   */
  processResult(response: CompareFacesCommandOutput): MatchResponse {
    console.log(response)
    if (response['FaceMatches'] && response['FaceMatches'].length) {
      const similarityScore = response['FaceMatches'][0].Similarity ?? 0
      return {
        hasMatch: similarityScore > 0,
        score: similarityScore,
        mostMatchedFace: response['FaceMatches'][0]['Face'],
        response,
      }
    } else {
      return {
        hasMatch: false,
        score: 0,
        response,
      }
    }
  }

  /**
   * Compares two faces stored as S3 objects using their object keys.
   * @param {string} sourceReference - Key of the source image in the S3 bucket.
   * @param {string} targetReference - Key of the target image in the S3 bucket.
   * @returns {Promise<MatchResponse>} - Result of face comparison.
   */
  async compareFacesByS3Reference(sourceReference: string, targetReference: string): Promise<MatchResponse> {
    const input: CompareFacesCommandInput = {
      QualityFilter: QualityFilter.HIGH,
      SourceImage: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: sourceReference,
        },
      },
      TargetImage: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: targetReference,
        },
      },
      SimilarityThreshold: this.threshold,
    }

    const rekognitionCommand = new CompareFacesCommand(input)
    const result = await this.rekognitionClient.send(rekognitionCommand)
    return this.processResult(result)
  }

  /**
   * Compares two faces using Base64 image bytes.
   * @param {Uint8Array<ArrayBufferLike>} sourceBytes - Bytes of the source image.
   * @param {Uint8Array<ArrayBufferLike>} referenceBytes - Bytes of the target image.
   * @returns {Promise<MatchResponse>} - Result of face comparison.
   */
  async compareFacesByBytes(
    sourceBytes: Uint8Array<ArrayBufferLike>,
    referenceBytes: Uint8Array<ArrayBufferLike>
  ) {
    const input: CompareFacesCommandInput = {
      QualityFilter: QualityFilter.HIGH,
      SourceImage: {
        Bytes: sourceBytes,
      },
      TargetImage: {
        Bytes: referenceBytes,
      },
      SimilarityThreshold: this.threshold,
    }

    const rekognitionCommand = new CompareFacesCommand(input)
    const result = await this.rekognitionClient.send(rekognitionCommand)
    return this.processResult(result)
  }

  /**
   * Compares a face from an S3 object with a face provided as Base64 bytes.
   * @param {string} sourceReference - Key of the source image in the S3 bucket.
   * @param {Uint8Array<ArrayBufferLike>} referenceBytes - Bytes of the target image.
   * @returns {Promise<MatchResponse>} - Result of face comparison.
   */
  async compareFacesMix(sourceReference: string, referenceBytes: Uint8Array<ArrayBufferLike>) {
    const input: CompareFacesCommandInput = {
      QualityFilter: QualityFilter.HIGH,
      SourceImage: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: sourceReference,
        },
      },
      TargetImage: {
        Bytes: referenceBytes,
      },
      SimilarityThreshold: this.threshold,
    }

    const rekognitionCommand = new CompareFacesCommand(input)
    const result = await this.rekognitionClient.send(rekognitionCommand)
    return this.processResult(result)
  }

  /**
   * Downloads an image from a URL and converts it to Base64.
   * @param {string} url - URL of the image to convert.
   * @returns {Promise<{base64String: string, base64Buffer: Buffer}>} - Base64 string and buffer of the image.
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
