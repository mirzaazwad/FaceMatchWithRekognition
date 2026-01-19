import { AWSRekognitionClient, MatchResponse } from '../src/utils/AWSRekognition'
import axios from 'axios'
import { CompareFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition'

jest.mock('@aws-sdk/client-rekognition')
jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedRekognitionSend = jest.fn()

;(RekognitionClient as jest.Mock).mockImplementation(() => ({
  send: mockedRekognitionSend,
}))

describe('AWSRekognitionClient Class Tests', () => {
  let client: AWSRekognitionClient

  beforeAll(() => {
    client = new AWSRekognitionClient()
  })

  it('processResult should return correct MatchResponse when FaceMatches exist', () => {
    const mockOutput = {
      FaceMatches: [{ Similarity: 99, Face: { FaceId: '123', Confidence: 99 } }],
    } as any

    const result: MatchResponse = client.processResult(mockOutput)
    expect(result.hasMatch).toBe(true)
    expect(result.score).toBe(99)
    expect(result.mostMatchedFace).toEqual({ FaceId: '123', Confidence: 99 })
  })

  it('processResult should return no match when FaceMatches is empty', () => {
    const result: MatchResponse = client.processResult({} as any)
    expect(result.hasMatch).toBe(false)
    expect(result.score).toBe(0)
    expect(result.mostMatchedFace).toBeUndefined()
  })

  it('compareFacesByS3Reference should call AWS and return processed result', async () => {
    mockedRekognitionSend.mockResolvedValueOnce({
      FaceMatches: [{ Similarity: 97, Face: { FaceId: 'abc' } }],
    })

    const result = await client.compareFacesByS3Reference('srcKey', 'targetKey')
    expect(result.hasMatch).toBe(true)
    expect(result.score).toBe(97)
    expect(result.mostMatchedFace).toEqual({ FaceId: 'abc' })
    expect(mockedRekognitionSend).toHaveBeenCalledTimes(1)
    expect(mockedRekognitionSend).toHaveBeenCalledWith(expect.any(CompareFacesCommand))
  })

  it('compareFacesByBytes should call AWS with bytes and return result', async () => {
    mockedRekognitionSend.mockResolvedValueOnce({
      FaceMatches: [{ Similarity: 95, Face: { FaceId: 'bytesFace' } }],
    })

    const source = new Uint8Array([1, 2, 3])
    const target = new Uint8Array([4, 5, 6])
    const result = await client.compareFacesByBytes(source, target)
    expect(result.hasMatch).toBe(true)
    expect(result.score).toBe(95)
    expect(result.mostMatchedFace).toEqual({ FaceId: 'bytesFace' })
  })

  it('compareFacesMix should call AWS with mixed inputs', async () => {
    mockedRekognitionSend.mockResolvedValueOnce({
      FaceMatches: [{ Similarity: 90, Face: { FaceId: 'mixFace' } }],
    })

    const targetBytes = new Uint8Array([10, 20])
    const result = await client.compareFacesMix('srcKey', targetBytes)
    expect(result.hasMatch).toBe(true)
    expect(result.score).toBe(90)
    expect(result.mostMatchedFace).toEqual({ FaceId: 'mixFace' })
  })

  it('convertToBase64 should return correct base64 string and buffer', async () => {
    const fakeData = Buffer.from([1, 2, 3, 4])
    mockedAxios.get.mockResolvedValueOnce({ data: fakeData })

    const { base64String, base64Buffer } = await client.convertToBase64('http://example.com/image.jpg')
    expect(base64String).toBe(Buffer.from(fakeData).toString('base64'))
    expect(base64Buffer).toEqual(Buffer.from(base64String, 'base64'))
  })
})
