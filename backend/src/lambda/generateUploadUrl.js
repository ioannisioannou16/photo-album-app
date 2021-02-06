'use strict'

const middy = require('@middy/core')
const cors = require('@middy/http-cors')
const httpErrorHandler = require('@middy/http-error-handler')
const validator = require("@middy/validator")
const createError = require('http-errors')
const AWS = require("aws-sdk")
const utils = require("../utils")
const { v4: uuid } = require("uuid")
const memoriesDao = require('../dao/memories')
const inputSchema = require("../schema/generateUploadUrl.json")

const s3 = new AWS.S3({ signatureVersion: 'v4' })
const bucketName = process.env.PHOTOS_S3_BUCKET_NAME
const getUrlExpiration = parseInt(process.env.GET_SIGNED_URL_EXPIRATION)
const postUrlExpiration = parseInt(process.env.POST_SIGNED_URL_EXPIRATION)

const handler = middy(async (event) => {
  const memoryId = event.pathParameters.memoryId
  const userId = utils.getUserId(event)
  const imageId = uuid()

  try {
    await memoriesDao.addMemoryImage(userId, memoryId, imageId)
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      throw new createError.BadRequest("Unable to upload image")
    }
    throw err
  }

  const imageKey = `${userId}/${imageId}`
  const [imageUploadData, imageUrl] = await Promise.all([
    s3.createPresignedPost({
      Bucket: bucketName,
      Fields: {
        key: imageKey,
      },
      Expires: postUrlExpiration,
      Conditions: [
        ["starts-with", "$Content-Type", "image/"],
        ["content-length-range", 0, 10485760],
      ]
    }),
    s3.getSignedUrlPromise('getObject', {
      Bucket: bucketName,
      Key: imageKey,
      Expires: getUrlExpiration,
    })
  ])

  return {
    statusCode: 200,
    body: JSON.stringify({
      imageUploadData,
      imageUrl,
      imageId
    })
  }
})

handler
  .use(cors())
  .use(validator({ inputSchema }))
  .use(httpErrorHandler())

module.exports = {
  handler
}
