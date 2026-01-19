require('dotenv').config()

import {
  RekognitionClient,
  CompareFacesCommand,
  QualityFilter,
  CompareFacesCommandInput,
} from '@aws-sdk/client-rekognition'
export const matchFace = async (referenceImage: any, sourceImage: any) => {
  let config = {
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }

  const input: CompareFacesCommandInput = {
    QualityFilter: QualityFilter.HIGH,
    SourceImage: {
      S3Object: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Name: sourceImage,
      },
    },
    TargetImage: {
      S3Object: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Name: referenceImage,
      },
    },
    SimilarityThreshold: 98,
  }

  const rekognitionClient = new RekognitionClient(config)
  const rekognitionCommand = new CompareFacesCommand(input)
  const result = await rekognitionClient.send(rekognitionCommand)

  return result
}
