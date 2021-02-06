'use strict'

const middy = require('@middy/core')
const cors = require('@middy/http-cors')
const httpErrorHandler = require('@middy/http-error-handler')
const validator = require("@middy/validator")
const createError = require('http-errors')
const AWS = require("aws-sdk")
const utils = require('../utils')
const memoriesDao = require('../dao/memories')
const inputSchema = require("../schema/getMemory.json")

const s3 = new AWS.S3({ signatureVersion: 'v4' })
const bucketName = process.env.PHOTOS_S3_BUCKET_NAME
const urlExpiration = parseInt(process.env.GET_SIGNED_URL_EXPIRATION)

const handler = middy(async (event) => {
  const memoryId = event.pathParameters.memoryId
  const userId = utils.getUserId(event)

  const memory = await memoriesDao.getMemory(userId, memoryId)

  if (!memory) {
    throw new createError.NotFound("Memory does not exist")
  }

  const images = await Promise.all((memory.images ? memory.images.values : []).map(async (imageId) => ({
    imageId,
    imageUrl: await s3.getSignedUrlPromise('getObject', {
      Bucket: bucketName,
      Key: `${userId}/${imageId}`,
      Expires: urlExpiration
    })
  })))
  const memoryWithImageUrls = {
    ...memory,
    images
  }

  return {
    statusCode: 200,
    body: JSON.stringify(memoryWithImageUrls),
  }
})

handler
  .use(cors())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler())

module.exports = {
  handler
}
