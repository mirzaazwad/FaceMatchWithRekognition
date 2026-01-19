import supertest from 'supertest'
import { HttpServer } from '../src/app'

describe('Face Match API Tests', () => {
  beforeAll(async () => {})

  afterAll(async () => {
    HttpServer.close()
  })

  it('POST API Test for Face Match RAW', async () => {
    const urls = process.env.SAMPLE_IMAGE_URLS?.split(',') ?? []
    if (urls.length < 2) {
      throw new Error(`Please check environment variables for sample images`)
    }
    const faceMatchResponse = await supertest(HttpServer)
      .post('/raw')
      .send({
        srcImage: urls[0].split('.com/')[1],
        referenceImage: urls[1].split('.com/')[1],
      })

    expect(faceMatchResponse.statusCode).toBe(200)
    expect(faceMatchResponse.body).toHaveProperty('hasMatch')
    expect(faceMatchResponse.body).toHaveProperty('score')
    expect(faceMatchResponse.body).toHaveProperty('mostSignificantMatch')
  })

  it('POST: API Test for Face Match Combined', async () => {
    const urls = process.env.SAMPLE_IMAGE_URLS?.split(',') ?? []
    if (urls.length < 2) {
      throw new Error(`Please check environment variables for sample images`)
    }
    const faceMatchResponse = await supertest(HttpServer).post('/combined').send({
      srcImageUrl: urls[0],
      targetImageUrl: urls[1],
    })

    expect(faceMatchResponse.statusCode).toBe(200)
    expect(faceMatchResponse.body).toHaveProperty('s3ReferenceResponse')
    expect(faceMatchResponse.body).toHaveProperty('bytesResponse')
    expect(faceMatchResponse.body).toHaveProperty('mixResponse')
  })
})
