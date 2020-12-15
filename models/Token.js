const { Schema, model } = require('mongoose')

const schema = new Schema({
  tokenId: String,
  userId: String 
})

module.exports = model('Token', schema)