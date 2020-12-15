const { Router } = require('express')
const bCrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Token = require('../models/Token')
const router = require('express').Router()
const uuid = require('uuid').v4
const { secret, tokens } = require('../routes/jwt').jwt

//get '/' page
router.get('/', async (req, res) => {
    res.render('index', {
      title: 'Authorization',
      isIndex: true
    })
})

//get '/create' page
router.get('/create', (req, res) => {
  res.render('create', {
    title: 'Create user'
  })
})

//get '/refresh' page
router.get('/refresh', async (req, res) => {
  res.render('refresh')
})

//get '/access' page
router.get('/access', async (req, res) => {
  res.render('access')
})

//create user
router.post('/create', async (req, res) => {
  const user = new User({
    name: req.body.name,
    password: req.body.password
  })
  await user.save()
  res.redirect('/')
})

//name and password validation, acces and refresh tokens generation
router.post('/', async (req, res) => {
  const {name, password} = req.body;
    await User.findOne({name})
        .exec() 
        .then((user) => {
            if(!user) {
                res.status(401).json({ message: 'User does not exist!'})
            }
            const isValid = bCrypt.compare(password, user.password)
            if(isValid) {
              updateTokens(user._id).then(tokens => res.json(tokens))
            } else {
                res.status(401).json({message: 'Invalid credentials! '})
            }
        })
        .catch(err => res.status(500).json({message: err.message}))    
})

//access token validation
router.post('/access', async (req, res) => {
  const {accessToken} = req.body
  const authHeader = accessToken
  if(!authHeader) { 
    res.status(401).json({message: 'Token not provided!'})
  }
  const token = authHeader.replace('Bearer ', '')
  try { 
    const payload = jwt.verify(token, secret)
    if(payload.type !== 'access') {
      res.status(401).json({message: 'Invalid token!'})     
    }   
    res.status(200).json({message: 'Good! Token is valid!'})
  } catch(e) {
    if(e instanceof jwt.TokenExpiredError) {
      res.status(401).json({message: 'Token expired! You need to refresh access token.'})
    }
    if(e instanceof jwt.JsonWebTokenError) {
      res.status(401).json({message: 'Invalid token!'})
    }
  }
})

//refresh tokens
router.post('/refresh', async (req, res) => {
  const {refreshToken} = req.body
  let payload
  try {
    payload = jwt.verify(refreshToken, secret)
    if(payload.type !== 'refresh') {
      res.status(400).json({message: 'Invalid token!'})
    }
  } catch(e) {
    if(e instanceof jwt.TokenExpiredError) {
      res.status(400).json({message: 'Token expired! You need authenticate again.'})
    } else if(e instanceof jwt.JsonWebTokenError) {
      res.status.json({message: 'Invalid token!'})
    }
  }
  await Token.findOne({tokenId: payload.id})
    .exec()
    .then((token) => {
      if(token === null) {
        throw new Error('Invalid token')
      }
      updateTokens(token.userId).then(tokens => res.json(tokens))
    })
    .catch(err => res.status(400).json({message: err.message}))
})

//access token generation
const generateAccessToken = (userId) => {
  const payload = {
    userId,
    type: tokens.access.type,
  }
  const options = { expiresIn: tokens.access.expiresIn, algorithm: 'HS512'}
  return jwt.sign(payload, secret, options)
}

//refresh token generation
const generateRefreshToken = () => {
  const payload = {
    id: uuid(),
    type: tokens.refresh.type,
  }
  const options = { expiresIn: tokens.refresh.expiresIn}
  return {
    id: payload.id,
    token: jwt.sign(payload, secret, options)
  }
}

//replace refresh token in db
const replaceDbRefreshToken = (tokenId, userId) => 
  Token.findOneAndRemove({ userId })
    .exec()
    .then(() => Token.create({ tokenId, userId}))

//replace access and refresh tokens
const updateTokens = (userId) => {
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken()
  return replaceDbRefreshToken(refreshToken.id, userId)
    .then(() => ({
      accessToken,
      refreshToken: refreshToken.token,
    }))
}

module.exports = router