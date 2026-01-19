import supertest from 'supertest'
import { IncomingMessage, Server, ServerResponse } from 'node:http'
import app from '../src/app'

describe('Face Match API Tests', () => {
  let server: Server<typeof IncomingMessage, typeof ServerResponse>

  beforeAll(async () => {
    server = app.listen(process.env.PORT, () => {
      console.log('Test Server is Running')
    })
  })

  afterAll(async () => {
    server.close()
  })

  it('POST API Test for Face Match RAW', async () => {
    const urls = process.env.SAMPLE_IMAGE_URLS?.split(',') ?? []
    if (urls.length < 2) {
      throw new Error(`Please check environment variables for sample images`)
    }
    const faceMatchResponse = await supertest(server)
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
    const faceMatchResponse = await supertest(server).post('/combined').send({
      srcImageUrl: urls[0],
      targetImageUrl: urls[1],
    })

    expect(faceMatchResponse.statusCode).toBe(200)
    expect(faceMatchResponse.body).toHaveProperty('s3ReferenceResponse')
    expect(faceMatchResponse.body).toHaveProperty('bytesResponse')
    expect(faceMatchResponse.body).toHaveProperty('mixResponse')
  })
})
