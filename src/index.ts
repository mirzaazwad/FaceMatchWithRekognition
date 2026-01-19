import app from './app'
require('@dotenvx/dotenvx').config()

export const HttpServer = app.listen(process.env.PORT || 3000, () => {
  console.log('Server is Running on http://localhost:3000')
  console.log('Swagger Docs available at http://localhost:3000/api-docs')
})
